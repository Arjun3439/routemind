import axios from "axios";
import { supabase } from "./supabase.client";
import type { Place, SemanticSearchResult } from "@/types";

const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY!;
const GROQ_MODEL = process.env.EXPO_PUBLIC_GROQ_MODEL || "llama-3.3-70b-versatile";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

async function groqChat(
  prompt: string,
  opts: { temperature?: number; maxTokens?: number; timeout?: number } = {}
): Promise<string> {
  const { temperature = 0.3, maxTokens = 512, timeout = 15000 } = opts;
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

export const communityRagService = {
  /**
   * Generates a concise AI summary of a place based on community reviews and an optional query.
   * Caches the result in the places table to save tokens and time.
   */
  async generateCommunitySummary(
    place: Place,
    reviews: SemanticSearchResult[],
    query?: string
  ): Promise<string[]> {
    if (!reviews || reviews.length === 0) {
      return [];
    }

    try {
      // 1. Build the context from the reviews
      const reviewContext = reviews
        .map((r, i) => `Review ${i + 1} [Rating: ${r.rating}★]: "${r.reviewText}"`)
        .join("\n\n");

      const queryContext = query 
        ? `\nUser is specifically asking: "${query}"\nEnsure the summary addresses this query if the reviews contain relevant information.` 
        : "";

      // 2. Construct the RAG prompt
      const prompt = `You are RouteMind's travel intelligence engine.

Place: ${place.name} (${place.category || "Place"})
${queryContext}

Community Reviews:
${reviewContext}

Based ONLY on the provided Community Reviews, generate a concise summary.
Rules:
- Generate 3 to 5 bullet points.
- Focus on key recommendations (e.g., food to try), best visiting times, parking tips, or waiting warnings.
- Keep each bullet point to a single, concise sentence (max 15 words).
- Do NOT hallucinate. Only use information explicitly mentioned in the reviews.
- Do NOT use markdown characters (no asterisks, no dashes) at the start of lines — just output plain sentences, one per line.

Return ONLY the bullet point sentences separated by newlines. No intro, no outro, no markdown formatting.`;

      // 3. Call Groq
      const rawText = await groqChat(prompt, {
        temperature: 0.2,
        maxTokens: 300,
        timeout: 15000,
      });

      if (!rawText) {
        throw new Error("No response from Groq RAG");
      }

      // 4. Parse the response into an array of clean strings
      const bullets = rawText
        .split("\n")
        .map((line) => line.replace(/^[\*\-\•\d\.]+\s*/, "").trim())
        .filter((line) => line.length > 5)
        .slice(0, 5);

      // 5. Cache the result if there was no specific query (general summaries can be reused)
      if (!query && bullets.length > 0) {
        this.cacheSummary(place.googlePlaceId, bullets);
      }

      return bullets;
    } catch (error) {
      console.error("Failed to generate community summary via RAG:", error);
      
      // Fallback: Return raw snippets from the top 3 reviews
      return reviews
        .slice(0, 3)
        .map(r => `[${r.rating}★] ${r.reviewText.substring(0, 80).trim()}...`);
    }
  },

  /**
   * Caches a generated summary in the places table
   */
  async cacheSummary(googlePlaceId: string, summary: string[]): Promise<void> {
    try {
      const cacheObject = {
        summary,
        generatedAt: new Date().toISOString()
      };

      await supabase
        .from("places")
        .update({ community_insights_cached: cacheObject })
        .eq("google_place_id", googlePlaceId);
    } catch (error) {
      console.warn("Failed to cache community summary:", error);
    }
  },

  /**
   * Retrieves a cached summary if it exists and is less than 7 days old
   */
  async getCachedSummary(googlePlaceId: string): Promise<string[] | null> {
    try {
      const { data: place } = await supabase
        .from("places")
        .select("community_insights_cached")
        .eq("google_place_id", googlePlaceId)
        .single();

      if (!place || !place.community_insights_cached) {
        return null;
      }

      const cache = place.community_insights_cached as any;
      if (!cache.summary || !Array.isArray(cache.summary)) {
        return null;
      }

      // Check if cache is stale (older than 7 days)
      if (cache.generatedAt) {
        const generatedAt = new Date(cache.generatedAt).getTime();
        const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
        
        if (Date.now() - generatedAt > SEVEN_DAYS_MS) {
          return null; // Stale cache
        }
      }

      return cache.summary;
    } catch (error) {
      return null;
    }
  }
};
