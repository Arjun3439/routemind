import axios from "axios";
import type { AIFilters, PlaceCategory, PlaceAISummary, RouteAISummary, TravelStorySummary } from "@/types";
import { supabase } from "./supabase.client";

const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY!;
const GROQ_MODEL = process.env.EXPO_PUBLIC_GROQ_MODEL || "llama-3.3-70b-versatile";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

/** Shared helper — sends a single user message to Groq and returns the text reply */
async function groqChat(
  prompt: string,
  opts: { temperature?: number; maxTokens?: number; timeout?: number } = {}
): Promise<string> {
  const { temperature = 0.3, maxTokens = 1024, timeout = 30000 } = opts;
  const response = await axios.post(
    GROQ_URL,
    {
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature,
      max_tokens: maxTokens,
    },
    {
      timeout,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
    }
  );
  const text: string | undefined = response.data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("No response from Groq");
  return text;
}

const PROMPT_TEMPLATE = (userPrompt: string) => `
You are a smart travel filter engine for a route discovery app.

A user wants to find places along their driving route matching this request:
"${userPrompt}"

Your job: Extract structured search filters from this natural language prompt.

Return ONLY a valid JSON object with this exact structure:
{
  "categories": ["restaurant" | "cafe" | "attraction" | "hidden_gem" | "viewpoint" | "shopping" | "gas_station" | "hotel" | "other"],
  "minRating": number between 0 and 5,
  "minReviews": number between 0 and 5000,
  "maxDetourKm": number between 1 and 20,
  "maxDetourMinutes": number between 1 and 30,
  "keywords": ["array", "of", "relevant", "search", "keywords"],
  "priceLevel": [0, 1, 2, 3, 4] (or a subset, 0=free 4=expensive),
  "intent": "one-line description of what the user is looking for",
  "explanation": "friendly 1-sentence explanation to show the user"
}

Rules:
- categories: pick 1-3 most relevant from the allowed values
- minRating: 4.0 for "best", 3.5 for general, 0 for hidden gems
- minReviews: 50 for hidden gems, 100 for popular places, 500 for famous spots
- maxDetourKm: 5 for quick stops, 10 for worth-it detours
- keywords: 3-6 specific search terms (e.g. ["biryani", "authentic", "local"])
- priceLevel: omit for no price filter, else provide array
- intent: concise label like "Authentic local biryani restaurants"
- explanation: e.g. "I'll find top-rated biryani spots within a 5km detour!"

Respond ONLY with the JSON, no markdown fences, no explanation.
`;

export const geminiService = {
  async parsePrompt(userPrompt: string): Promise<AIFilters> {
    // Retry up to 3 times with exponential backoff on rate-limit / network errors
    let lastError: any;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (attempt > 0) {
          await new Promise((res) => setTimeout(res, attempt * 2000));
        }
        const rawText = await groqChat(PROMPT_TEMPLATE(userPrompt), {
          temperature: 0.3,
          maxTokens: 1024,
          timeout: 30000,
        });

        const cleaned = rawText
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();

        const parsed = JSON.parse(cleaned);
        return validateAndNormalizeFilters(parsed);
      } catch (error: any) {
        lastError = error;
        const status = error?.response?.status;
        // Only retry on 503 (overloaded) or 429 (rate limit) or network errors
        if (status && status !== 503 && status !== 429) break;
      }
    }

    // All retries failed — use smart keyword-based defaults so app still works
    console.warn("Groq API unavailable, using default filters:", lastError?.message);
    return getDefaultFilters(userPrompt);
  },



  async generatePlaceInsight(placeName: string, category: string, prompt: string): Promise<string> {
    try {
      const insightPrompt = `
You are a friendly travel guide. 
A traveler is looking for "${prompt}" on their route and found this place: "${placeName}" (${category}).
Write ONE short, enthusiastic 1-sentence tip about why this place is worth stopping at.
Be specific and conversational. Max 20 words.
Respond with ONLY the tip, no quotes, no labels.
`;
      return (await groqChat(insightPrompt, { temperature: 0.7, maxTokens: 100, timeout: 15000 })).trim();
    } catch {
      return "";
    }
  },



  // Export standalone V3 AI functions through geminiService object
  generatePlaceAISummary,
  generateRouteAISummary,
  generateTravelStory,
  summarizePlaceReviews,
};

function validateAndNormalizeFilters(raw: any): AIFilters {
  const validCategories: PlaceCategory[] = [
    "restaurant", "cafe", "attraction", "hidden_gem",
    "viewpoint", "shopping", "gas_station", "hotel", "other"
  ];

  return {
    categories: Array.isArray(raw.categories)
      ? raw.categories.filter((c: string) => validCategories.includes(c as PlaceCategory))
      : ["restaurant"],
    minRating: clamp(Number(raw.minRating) || 3.5, 0, 5),
    minReviews: clamp(Number(raw.minReviews) || 50, 0, 10000),
    maxDetourKm: clamp(Number(raw.maxDetourKm) || 5, 1, 25),
    maxDetourMinutes: clamp(Number(raw.maxDetourMinutes) || 10, 1, 60),
    keywords: Array.isArray(raw.keywords) ? raw.keywords.slice(0, 8) : [],
    priceLevel: Array.isArray(raw.priceLevel) ? raw.priceLevel : undefined,
    intent: String(raw.intent || "Places along your route"),
    explanation: String(raw.explanation || "Finding great stops for you!"),
  };
}

