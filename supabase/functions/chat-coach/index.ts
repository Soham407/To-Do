import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();

    // 1. Initialize Supabase Client with the User's Auth Token
    // This ensures we only fetch THEIR goals, respecting Row Level Security (RLS)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // 2. Fetch Existing Agendas (Long-Term Memory)
    const { data: existingAgendas, error: dbError } = await supabase
      .from("agendas")
      .select("title, type, totalTarget, unit, priority");

    if (dbError) {
      console.error("Database Error:", dbError);
      // We don't crash, we just proceed without memory if DB fails
    }

    // 3. Format them for the AI
    const memoryContext =
      existingAgendas && existingAgendas.length > 0
        ? existingAgendas
            .map((a) => `- ${a.title} (${a.type}: ${a.totalTarget || "Daily"})`)
            .join("\n")
        : "The user has no active goals yet.";

    const systemPrompt = `
    You are the "Goal Coach," an expert at behavioral psychology and goal decomposition.

    ### YOUR OBJECTIVE
    Your job is to help the user turn vague ambitions into concrete, manageable habits and tasks. 
    You must interview the user to uncover their "Why" (motivation) and then decompose their ambition into 1-3 specific Agendas.

    ### CURRENT USER CONTEXT (LONG-TERM MEMORY)
    The user ALREADY has the following active goals. Do NOT create duplicates. If their new request overlaps, ask if they want to modify the existing one instead:
    ${memoryContext}

    ### CONVERSATION RULES
    1. **Start**: Ask what their major goal or project is.
    2. **Deep Dive**: Ask about their "Motivation" or "End Goal" (the stakes). Why is this important *now*?
    3. **Analytical Coaching**: Be encouraging but rigorous. Ask for specific metrics:
       - "How many pages total?"
       - "How many days a week?"
       - "What does success look like for a single session?"
    4. **The Proposal**: Once you understand the scope, propose a plan with specifically named agendas.
    5. **Finalization**: Only when the user says "Yes" or "Let's go" to the plan, set "is_ready" to true and populate the "agendas" array.

    ### TECHNICAL CONSTRAINTS
    - You must ALWAYS respond with a JSON object. No other text.
    - JSON Structure:
    {
      "message": "Your conversational response here (incorporate psychological encouragement).",
      "is_ready": boolean, // true only when goal is finalized
      "agendas": [
        {
          "title": "Clear action-oriented title",
          "type": "NUMERIC" | "BOOLEAN",
          "priority": "HIGH" | "MEDIUM" | "LOW",
          "totalTarget": number, // For NUMERIC: the long-term goal. For BOOLEAN: 0.
          "targetVal": number, // Daily/session target. 1 for BOOLEAN.
          "unit": "string", // e.g., "pages", "kms", "sessions"
          "isRecurring": boolean,
          "bufferTokens": 3,
          "reminderTime": string, // Optional: ISO string if user specifices a time
          "startDate": "${new Date().toISOString().split("T")[0]}"
        }
      ]
    }

    ### EXAMPLE BEHAVIOR
    User: "I want to finish my thesis."
    Coach (JSON): { 
      "message": "Finishing a thesis is a marathon! What's your deep 'Why' for getting this done? Knowing that helps us stay on track when things get hard.", 
      "is_ready": false, 
      "agendas": [] 
    }
    
    User: "I want to prove to myself I can do it. It's 100 pages."
    Coach (JSON): { 
      "message": "That's a powerful motivation. To finish 100 pages, I suggest two agendas: 'Research/Drafting' (daily habit) and 'Weekly Review'. How does that sound?", 
      "is_ready": false, 
      "agendas": [] 
    }
    
    User: "Yes, that works. I'll do 3 pages a day."
    Coach (JSON): { 
      "message": "Perfect! I've set up your 'Thesis' goal. Let's make it happen!", 
      "is_ready": true, 
      "agendas": [
        { "title": "Thesis Drafting", "type": "NUMERIC", "totalTarget": 100, "targetVal": 3, "unit": "pages", "priority": "HIGH", "isRecurring": true, "bufferTokens": 3 }
      ]
    }
    `;

    // Map OpenAI-style messages to Gemini format
    const geminiContents = messages
      .filter((m: any) => m.role !== "system") // System prompt handled separately
      .map((m: any) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }

    console.log("Calling Gemini API...");
    // Keeping your working model version
    const modelName = "gemini-2.5-flash";
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: geminiContents,
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API Error Response:", errorText);
      throw new Error(`Gemini API Error: ${errorText}`);
    }

    const data = await response.json();

    // Handle potential safety blocks or empty candidates
    const candidate = data.candidates?.[0];
    if (!candidate || !candidate.content) {
      if (data.promptFeedback?.blockReason) {
        throw new Error(
          `Blocked by Gemini Safety: ${data.promptFeedback.blockReason}`
        );
      }
      throw new Error(
        "No response generated by Gemini (Safety or Filter issue)"
      );
    }

    const textResult = candidate.content.parts?.[0]?.text;
    if (!textResult) {
      throw new Error("Empty text in Gemini response");
    }

    const result = JSON.parse(textResult);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Critical Error in chat-coach:", error.message);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: "Check Supabase project logs for full trace",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
