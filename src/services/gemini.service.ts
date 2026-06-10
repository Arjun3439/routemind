import axios from "axios";
import type { AIFilters, PlaceCategory } from "@/types";

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