function getDefaultFilters(prompt: string): AIFilters {
  const lower = prompt.toLowerCase();
  if (lower.includes("food") || lower.includes("eat") || lower.includes("biryani") || lower.includes("restaurant")) {
    return { categories: ["restaurant"], minRating: 4.0, minReviews: 100, maxDetourKm: 5, maxDetourMinutes: 10, keywords: ["restaurant", "food", "local"], intent: "Restaurants", explanation: "Finding top-rated restaurants along your route!" };
  }
  if (lower.includes("coffee") || lower.includes("cafe")) {
    return { categories: ["cafe"], minRating: 4.0, minReviews: 50, maxDetourKm: 3, maxDetourMinutes: 8, keywords: ["coffee", "cafe", "espresso"], intent: "Cafés", explanation: "Hunting down the best coffee stops!" };
  }
  if (lower.includes("photo") || lower.includes("view") || lower.includes("scenic")) {
    return { categories: ["viewpoint", "attraction"], minRating: 4.2, minReviews: 30, maxDetourKm: 8, maxDetourMinutes: 15, keywords: ["viewpoint", "scenic", "photography"], intent: "Photography spots", explanation: "Finding stunning photo opportunities on your route!" };
  }
  if (lower.includes("hidden") || lower.includes("gem") || lower.includes("local secret")) {
    return { categories: ["hidden_gem", "attraction"], minRating: 3.5, minReviews: 10, maxDetourKm: 5, maxDetourMinutes: 12, keywords: ["hidden", "local", "offbeat"], intent: "Hidden gems", explanation: "Uncovering secret spots most travelers miss!" };
  }
  // generic
  return { categories: ["restaurant", "attraction", "cafe"], minRating: 3.8, minReviews: 50, maxDetourKm: 5, maxDetourMinutes: 10, keywords: [prompt], intent: prompt, explanation: `Finding amazing places matching "${prompt}"!` };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// ============================================================
// V3 — AI Summaries
// ============================================================

export async function generatePlaceAISummary(placeId: string): Promise<PlaceAISummary | null> {
  try {
    // Fetch place details, tips, and posts
    const { data: place } = await supabase.from("places").select("name, category").eq("id", placeId).single();
    if (!place) return null;

    const { data: tips } = await supabase.from("tips").select("content, upvotes").eq("place_id", placeId).order("upvotes", { ascending: false }).limit(10);
    const { data: posts } = await supabase.from("posts").select("title, body").eq("place_id", placeId).limit(5);

    const contextTexts = [
      ...(tips || []).map((t: any) => `Tip: ${t.content}`),
      ...(posts || []).map((p: any) => `Post: ${p.title} - ${p.body}`),
    ].join("\\n");

    const prompt = `
You are a travel assistant. Summarize this place based on community tips and posts.
Place: ${place.name} (${place.category})
Context:
${contextTexts || "No community context available. Provide a generic engaging summary."}

Return ONLY a valid JSON object with exactly these fields (keep strings brief):
{
  "famousFor": "what it is famous for",
  "bestTimeToVisit": "best time to visit",
  "parking": "parking situation",
  "crowdPattern": "when it gets crowded",
  "amenities": "key amenities"
}
`;

    const rawText = await groqChat(prompt, { temperature: 0.3, maxTokens: 500, timeout: 15000 });
    if (!rawText) return null;

    const cleaned = rawText.replace(/\`\`\`json\\n?/g, "").replace(/\`\`\`\\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);

    const summary: PlaceAISummary = {
      famousFor: parsed.famousFor || "Its unique experience",
      bestTimeToVisit: parsed.bestTimeToVisit || "Anytime",
      parking: parsed.parking || "Unknown",
      crowdPattern: parsed.crowdPattern || "Varies",
      amenities: parsed.amenities || "Standard",
      generatedAt: new Date().toISOString(),
    };

    // Cache in Supabase
    await supabase.from("places").update({ ai_summary: summary }).eq("id", placeId);

    return summary;
  } catch (error) {
    console.error("Place AI Summary Error:", error);
    return null;
  }
}

export async function generateRouteAISummary(routeCommunityId: string): Promise<RouteAISummary | null> {
  try {
    const { data: route } = await supabase.from("route_communities").select("origin_label, destination_label").eq("id", routeCommunityId).single();
    if (!route) return null;

    const { data: posts } = await supabase.from("posts").select("title, body, places(name)").eq("route_community_id", routeCommunityId).order("upvote_count", { ascending: false }).limit(15);

    const contextTexts = (posts || []).map((p: any) => `Place: ${p.places?.name || 'Route'} | Content: ${p.title} - ${p.body}`).join("\\n");

    const prompt = `
You are a travel assistant analyzing the route from ${route.origin_label} to ${route.destination_label}.
Based on these community posts, identify 3 to 5 key highlights or tips for travelers.

Context:
${contextTexts || "No specific community context yet. Provide general advice for this route."}

Return ONLY a valid JSON object with exactly this structure:
{
  "highlights": [
    {
      "category": "Food | Road Condition | Scenic | Safety | General",
      "tip": "Short 1-sentence tip",
      "placeName": "Name of specific place, or omit if general"
    }
  ]
}
`;

    const rawText = await groqChat(prompt, { temperature: 0.3, maxTokens: 800, timeout: 15000 });
    if (!rawText) return null;

    const cleaned = rawText.replace(/\`\`\`json\\n?/g, "").replace(/\`\`\`\\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);

    const summary: RouteAISummary = {
      highlights: parsed.highlights || [],
      generatedAt: new Date().toISOString(),
    };

    // Cache in Supabase
    await supabase.from("route_communities").update({ ai_summary: summary }).eq("id", routeCommunityId);

    return summary;
  } catch (error) {
    console.error("Route AI Summary Error:", error);
    return null;
  }
}

export async function generateTravelStory(tripId: string): Promise<TravelStorySummary | null> {
  try {
    const { data: trip } = await supabase.from("trips").select("source, destination").eq("id", tripId).single();
    if (!trip) return null;

    const { data: tripPlaces } = await supabase.from("trip_places").select("places(id, name, category, is_hidden_gem)").eq("trip_id", tripId);
    
    // Fallbacks if tables don't have enough data
    const placesVisitedCount = tripPlaces ? tripPlaces.length : 0;
    const hiddenGemsDiscovered = (tripPlaces || []).filter((tp: any) => tp.places?.is_hidden_gem).length;
    
    const categoriesSet = new Set<string>();
    (tripPlaces || []).forEach((tp: any) => {
      if (tp.places?.category) categoriesSet.add(tp.places.category);
    });

    // Pick a random place as "most loved" if none has specific feedback, or first one
    const placesObj = tripPlaces && tripPlaces.length > 0 ? tripPlaces[0].places : null;
    const mostLoved = Array.isArray(placesObj) ? placesObj[0] : (placesObj as any);

    return {
      distanceKm: 0, // Would need actual route dist, defaulting to 0
      placesVisitedCount,
      hiddenGemsDiscovered,
      categoriesTried: Array.from(categoriesSet),
      mostLovedStopPlaceId: mostLoved?.id,
      mostLovedStopName: mostLoved?.name,
    };
  } catch (error) {
    console.error("Travel Story Summary Error:", error);
    return null;
  }
}

// ============================================================
// Groq Review Summary
// ============================================================

/**
 * A single Google Place review as returned by the Places Details API.
 * Mirrors the interface in google-reviews.service.ts (kept local to avoid
 * cross-service coupling).
 */
export interface GoogleReview {
  author_name: string;
  rating: number;
  text: string;
  relative_time_description?: string;
}

/**
 * Given a placeId and its Google Place reviews, asks Groq to produce a
 * concise 3-5 bullet summary covering:
 *   - what people commonly praise
 *   - common complaints (if any)
 *   - best time to visit (if mentioned)
 *   - any standout practical tips
 *
 * Returns a plain string[] (one sentence per bullet, no markdown).
 * Returns [] on any error or if reviews is empty.
 */
export async function summarizePlaceReviews(
  placeId: string,
  reviews: GoogleReview[]
): Promise<string[]> {
  if (!reviews || reviews.length === 0) return [];

  let attempt = 0;
  while (attempt < 2) {
    try {
      // Build a compact review digest (avoid huge prompts)
      const digest = reviews
        .slice(0, 5)
        .map((r) => `[${r.rating}★] ${r.text?.trim() || ""}`)
        .filter((line) => line.length > 10)
        .join("\n");

      if (!digest) return [];

      const prompt = `You are a travel assistant. Summarize these Google reviews for place ID "${placeId}" in 3 to 5 short, plain-English bullet points.

Reviews:
${digest}

Rules:
- Each bullet must be ONE concise sentence (max 15 words).
- Cover: what people love, any complaints, best time to visit (if mentioned), any standout tips.
- Do NOT use markdown or bullet characters (no asterisks, no dashes) — just output plain sentences, one per line.
- No explanation, no intro, no extra text.`;

      const rawText = await groqChat(prompt, {
        temperature: 0.2,
        maxTokens: 300,
        timeout: 15000,
      });
      if (!rawText) return [];

      // Parse by splitting on newlines and cleaning up any accidental bullet chars
      return rawText
        .split("\n")
        .map((line) => line.replace(/^[\*\-\•\d\.]+\s*/, "").trim())
        .filter((line) => line.length > 5)
        .slice(0, 5);
    } catch (error) {
      attempt++;
      if (attempt >= 2) {
        console.warn("summarizePlaceReviews error:", (error as any)?.message || error);
        return [];
      }
      // Wait 1.5s before retrying a 503/Network Error
      await new Promise((res) => setTimeout(res, 1500));
    }
  }
  return [];
}
