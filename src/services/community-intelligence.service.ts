import { supabase } from "./supabase.client";
import { communityPlacesService } from "./community-places.service";
import { semanticSearchService } from "./semantic-search.service";
import { communityRagService } from "./community-rag.service";
import type { Place, CommunityInsight, SemanticSearchResult } from "@/types";

export const communityIntelligenceService = {
  /**
   * Main entry point to get AI-powered insights for a specific place.
   * Orchestrates the entire pipeline: 
   * 1. Ensures reviews are synced
   * 2. Performs semantic search (if query provided)
   * 3. Generates AI summary via RAG
   * 
   * @param googlePlaceId The Google Place ID
   * @param query Optional user query to focus the insights
   */
  async getPlaceInsights(googlePlaceId: string, query?: string): Promise<CommunityInsight | null> {
    if (!googlePlaceId) return null;

    try {
      // 1. Fetch the place from our DB
      const { data: placeData, error: placeError } = await supabase
        .from("places")
        .select("*")
        .eq("google_place_id", googlePlaceId)
        .single();

      if (placeError || !placeData) {
        console.warn(`Cannot get insights: Place ${googlePlaceId} not in database.`);
        return null;
      }

      const place: Place = {
        id: placeData.id,
        googlePlaceId: placeData.google_place_id,
        name: placeData.name,
        address: placeData.address,
        lat: placeData.lat,
        lng: placeData.lng,
        category: placeData.category,
        rating: placeData.rating,
        totalRatings: placeData.total_ratings,
        worthStopScore: placeData.worth_stop_score || 0,
        detourMinutes: placeData.detour_minutes || 0,
        detourKm: placeData.detour_km || 0,
        communityScore: placeData.community_score || 0,
        tipCount: placeData.tip_count || 0,
        tags: placeData.tags || []
      };

      // 2. Ensure reviews are synced and embedded
      await communityPlacesService.syncPlaceReviews(googlePlaceId);

      // 3. Get reviews (either via semantic search if query exists, or just top reviews)
      let reviews: SemanticSearchResult[] = [];
      let summary: string[] = [];

      if (query && query.trim()) {
        // Contextual path: User asked a specific question
        reviews = await semanticSearchService.searchCommunityInsights(query, 5, googlePlaceId);
        
        if (reviews.length > 0) {
          // Force generation of a new summary specific to this query
          summary = await communityRagService.generateCommunitySummary(place, reviews, query);
        }
      } else {
        // General path: No specific query, just get an overview
        // First, check if we have a cached general summary
        const cachedSummary = await communityRagService.getCachedSummary(googlePlaceId);
        
        if (cachedSummary && cachedSummary.length > 0) {
          summary = cachedSummary;
        }

        // Fetch top recent reviews for context
        const { data: topReviews } = await supabase
          .from("community_reviews")
          .select("id, place_id, review_text, author_name, rating")
          .eq("place_id", place.id)
          .order("rating", { ascending: false })
          .limit(5);

        if (topReviews && topReviews.length > 0) {
          reviews = topReviews.map((r: any) => ({
            id: r.id,
            placeId: r.place_id,
            reviewText: r.review_text,
            authorName: r.author_name,
            rating: r.rating,
            similarity: 1.0 // Exact matches
          }));
        }

        // If no cached summary but we have reviews, generate one
        if ((!summary || summary.length === 0) && reviews.length > 0) {
          summary = await communityRagService.generateCommunitySummary(place, reviews);
        }
      }

      // Convert SemanticSearchResult to CommunityReview for the UI
      const communityReviews = reviews.map(r => ({
        id: r.id,
        placeId: r.placeId,
        googleReviewId: r.id, // simplified for UI
        authorName: r.authorName,
        rating: r.rating,
        reviewText: r.reviewText,
        source: 'google',
        similarity: r.similarity,
        createdAt: new Date().toISOString() // simplified for UI
      }));

      return {
        place,
        summary,
        reviews: communityReviews,
        query,
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error("Error in getPlaceInsights:", error);
      return null;
    }
  }
};
