import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { title, genre, year, description, type } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt = "";
    let userPrompt = "";

    if (type === "classify") {
      systemPrompt = `You are a movie classification AI. Given a movie title, classify it into one of these categories: Romance, Comedy, Drama, Horror, Sci-Fi, Action, Thriller, Animation, Documentary, Musical, Fantasy, Mystery. Also generate a fun one-line tagline for the movie ticket. Return ONLY valid JSON.`;
      userPrompt = `Classify this movie and generate a ticket tagline:
Title: ${title}
Genre hint: ${genre || "unknown"}
Year: ${year || "unknown"}
Description: ${description || "none"}

Return JSON: {"category": "...", "tagline": "...", "color_theme": "one of: crimson, gold, royal, emerald, violet, coral, midnight, blush", "emoji": "one fitting emoji"}`;
    } else {
      systemPrompt = `You are a creative movie ticket designer AI. Generate fun, adorable ticket details for a cinema ticket. Be creative and cute! Return ONLY valid JSON.`;
      userPrompt = `Generate cute ticket details for:
Title: ${title}
Genre: ${genre || "Movie"}
Year: ${year || ""}
Description: ${description || ""}

Return JSON with:
{
  "tagline": "a witty one-liner for the ticket",
  "fun_fact": "a fun fact about the movie or genre",
  "mood": "one of: dreamy, thrilling, hilarious, heartwarming, mysterious, epic, cozy",
  "color_theme": "one of: crimson, gold, royal, emerald, violet, coral, midnight, blush",
  "emoji": "one fitting emoji",
  "category": "Romance/Comedy/Drama/Horror/Sci-Fi/Action/Thriller/Animation/Documentary/Musical/Fantasy/Mystery",
  "suggested_snack": "a fun snack suggestion for watching this movie"
}`;
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
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse AI response");
    }
    
    const result = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-ticket error:", e);
    return new Response(JSON.stringify({ 
      error: e instanceof Error ? e.message : "Unknown error",
      // Fallback data so tickets still work
      tagline: "Enjoy the show!",
      category: "Movie",
      color_theme: "gold",
      emoji: "🎬",
      mood: "cozy",
      fun_fact: "Movies bring people together!",
      suggested_snack: "Popcorn 🍿"
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
