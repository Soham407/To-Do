import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Allowed origins for CORS - add production domain when deploying
const allowedOrigins = [
  "http://localhost:8081",
  "http://localhost:19006",
  "exp://localhost:8081",
  "exp://192.168.", // Local network Expo dev (prefix match)
  "https://goalcoach.app", // Add your production domain
];

const getCorsHeaders = (origin: string | null) => {
  // Check if origin is allowed (exact match or prefix for local network)
  const isAllowed =
    origin &&
    allowedOrigins.some(
      (allowed) => origin === allowed || origin.startsWith(allowed)
    );

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
};

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { messages, availableLists } = await req.json();

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

    // 2. Fetch Existing Agendas
    const { data: existingAgendas, error: dbError } = await supabase
      .from("agendas")
      .select("title, type, total_target, unit, priority");

    if (dbError) console.error("Database Error:", dbError);

    const memoryContext =
      existingAgendas && existingAgendas.length > 0
        ? existingAgendas
            .map(
              (a: any) =>
                `- ${a.title} (${a.type}: ${a.total_target || "Daily"})`
            )
            .join("\n")
        : "The user has no active goals yet.";

    // Process Lists for Prompt
    const listContext =
      availableLists &&
      Array.isArray(availableLists) &&
      availableLists.length > 0
        ? availableLists
            .map((l: any) => `- "${l.name}" (ID: ${l.id})`)
            .join("\n")
        : "No custom lists available.";

    // Get today's date for the AI to use dynamically
    const today = new Date();
    const todayISO = today.toISOString().substring(0, 10); // YYYY-MM-DD

    const systemPrompt = `
    You are the "Goal Coach," an expert at productivity.

    ### TODAY'S DATE
    Today is ${todayISO}. Use this as the reference point for all date calculations.

    ### YOUR OBJECTIVE
    Turn user inputs into concrete Agendas (Goals/Habits).
    
    ### THE "CATEGORIES" OF TASKS
    You must intelligently categorize user requests into one of these structures:

    1. **The "Duration Habit"** (Boolean + End Date)
       - Input: "Go to gym for 30 days."
       - Output: Type=BOOLEAN, startDate=${todayISO}, endDate=(startDate + 30 days).

    2. **The "Time-Bound Habit"** (Boolean + Reminder)
       - Input: "Meditate at 8pm."
       - Output: Type=BOOLEAN, reminderTime="20:00".

    3. **The "Target Goal"** (Numeric + Calculated End Date)
       - Input: "Read 1000 pages, 20 per day."
       - Output: Type=NUMERIC, totalTarget=1000, targetVal=20, endDate=(startDate + ceil(1000/20) days).

    4. **The "Maintenance Goal"** (Numeric + Open Ended)
       - Input: "Read 20 pages daily." (No total target).
       - Output: Type=NUMERIC, targetVal=20, totalTarget=0 (or null), endDate=null.

    ### CRITICAL RULES
    1. **Math & Dates**: 
       - **startDate MUST ALWAYS be today (${todayISO}) unless user specifies a different start date.**
       - Calculate 'endDate' if a duration ("for 2 weeks") or a total target ("1000 pages") is implied.
       - Formula: endDate = startDate + Duration.
       - Use specific dates (YYYY-MM-DD).
       - If no duration/total is specified, leave endDate as null (indefinite).

    2. **Time Extraction**:
       - If the user mentions a time (e.g., "at 6am", "at 20:00"), extract it into 'reminderTime' as "HH:mm" (24-hour format).

    3. **The "Why" Rule**: 
       - If the goal is clear (e.g., "Gym 30 days"), SKIP motivation questions. Just build it.
       - Only ask "Why" if the input is vague ("I want to get fit").

    4. **Lists / Categorization**:
       - Available Lists:
${listContext}
       - If the goal matches a list contextually, include its "listId".
       - Example: "Run 5km" -> Health list ID.
       - If no match, set "listId" to null.

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
          "startDate": "YYYY-MM-DD", // MUST be today (${todayISO}) unless user specifies otherwise
          "endDate": "YYYY-MM-DD", // REQUIRED if duration specified. Calculate: startDate + durationDays
          "durationDays": number, // REQUIRED if user specifies duration (e.g., "30 days" = 30)
          "reminderTime": "HH:mm", // Optional: "20:00" if user said "8pm"
          "listId": "string", // ID of the matched list from context, or null
          "bufferTokens": 3
        }
      ]
    }

    ### CRITICAL DATE CALCULATION EXAMPLES
    - User: "Gym for 30 days" → startDate="${todayISO}", durationDays=30, endDate="${new Date(
      Date.parse(todayISO) + 29 * 24 * 60 * 60 * 1000
    )
      .toISOString()
      .substring(0, 10)}" (add 29 days to start)
    - User: "Read 1000 pages, 20/day" → durationDays=ceil(1000/20)=50, endDate=startDate+49 days
    - User: "Meditate daily" (no end) → durationDays=null, endDate=null

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

    const modelName = "gemini-1.5-flash"; // Switched to 1.5 Flash for speed/reliability
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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
