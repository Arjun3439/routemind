import { supabase } from "./supabase.client";
import { embeddingService } from "./embedding.service";
import type { SemanticSearchResult } from "@/types";

export const semanticSearchService = {
  /**
   * Performs a vector similarity search on community reviews based on a natural language query.
   * 
   * @param query The natural language search query (e.g., "spicy food", "clean bathrooms")
   * @param limit Maximum number of results to return (default 10)
   * @param googlePlaceId Optional filter to only search within a specific place
   */
  async searchCommunityInsights(
    query: string,
    limit: number = 10,
    googlePlaceId?: string
  ): Promise<SemanticSearchResult[]> {
    if (!query || !query.trim()) {
      return [];
    }

    try {
      // 1. Convert query to vector embedding using OpenAI
      const queryEmbedding = await embeddingService.generateEmbedding(query);
      const embeddingString = `[${queryEmbedding.join(",")}]`;

      // 2. Resolve place UUID if a Google Place ID was provided
      let placeUuid: string | undefined = undefined;
      if (googlePlaceId) {
        const { data: place } = await supabase
          .from("places")
          .select("id")
          .eq("google_place_id", googlePlaceId)
          .single();

        if (place) {
          placeUuid = place.id;
        } else {
          // If the place doesn't exist in our DB, we can't search its reviews
          return [];
        }
      }

      // 3. Call the match_reviews RPC function on Supabase
      const { data: matches, error: matchError } = await supabase.rpc("match_reviews", {
        query_embedding: embeddingString,
        match_count: limit,
        filter_place_id: placeUuid || null,
        similarity_threshold: 0.3 // Adjust this threshold based on desired strictness
      });

      if (matchError) {
        console.error("Vector search failed:", matchError);
        return [];
      }

      // 4. Log the query for analytics
      await this.logSearchQuery(query, matches?.length || 0, placeUuid);

      // 5. Map the results
      if (!matches || matches.length === 0) {
        return [];
      }

      return matches.map((match: any) => ({
        id: match.id,
        placeId: match.place_id,
        reviewText: match.review_text,
        authorName: match.author_name,
        rating: match.rating,
        similarity: match.similarity
      }));

    } catch (error) {
      console.error("Error in semantic search:", error);
      return [];
    }
  },

  /**
   * Logs a user query to the search_logs table
   */
  async logSearchQuery(query: string, resultsCount: number, placeId?: string): Promise<void> {
    try {
      await supabase.from("search_logs").insert({
        query,
        results_count: resultsCount,
        place_id: placeId || null
      });
    } catch (error) {
      // Non-critical, just log warning
      console.warn("Failed to log search query:", error);
    }
  }
};
