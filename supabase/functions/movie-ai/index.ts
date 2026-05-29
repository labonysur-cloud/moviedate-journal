import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, title, mood, movies, movieTitle, url, booked, journaled, exclude } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt = "";
    let userPrompt = "";
    let tools: any[] | undefined;
    let toolChoice: any | undefined;

    if (action === "autofill_from_url") {
      systemPrompt = `You are a movie/TV show identification expert. Given a URL (from streaming sites, IMDb, Wikipedia, YouTube, etc.), identify the movie or TV show and return its details. For YouTube URLs, the video might be a full movie, trailer, or clip — identify the actual movie/show it relates to. Analyze the URL structure, domain, and any identifiable slugs/IDs to determine the content. Be accurate. IMPORTANT: Always return the original URL as the embed_url field.`;
      userPrompt = `Identify the movie or TV show from this URL: "${url}"
${title ? `Additional hint - the user also typed: "${title}"` : ""}

Figure out what movie/show this links to and return its details. Use the original URL "${url}" as the embed_url.`;
      tools = [{
        type: "function",
        function: {
          name: "return_movie_details",
          description: "Return identified movie/show details from the URL",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string", description: "Official title of the movie/show" },
              genre: { type: "string", description: "Primary genre / secondary genre" },
              year: { type: "string", description: "Release year" },
              description: { type: "string", description: "2-3 sentence plot summary" },
              rating: { type: "string", description: "IMDb-style rating out of 10" },
              poster: { type: "string", description: "A real poster image URL if known, or empty string" },
              total_seasons: { type: ["number", "null"], description: "null for movies, number for TV shows" },
              embed_url: { type: "string", description: "The original URL provided, cleaned up if needed" },
            },
            required: ["title", "genre", "year", "description", "rating"],
            additionalProperties: false,
          },
        },
      }];
      toolChoice = { type: "function", function: { name: "return_movie_details" } };
    } else if (action === "autofill") {
      systemPrompt = `You are a movie database expert. Given a movie or TV show title, return accurate details. If you're unsure, make educated guesses. When possible, also suggest a real, publicly available free YouTube watch URL for the full movie or official trailer.`;
      userPrompt = `Look up this movie/show: "${title}"`;
      tools = [{
        type: "function",
        function: {
          name: "return_movie_details",
          description: "Return movie/show details",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string", description: "Official title" },
              genre: { type: "string", description: "Primary genre / secondary genre" },
              year: { type: "string", description: "Release year" },
              description: { type: "string", description: "2-3 sentence plot summary" },
              rating: { type: "string", description: "IMDb-style rating out of 10" },
              poster: { type: "string", description: "A real poster image URL if known, or empty string" },
              total_seasons: { type: ["number", "null"], description: "null for movies, number for TV shows" },
              embed_url: { type: "string", description: "Best known free public YouTube URL for the full movie if it exists on YouTube, otherwise the official trailer URL on YouTube. Empty string if unknown. Must be a real youtube.com or youtu.be link you are confident exists." },
            },
            required: ["title", "genre", "year", "description", "rating"],
            additionalProperties: false,
          },
        },
      }];
      toolChoice = { type: "function", function: { name: "return_movie_details" } };
    } else if (action === "recommend") {
      systemPrompt = `You are a cozy, perceptive movie-night recommendation AI. You personalize suggestions based on the user's taste signals: movies in their collection, movies they actually booked tickets for (a stronger like signal), and journal entries about movies they reflected on (strongest signal — pay attention to their mood and what they wrote). Infer their favorite genres, tones, eras, and themes. Never recommend something already in their collection or excluded. Be warm, specific, and explain WHY each pick fits THEM. Return ONLY valid JSON.`;
      const collection = (movies || []).map((m: any) => `${m.title} (${m.genre}, ${m.year})`).join(", ");
      const bookedList = (booked || []).map((b: any) => `${b.movie_title}${b.genre ? ` (${b.genre})` : ""}`).join(", ");
      const journalList = (journaled || [])
        .map((j: any) => `${j.movie_title}${j.mood ? ` — mood: ${j.mood}` : ""}${j.content ? ` — note: "${String(j.content).slice(0, 160)}"` : ""}`)
        .join(" | ");
      const excludeList = (exclude || []).join(", ");
      userPrompt = `Mood request: ${mood || "surprise me with something I'd love"}

=== Their collection (already added) ===
${collection || "nothing yet"}

=== Movies they booked tickets for (liked enough to plan a night) ===
${bookedList || "none yet"}

=== Journal entries (deepest taste signal) ===
${journalList || "none yet"}

=== Do NOT suggest any of these (already in collection or excluded) ===
${excludeList || collection || "—"}

Suggest exactly 5 movies/shows tailored to THIS person. Mix 1-2 safe-bet matches with 2-3 thoughtful discoveries adjacent to their taste. For each item:
{
  "recommendations": [
    {
      "title": "movie title",
      "genre": "genre",
      "year": "year",
      "description": "Why YOU (referring to them) would love this, based on a specific signal from their history (1-2 warm sentences).",
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

    const body: any = {
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    };
    if (tools) {
      body.tools = tools;
      body.tool_choice = toolChoice;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
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
    
    // Handle tool call responses
    const message = data.choices?.[0]?.message;
    if (message?.tool_calls?.[0]?.function?.arguments) {
      const result = JSON.parse(message.tool_calls[0].function.arguments);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback to content parsing
    const content = message?.content || "";
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
