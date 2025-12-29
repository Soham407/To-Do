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

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid or empty messages array" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 1. Initialize Supabase Client with the User's Auth Token
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // --- RATE LIMITING ---
    // Check if user has exceeded daily limit (e.g., 20 requests per day)
    const { count, error: countError } = await supabase
      .from("ai_usage_logs")
      .select("*", { count: "exact", head: true })
      .gte(
        "created_at",
        new Date(new Date().setHours(0, 0, 0, 0)).toISOString()
      );

    if (!countError && count !== null && count >= 20) {
      return new Response(
        JSON.stringify({
          error: "Daily AI limit reached. Please try again tomorrow.",
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Log this request (ignore error if table doesn't exist yet)
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      await supabase
        .from("ai_usage_logs")
        .insert({ user_id: userData.user.id });
    }
    // --- END RATE LIMITING ---

    // 2. Fetch Existing Agendas (Long-Term Memory)
    const { data: existingAgendas, error: dbError } = await supabase
      .from("agendas")
      .select("title, type, total_target, unit, priority");

    if (dbError) {
      console.error("Database Error:", dbError);
      // We don't crash, we just proceed without memory if DB fails
    }

    // 3. Format them for the AI
    const memoryContext =
      existingAgendas && existingAgendas.length > 0
        ? existingAgendas
            .map(
              (a) => `- ${a.title} (${a.type}: ${a.total_target || "Daily"})`
            )
            .join("\n")
        : "The user has no active goals yet.";

    const systemPrompt = `
    You are the "Goal Coach," an expert at productivity.

    ### YOUR OBJECTIVE
    Turn user inputs into concrete Agendas.

    ### CONVERSATION RULES (BE EFFICIENT)
    1. **Context Check**: Look at the "LONG-TERM MEMORY". Do not duplicate goals.

    2. **The "Why" Rule**: 
       - If the goal is SIMPLE (e.g., "Read a book", "Walk 5k"), **SKIP** the deep motivation questions. Just ask for the numbers (Total target & Daily pace).
       - ONLY ask "Why/Motivation" if the goal is VAGUE (e.g., "Change my life", "Get fit").

    3. **Math & Dates (CRITICAL)**: 
       - You MUST calculate the duration AND endDate. 
       - Formula: Duration = Total Target / Daily Target. 
       - Example: If Total=1000 and Daily=20, Duration=50 days.
       - Calculate endDate: startDate + Duration days (use JavaScript Date math).
       - Format dates as YYYY-MM-DD.
       - ALWAYS include endDate in your JSON response when totalTarget and targetVal are provided.
       - Example calculation: startDate="2024-01-01", Duration=50 → endDate="2024-02-20"

    4. **Titling**:
       - Use specific, short titles. 
       - BAD: "Read 300 pages book"
       - GOOD: "Reading: [Book Name]" or just "Reading Habit"

    ### TECHNICAL CONSTRAINTS (JSON)
    - Respond with JSON when ready.
    - JSON Structure:
    {
      "message": "Brief confirmation.",
      "is_ready": boolean,
      "agendas": [
        {
          "title": "String",
          "type": "NUMERIC" | "BOOLEAN",
          "priority": "HIGH" | "MEDIUM" | "LOW",
          "totalTarget": number, 
          "targetVal": number, // Daily amount
          "unit": "string",
          "isRecurring": true,
          "startDate": "YYYY-MM-DD", // Today's date (use current date)
          "endDate": "YYYY-MM-DD",   // REQUIRED: Calculate startDate + (totalTarget / targetVal) days
          "bufferTokens": 3
        }
      ]
    }
    
    ### EXAMPLE RESPONSE:
    User says: "I want to read 1000 pages, 20 pages daily"
    You respond:
    {
      "message": "Perfect! I've set up your reading goal.",
      "is_ready": true,
      "agendas": [{
        "title": "Reading Habit",
        "type": "NUMERIC",
        "priority": "MEDIUM",
        "totalTarget": 1000,
        "targetVal": 20,
        "unit": "pages",
        "isRecurring": true,
        "startDate": "2024-12-27",
        "endDate": "2025-02-15",
        "bufferTokens": 3
      }]
    }
    Note: endDate is 50 days after startDate (1000 / 20 = 50 days)

    ### CURRENT USER CONTEXT (LONG-TERM MEMORY)
    ${memoryContext}
    `;

    // Map OpenAI-style messages to Gemini format
    const geminiContents = messages
      .filter((m: any) => m.role !== "system")
      .map((m: any) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: (m.content || "").substring(0, 2000).trim() }],
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
