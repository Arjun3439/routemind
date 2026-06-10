import type { Place, GooglePlace, AIFilters, WorthStopScoreBreakdown } from "@/types";
import { SCORE_WEIGHTS, SCORE_THRESHOLDS } from "@/constants";
import {
  decodePolyline,
  findPlacesAlongRoute,
  calculateDetour,
  haversineDistance,
  buildPhotoUrl,
} from "./maps.service";
import { tipService } from "./supabase.service";

// ============================================================
// Worth Stop Score Engine
// ============================================================

/**
 * Calculate the Worth Stop Score for a place.
 *
 * Formula:
 *   40% Rating score (normalized 0-5 to 0-100)
 *   20% Review score (log-normalized, capped at reference max)
 *   20% Distance score (inversely proportional to detour)
 *   20% Community score (from tips + upvotes)
 */
export function calculateWorthStopScore(
  rating: number,
  totalRatings: number,
  detourKm: number,
  communityScore: number,
  maxDetourKm: number
): WorthStopScoreBreakdown {
  // Rating score: 0-5 → 0-100
  const ratingScore = Math.round((rating / 5) * 100);

  // Review score: logarithmic, reference 1000 reviews = 100 points
  const reviewScore = Math.round(Math.min(100, (Math.log10(totalRatings + 1) / Math.log10(1001)) * 100));

  // Distance score: closer = higher score, beyond maxDetour = 0
  const distanceScore =
    detourKm >= maxDetourKm
      ? 0
      : Math.round((1 - detourKm / maxDetourKm) * 100);

  // Community score: already 0-100 from Supabase
  const cappedCommunity = Math.min(100, communityScore);

  const total = Math.round(
    ratingScore * SCORE_WEIGHTS.rating +
    reviewScore * SCORE_WEIGHTS.reviews +
    distanceScore * SCORE_WEIGHTS.distance +
    cappedCommunity * SCORE_WEIGHTS.community
  );

  return {
    ratingScore,
    reviewScore,
    distanceScore,
    communityScore: cappedCommunity,
    total: Math.min(100, total),
  };
}

export function getScoreLabel(score: number): string {
  if (score >= SCORE_THRESHOLDS.excellent) return "Must Stop";
  if (score >= SCORE_THRESHOLDS.good) return "Worth It";
  if (score >= SCORE_THRESHOLDS.fair) return "Consider";
  return "Optional";
}

export function getScoreColor(score: number): string {
  if (score >= SCORE_THRESHOLDS.excellent) return "#10B981"; // emerald
  if (score >= SCORE_THRESHOLDS.good) return "#F59E0B"; // amber
  if (score >= SCORE_THRESHOLDS.fair) return "#3B82F6"; // blue
  return "#64748B"; // slate
}

// ============================================================
// Route Discovery Engine
// ============================================================

export async function discoverPlacesAlongRoute(
  encodedPolyline: string,
  filters: AIFilters
): Promise<Place[]> {
  // 1. Decode polyline
  const routePoints = decodePolyline(encodedPolyline);
  if (routePoints.length === 0) return [];

  // 2. Find Google Places along the corridor
  const googlePlaces = await findPlacesAlongRoute(routePoints, filters);

  // 3. Process each place into our Place type with scores
  const placesWithScores: Place[] = [];

  for (const gp of googlePlaces) {
    try {
      const placeLatLng = {
        latitude: gp.geometry.location.lat,
        longitude: gp.geometry.location.lng,
      };

      // Calculate detour
      const { detourKm, detourMinutes } = await calculateDetour(placeLatLng, routePoints);

      // Skip if exceeds filter limits
      if (detourKm > filters.maxDetourKm) continue;

      // Get community score (default 0 for new places)
      const communityScore = 0;

      // Calculate Worth Stop Score
      const scoreBreakdown = calculateWorthStopScore(
        gp.rating || 0,
        gp.user_ratings_total || 0,
        detourKm,
        communityScore,
        filters.maxDetourKm
      );

      // Map to our Place type
      const place: Place = {
        id: gp.place_id, // Use google_place_id as temp ID
        googlePlaceId: gp.place_id,
        name: gp.name,
        address: gp.formatted_address || "",
        lat: gp.geometry.location.lat,
        lng: gp.geometry.location.lng,
        category: mapGoogleTypeToCategory(gp.types),
        rating: gp.rating || 0,
        totalRatings: gp.user_ratings_total || 0,
        priceLevel: gp.price_level,
        photoReference: gp.photos?.[0]?.photo_reference,
        photoUrl: gp.photos?.[0]?.photo_reference
          ? buildPhotoUrl(gp.photos[0].photo_reference)
          : undefined,
        openNow: gp.opening_hours?.open_now,
        worthStopScore: scoreBreakdown.total,
        detourMinutes,
        detourKm,
        communityScore,
        tipCount: 0,
        tags: gp.types?.slice(0, 4) || [],
      };

      placesWithScores.push(place);
    } catch (e) {
      console.warn("Error processing place:", gp.name, e);
    }
  }

  // 4. Sort by Worth Stop Score descending
  return placesWithScores.sort((a, b) => b.worthStopScore - a.worthStopScore);
}

// ============================================================
// Helpers
// ============================================================

function mapGoogleTypeToCategory(types: string[]): Place["category"] {
  if (!types?.length) return "other";
  if (types.includes("restaurant")) return "restaurant";
  if (types.includes("cafe") || types.includes("coffee_shop")) return "cafe";
  if (types.includes("tourist_attraction")) return "attraction";
  if (types.includes("natural_feature") || types.includes("park")) return "viewpoint";
  if (types.includes("shopping_mall") || types.includes("store")) return "shopping";
  if (types.includes("gas_station")) return "gas_station";
  if (types.includes("lodging")) return "hotel";
  if (types.includes("point_of_interest")) return "hidden_gem";
  return "other";
}
