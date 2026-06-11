import axios from "axios";
import type { AIFilters, PlaceCategory, PlaceAISummary, RouteAISummary, TravelStorySummary } from "@/types";
import { supabase } from "./supabase.client";

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY!;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

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
    try {
      const response = await axios.post(
        GEMINI_URL,
        {
          contents: [
            {
              parts: [{ text: PROMPT_TEMPLATE(userPrompt) }],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          ],
        },
        {
          timeout: 30000,
          headers: { "Content-Type": "application/json" },
        }
      );

      const candidate = response.data?.candidates?.[0];
      if (candidate?.finishReason === "MAX_TOKENS") {
        throw new Error("Gemini response was truncated (MAX_TOKENS)");
      }

      const rawText = candidate?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error("No response from Gemini");

      // Clean up and parse JSON
      const cleaned = rawText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      const parsed = JSON.parse(cleaned);
      return validateAndNormalizeFilters(parsed);
    } catch (error: any) {
      console.error("Gemini API error:", error?.message || error);

      // Return sensible defaults if Gemini fails
      return getDefaultFilters(userPrompt);
    }
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

      const response = await axios.post(
        GEMINI_URL,
        {
          contents: [{ parts: [{ text: insightPrompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 100 },
        },
        { timeout: 15000 }
      );

      return response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    } catch {
      return "";
    }
  },
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

    const response = await axios.post(
      GEMINI_URL,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 500 },
      },
      { timeout: 15000, headers: { "Content-Type": "application/json" } }
    );

    const rawText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
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

    const response = await axios.post(
      GEMINI_URL,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 800 },
      },
      { timeout: 15000, headers: { "Content-Type": "application/json" } }
    );

    const rawText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
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
    const mostLoved = tripPlaces && tripPlaces.length > 0 ? tripPlaces[0].places : null;

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
