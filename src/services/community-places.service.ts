import { supabase } from "./supabase.client";
import { fetchPlaceReviews } from "./places.service";
import { embeddingService } from "./embedding.service";
import type { ReviewSyncResult } from "@/types";

export const communityPlacesService = {
  /**
   * Orchestrates fetching reviews from Google, storing them in Supabase,
   * and generating embeddings for semantic search.
   */
  async syncPlaceReviews(googlePlaceId: string): Promise<ReviewSyncResult> {
    const result: ReviewSyncResult = {
      placeId: googlePlaceId,
      reviewsAdded: 0,
      reviewsSkipped: 0,
      embeddingsGenerated: 0,
    };

    if (!googlePlaceId) return result;

    try {
      // 1. Ensure the place exists in our places table
      const { data: place, error: placeError } = await supabase
        .from("places")
        .select("id, reviews_synced_at")
        .eq("google_place_id", googlePlaceId)
        .single();

      if (placeError || !place) {
        console.warn(`Place ${googlePlaceId} not found in database. Must be discovered first.`);
        return result;
      }

      const placeId = place.id;

      // 2. Check if we synced recently (e.g., within 7 days) to avoid unnecessary API calls
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
      if (place.reviews_synced_at) {
        const syncedTime = new Date(place.reviews_synced_at).getTime();
        if (Date.now() - syncedTime < SEVEN_DAYS_MS) {
          // Already up to date
          return result;
        }
      }

      // 3. Fetch reviews from Google
      const googleReviews = await fetchPlaceReviews(googlePlaceId);
      
      if (!googleReviews || googleReviews.length === 0) {
        // Update sync time anyway so we don't keep trying
        await supabase
          .from("places")
          .update({ reviews_synced_at: new Date().toISOString() })
          .eq("id", placeId);
        return result;
      }

      // 4. Process and insert reviews
      for (const review of googleReviews) {
        // Skip empty or very short reviews
        if (!review.text || review.text.trim().length < 15) {
          result.reviewsSkipped++;
          continue;
        }

        // Create a deterministic unique ID for deduplication
        // Format: {place_id}-{author_name}-{timestamp or random if missing}
        const safeAuthor = review.author_name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
        const reviewKey = `${placeId}-${safeAuthor}-${review.relative_time_description || "now"}`;
        
        // Upsert the review
        const { data: insertedReview, error: insertError } = await supabase
          .from("community_reviews")
          .upsert({
            place_id: placeId,
            google_review_id: reviewKey,
            author_name: review.author_name,
            rating: review.rating,
            review_text: review.text,
            source: "google",
          }, { 
            onConflict: 'google_review_id',
            ignoreDuplicates: false // We might want to update rating/text if changed
          })
          .select("id, embedding")
          .single();

        if (insertError) {
          console.warn(`Failed to insert review for ${googlePlaceId}:`, insertError.message);
          result.reviewsSkipped++;
        } else if (insertedReview) {
          result.reviewsAdded++;
          
          // Generate embedding if it's new or missing
          if (!insertedReview.embedding) {
            await embeddingService.embedReview(insertedReview.id);
            result.embeddingsGenerated++;
          }
        }
      }

      // 5. Update the last synced timestamp
      await supabase
        .from("places")
        .update({ reviews_synced_at: new Date().toISOString() })
        .eq("id", placeId);

    } catch (error) {
      console.error(`Error syncing reviews for place ${googlePlaceId}:`, error);
    }

    return result;
  },

  /**
   * Quick check for how many community reviews exist for a place
   */
  async getPlaceReviewCount(googlePlaceId: string): Promise<number> {
    const { data: place } = await supabase
      .from("places")
      .select("id")
      .eq("google_place_id", googlePlaceId)
      .single();

    if (!place) return 0;

    const { count, error } = await supabase
      .from("community_reviews")
      .select("*", { count: "exact", head: true })
      .eq("place_id", place.id);

    if (error) {
      console.warn("Error getting review count:", error);
      return 0;
    }

    return count || 0;
  },

  /**
   * Syncs multiple places sequentially to avoid rate limits
   */
  async syncMultiplePlaces(googlePlaceIds: string[]): Promise<ReviewSyncResult[]> {
    const results: ReviewSyncResult[] = [];
    
    for (const placeId of googlePlaceIds) {
      const result = await this.syncPlaceReviews(placeId);
      results.push(result);
      
      // Small stagger to prevent Google API rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return results;
  }
};
