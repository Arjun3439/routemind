// ============================================================
// RouteMind — Google Reviews Service
// ============================================================
// Dynamically finds food spots near the user's location using
// Google Places Nearby Search, then fetches their reviews via
// the Place Details API.
// ============================================================

import axios from "axios";
import type { Post } from "@/types";

const PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY!;
const PLACES_BASE = "https://maps.googleapis.com/maps/api/place";

// ─── In-Memory Cache ──────────────────────────────────────────
let cachedReviewPosts: Post[] | null = null;
let cacheTimestamp = 0;
let cachedLocationKey = "";
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes

// ─── Types ────────────────────────────────────────────────────
interface GoogleReview {
  author_name: string;
  author_url?: string;
  profile_photo_url?: string;
  rating: number;
  relative_time_description: string;
  text: string;
  time: number; // Unix timestamp
}

interface NearbyPlace {
  place_id: string;
  name: string;
  vicinity: string;
  rating?: number;
  user_ratings_total?: number;
  types: string[];
  photos?: Array<{ photo_reference: string }>;
}

interface PlaceDetailsResult {
  place_id: string;
  name: string;
  formatted_address: string;
  rating?: number;
  reviews?: GoogleReview[];
  photos?: Array<{ photo_reference: string }>;
}

// ─── Step 1: Find nearby food spots ───────────────────────────
async function findNearbyFoodSpots(
  lat: number,
  lng: number
): Promise<NearbyPlace[]> {
  const allPlaces = new Map<string, NearbyPlace>();

  // Search for multiple food-related types
  const foodTypes = ["restaurant", "cafe", "bakery"];

  for (const type of foodTypes) {
    try {
      const response = await axios.get(`${PLACES_BASE}/nearbysearch/json`, {
        params: {
          location: `${lat},${lng}`,
          radius: 5000, // 5km radius
          type,
          key: PLACES_API_KEY,
          rankby: undefined, // use radius-based
        },
        timeout: 10000,
      });

      if (response.data?.status === "OK" && response.data.results) {
        for (const place of response.data.results) {
          // Only include places with decent ratings and enough reviews
          if (
            (place.rating || 0) >= 3.5 &&
            (place.user_ratings_total || 0) >= 10 &&
            !allPlaces.has(place.place_id)
          ) {
            allPlaces.set(place.place_id, place);
          }
        }
      }
    } catch (error) {
      console.warn(`Nearby search failed for type ${type}:`, error);
    }

    // Small delay between requests
    await delay(200);
  }

  // Sort by rating * reviews (popularity) and take top 10
  return Array.from(allPlaces.values())
    .sort(
      (a, b) =>
        (b.rating || 0) * Math.log10((b.user_ratings_total || 1) + 1) -
        (a.rating || 0) * Math.log10((a.user_ratings_total || 1) + 1)
    )
    .slice(0, 10);
}

// ─── Step 2: Fetch Place Details + Reviews ────────────────────
async function fetchPlaceDetails(
  placeId: string
): Promise<PlaceDetailsResult | null> {
  try {
    const response = await axios.get(`${PLACES_BASE}/details/json`, {
      params: {
        place_id: placeId,
        fields: "place_id,name,formatted_address,rating,reviews,photos",
        key: PLACES_API_KEY,
        reviews_sort: "newest",
      },
      timeout: 10000,
    });

    if (response.data?.status !== "OK") {
      console.warn(
        `Place Details failed for ${placeId}:`,
        response.data?.status
      );
      return null;
    }

    return response.data.result as PlaceDetailsResult;
  } catch (error) {
    console.warn(`Failed to fetch details for ${placeId}:`, error);
    return null;
  }
}

// ─── Step 3: Map a Google Review → App Post ───────────────────
function mapReviewToPost(
  review: GoogleReview,
  place: PlaceDetailsResult,
  index: number
): Post {
  const id = `google-review-${place.place_id}-${index}-${review.time}`;
  const createdAt = new Date(review.time * 1000).toISOString();

  return {
    id,
    authorId: "google-reviews",
    type: "google_review",
    title: place.name,
    body: review.text || "No review text provided.",
    mediaUrls: [],
    upvoteCount: 0,
    downvoteCount: 0,
    commentCount: 0,
    isDeleted: false,
    createdAt,
    updatedAt: createdAt,
    authorName: review.author_name || "Google Reviewer",
    authorAvatar: review.profile_photo_url,
    placeName: `${place.name} — ${place.formatted_address}`,
    rating: review.rating,
  };
}

// ─── Public API ───────────────────────────────────────────────

/**
 * Fetches Google reviews for food spots near the given location.
 *
 * Flow:
 * 1. Nearby Search → find top-rated restaurants, cafes, bakeries within 5km
 * 2. Place Details → fetch reviews for each found place
 * 3. Map reviews → Post objects for the community feed
 *
 * Results are cached for 10 minutes per location.
 */
export async function fetchGoogleReviewPosts(
  latitude?: number,
  longitude?: number
): Promise<Post[]> {
  // Default to a central location if none provided (Chennai)
  const lat = latitude ?? 13.0827;
  const lng = longitude ?? 80.2707;
  const locationKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;

  // Return cache if still fresh and same location
  if (
    cachedReviewPosts &&
    cachedLocationKey === locationKey &&
    Date.now() - cacheTimestamp < CACHE_DURATION_MS
  ) {
    return cachedReviewPosts;
  }

  const allPosts: Post[] = [];

  try {
    // Step 1: Find nearby food spots
    const nearbyPlaces = await findNearbyFoodSpots(lat, lng);

    if (nearbyPlaces.length === 0) {
      console.warn("No nearby food spots found");
      return [];
    }

    // Step 2: Fetch details + reviews in batches of 3
    const batchSize = 3;
    for (let i = 0; i < nearbyPlaces.length; i += batchSize) {
      const batch = nearbyPlaces.slice(i, i + batchSize);

      const results = await Promise.allSettled(
        batch.map((place) => fetchPlaceDetails(place.place_id))
      );

      results.forEach((result) => {
        if (result.status === "fulfilled" && result.value) {
          const place = result.value;
          if (place.reviews && place.reviews.length > 0) {
            place.reviews.forEach((review, reviewIndex) => {
              // Only include reviews with actual meaningful text
              if (review.text && review.text.trim().length > 15) {
                allPosts.push(mapReviewToPost(review, place, reviewIndex));
              }
            });
          }
        }
      });

      // Delay between batches
      if (i + batchSize < nearbyPlaces.length) {
        await delay(300);
      }
    }
  } catch (error) {
    console.error("Failed to fetch Google review posts:", error);
  }

  // Sort by most recent first
  allPosts.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Cache results
  cachedReviewPosts = allPosts;
  cacheTimestamp = Date.now();
  cachedLocationKey = locationKey;

  return allPosts;
}

/**
 * Clear the cached review posts (e.g., on pull-to-refresh).
 */
export function clearGoogleReviewCache(): void {
  cachedReviewPosts = null;
  cacheTimestamp = 0;
  cachedLocationKey = "";
}

// ─── Utils ────────────────────────────────────────────────────
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
