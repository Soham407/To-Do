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

    // 1. Initialize Supabase Client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // --- RATE LIMITING (20 req/day) ---
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

    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      await supabase
        .from("ai_usage_logs")
        .insert({ user_id: userData.user.id });
    }
    // --- END RATE LIMITING ---

    // 2. Fetch Existing Agendas
    const { data: existingAgendas, error: dbError } = await supabase
      .from("agendas")
      .select("title, type, total_target, unit, priority");

    if (dbError) console.error("Database Error:", dbError);

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
    Turn user inputs into concrete Agendas (Goals/Habits).
    
    ### THE "CATEGORIES" OF TASKS
    You must intelligently categorize user requests into one of these structures:

    1. **The "Duration Habit"** (Boolean + End Date)
       - Input: "Go to gym for 30 days."
       - Output: Type=BOOLEAN, startDate=Today, endDate=Today + 30 days.

    2. **The "Time-Bound Habit"** (Boolean + Reminder)
       - Input: "Meditate at 8pm."
       - Output: Type=BOOLEAN, reminderTime="20:00".

    3. **The "Target Goal"** (Numeric + Calculated End Date)
       - Input: "Read 1000 pages, 20 per day."
       - Output: Type=NUMERIC, totalTarget=1000, targetVal=20, endDate=Calculated.

    4. **The "Maintenance Goal"** (Numeric + Open Ended)
       - Input: "Read 20 pages daily." (No total target).
       - Output: Type=NUMERIC, targetVal=20, totalTarget=0 (or null), endDate=null.

    ### CRITICAL RULES
    1. **Math & Dates**: 
       - Always calculate 'endDate' if a duration ("for 2 weeks") or a total target ("1000 pages") is implied.
       - Formula: endDate = startDate + Duration.
       - Use specific dates (YYYY-MM-DD).
       - If no duration/total is specified, leave endDate as null (indefinite).

    2. **Time Extraction**:
       - If the user mentions a time (e.g., "at 6am", "at 20:00"), extract it into 'reminderTime' as "HH:mm" (24-hour format).

    3. **The "Why" Rule**: 
       - If the goal is clear (e.g., "Gym 30 days"), SKIP motivation questions. Just build it.
       - Only ask "Why" if the input is vague ("I want to get fit").

    ### JSON OUTPUT STRUCTURE
    Respond ONLY with JSON.
    {
      "message": "Confirmation text.",
      "is_ready": boolean,
      "agendas": [
        {
          "title": "String",
          "type": "NUMERIC" | "BOOLEAN",
          "priority": "HIGH" | "MEDIUM" | "LOW",
          "totalTarget": number | null, 
          "targetVal": number, // Daily amount (use 1 for boolean)
          "unit": "string",    // e.g. "pages", "session"
          "isRecurring": true,
          "startDate": "YYYY-MM-DD",
          "endDate": "YYYY-MM-DD", // Optional: Only if duration/total exists
          "reminderTime": "HH:mm", // Optional: "20:00" if user said "8pm"
          "bufferTokens": 3
        }
      ]
    }

    ### EXAMPLE SCENARIO
    User: "I want to go to the gym for 30 days at 8pm, and also read 20 pages daily."
    Response:
    {
      "message": "I've set up your 30-day gym challenge and your daily reading habit.",
      "is_ready": true,
      "agendas": [
        {
          "title": "Gym Session",
          "type": "BOOLEAN",
          "priority": "HIGH",
          "targetVal": 1,
          "unit": "check-in",
          "isRecurring": true,
          "startDate": "2024-01-01",
          "endDate": "2024-01-31", // 30 days later
          "reminderTime": "20:00", // 8pm
          "bufferTokens": 3
        },
        {
          "title": "Daily Reading",
          "type": "NUMERIC",
          "priority": "MEDIUM",
          "totalTarget": null, // Open-ended
          "targetVal": 20,
          "unit": "pages",
          "isRecurring": true,
          "startDate": "2024-01-01",
          "endDate": null, // Indefinite
          "bufferTokens": 3
        }
      ]
    }

    ### CURRENT USER CONTEXT
    ${memoryContext}
    `;

    // Map Messages to Gemini
    const geminiContents = messages
      .filter((m: any) => m.role !== "system")
      .map((m: any) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: (m.content || "").substring(0, 2000).trim() }],
      }));

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

    const modelName = "gemini-2.5-flash";
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: geminiContents,
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { responseMimeType: "application/json" },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API Error: ${errorText}`);
    }

    const data = await response.json();
    const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResult) throw new Error("Empty response from AI");

    return new Response(textResult, {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Critical Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});