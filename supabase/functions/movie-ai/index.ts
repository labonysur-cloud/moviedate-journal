import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, title, mood, movies, movieTitle } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt = "";
    let userPrompt = "";

    if (action === "autofill") {
      systemPrompt = `You are a movie database expert. Given a movie or TV show title, return accurate details. If you're unsure, make educated guesses. Return ONLY valid JSON.`;
      userPrompt = `Look up this movie/show: "${title}"

Return JSON:
{
  "title": "official title",
  "genre": "primary genre / secondary genre (e.g. Comedy / Drama)",
  "year": "release year",
  "description": "2-3 sentence plot summary",
  "rating": "IMDb-style rating out of 10 (e.g. 8.5)",
  "poster": "a real poster image URL if known, or empty string",
  "total_seasons": null for movies or number for TV shows
}`;
    } else if (action === "recommend") {
      systemPrompt = `You are a cozy movie night recommendation AI. Suggest movies based on mood and what friends have already watched. Be warm and enthusiastic! Return ONLY valid JSON.`;
      const watchedList = (movies || []).map((m: any) => `${m.title} (${m.genre})`).join(", ");
      userPrompt = `Mood: ${mood || "anything fun"}
Already watched: ${watchedList || "nothing yet"}

Suggest 5 movies/shows. For each, include:
{
  "recommendations": [
    {
      "title": "movie title",
      "genre": "genre",
      "year": "year",
      "description": "why they'd love it (1-2 sentences, warm tone)",
      "rating": "rating out of 10",
      "emoji": "fitting emoji"
    }
  ]
}`;
    } else if (action === "journal_prompt") {
      systemPrompt = `You are a thoughtful, warm journaling assistant for movie lovers. Generate creative prompts to help people reflect on movies they watched. Be cozy and encouraging! Return ONLY valid JSON.`;
      userPrompt = `Movie just watched: "${movieTitle}"

Generate 3 journal prompts to help them write about it:
{
  "prompts": [
    "prompt text here...",
    "prompt text here...",
    "prompt text here..."
  ],
  "starter": "A warm opening sentence they can use to start their entry"
}`;
    } else {
      throw new Error("Unknown action: " + action);
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Could not parse AI response");
    
    const result = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("movie-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
