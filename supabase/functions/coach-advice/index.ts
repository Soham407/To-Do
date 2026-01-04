import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Allowed origins for CORS
const allowedOrigins = [
  "http://localhost:8081",
  "http://localhost:19006",
  "exp://localhost:8081",
  "exp://192.168.", // Local network Expo dev (prefix match)
  "https://goalcoach.app", // Production domain
];

const getCorsHeaders = (origin: string | null) => {
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
    const body = await req.json();
    const { messages, context } = body;

    // Validate messages array
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid or empty messages array" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate message structure
    const isValidMessages = messages.every(
      (m: any) =>
        typeof m === "object" &&
        typeof m.role === "string" &&
        typeof m.content === "string" &&
        m.content.length <= 2000 // Limit message length
    );

    if (!isValidMessages) {
      return new Response(JSON.stringify({ error: "Invalid message format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate context if provided (optional but typed)
    const validContext =
      context && typeof context === "object"
        ? {
            streakInfo: context.streakInfo || null,
            todayStats: context.todayStats || null,
            weekStats: context.weekStats || null,
            recentFailureTags: Array.isArray(context.recentFailureTags)
              ? context.recentFailureTags.slice(0, 10) // Limit array size
              : [],
            goals: Array.isArray(context.goals)
              ? context.goals.slice(0, 5) // Limit number of goals
              : [],
            buffersRemaining:
              typeof context.buffersRemaining === "number"
                ? context.buffersRemaining
                : undefined,
          }
        : null;

    // Initialize Supabase Client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Get today's date
    const today = new Date();
    const todayISO = today.toISOString().substring(0, 10);

    // Build context summary from provided data
    let userContextSummary = "No additional context provided.";

    if (validContext) {
      const parts: string[] = [];

      if (validContext.streakInfo) {
        parts.push(
          `Current streak: ${validContext.streakInfo.current} days, Longest streak: ${validContext.streakInfo.longest} days.`
        );
      }

      if (validContext.todayStats) {
        parts.push(
          `Today: ${validContext.todayStats.completed}/${validContext.todayStats.total} tasks completed.`
        );
      }

      if (validContext.weekStats) {
        parts.push(
          `This week: ${validContext.weekStats.completionRate}% completion rate.`
        );
      }

      if (
        validContext.recentFailureTags &&
        validContext.recentFailureTags.length > 0
      ) {
        parts.push(
          `Recent challenges: ${validContext.recentFailureTags.join(", ")}.`
        );
      }

      if (validContext.goals && validContext.goals.length > 0) {
        const goalSummaries = validContext.goals
          .map((g: any) => `"${g.title}" (${g.progress || "in progress"})`)
          .join(", ");
        parts.push(`Active goals: ${goalSummaries}.`);
      }

      if (validContext.buffersRemaining !== undefined) {
        parts.push(
          `Buffer tokens remaining: ${validContext.buffersRemaining}.`
        );
      }

      if (parts.length > 0) {
        userContextSummary = parts.join(" ");
      }
    }

    const systemPrompt = `
    You are the "Goal Coach," a supportive, warm, and encouraging AI assistant for productivity.

    ### TODAY'S DATE
    Today is ${todayISO}.

    ### YOUR ROLE
    You are NOT creating goals—that's handled separately. Instead, you:
    1. **Provide advice** on staying consistent, overcoming obstacles, and maintaining motivation.
    2. **Celebrate wins** with genuine enthusiasm.
    3. **Offer compassion** when users struggle—never guilt-trip.
    4. **Give actionable tips** based on patterns (e.g., "You often feel tired on Fridays—consider lighter tasks that day").
    5. **Answer questions** about productivity, habits, and goal-setting.

    ### PERSONALITY
    - Warm, friendly, like a supportive friend who also knows productivity science.
    - Use emojis sparingly but meaningfully (🎉 for celebrations, 💪 for encouragement).
    - Keep responses concise (2-4 sentences usually) but can elaborate if asked.
    - Never be preachy or condescending.

    ### USER'S CURRENT CONTEXT
    ${userContextSummary}

    ### RESPONSE FORMAT
    Respond naturally in plain text. No JSON needed for this endpoint.
    If the user asks about their progress, reference the context provided.
    If they share struggles, validate their feelings first, then offer one small actionable step.

    ### EXAMPLES
    - User: "I keep missing my reading goal on weekends"
      → "Weekends can be tricky! 📚 They often feel like a break from routines. One idea: try a smaller weekend target (like 10 pages instead of 20) so it feels doable even when relaxing. Would that help?"

    - User: "I completed 7 days straight!"
      → "That's amazing! 🎉 A full week of consistency—you should be proud! What helped you stay on track this week?"

    - User: "I'm feeling demotivated"
      → "That's totally valid—motivation ebbs and flows for everyone. 💙 What's one tiny thing you could do today that would feel like a win, even if small?"
    `;

    // Map Messages to Gemini format
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

    return new Response(JSON.stringify({ message: textResult }), {
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
