// ============================================================
// RouteMind — Places Service
// ============================================================
// Fetches Google Place reviews and manages the Supabase-backed
// review_summary cache (7-day TTL).
// ============================================================

import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { summarizePlaceReviews, GoogleReview } from "./gemini.service";

const PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY!;
const PLACES_BASE = "https://maps.googleapis.com/maps/api/place";

// Cache TTL: 7 days in milliseconds
const REVIEW_SUMMARY_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// ─── Fetch reviews from Google Places Details API ─────────────

/**
 * Fetches up to 5 Google Place reviews for a given placeId.
 * Uses `fields=reviews` only — minimal, cheap API call.
 * Returns [] on any failure.
 */
export async function fetchPlaceReviews(
  googlePlaceId: string
): Promise<GoogleReview[]> {
  let attempt = 0;
  while (attempt < 2) {
    try {
      const response = await axios.get(`${PLACES_BASE}/details/json`, {
        params: {
          place_id: googlePlaceId,
          fields: "reviews",
          key: PLACES_API_KEY,
          reviews_sort: "most_relevant",
        },
        timeout: 15000, // Increased to 15s
      });

      if (response.data?.status !== "OK") return [];

      const reviews: GoogleReview[] = response.data?.result?.reviews || [];
      return reviews;
    } catch (error) {
      attempt++;
      if (attempt >= 2) {
        console.warn("fetchPlaceReviews error:", (error as any)?.message);
        return [];
      }
      // Wait 1 second before retrying
      await new Promise((res) => setTimeout(res, 1000));
    }
  }
  return [];
}

// ─── Cache-aware summary fetcher ──────────────────────────────

/**
 * Returns a cached Gemini review summary for the given placeId if one exists
 * and is less than 7 days old. Otherwise fetches fresh reviews, calls
 * summarizePlaceReviews, persists the result to Supabase, and returns it.
 *
 * Always returns string[] — empty array means "nothing to show" (UI hides the
 * section silently).
 *
 * @param googlePlaceId  The Google Place ID (used as the Supabase row lookup key)
 */
// Simple sequential queue to prevent 429/503 from Gemini
// Max 1 concurrent Gemini request at a time — they queue up behind each other
let activeRequests = 0;
const MAX_CONCURRENT_REQUESTS = 1;
const requestQueue: (() => void)[] = [];

async function enqueueRequest() {
  if (activeRequests < MAX_CONCURRENT_REQUESTS) {
    activeRequests++;
    return;
  }
  await new Promise<void>((resolve) => {
    requestQueue.push(resolve);
  });
  // Small stagger between queued requests to avoid bursts
  await new Promise((res) => setTimeout(res, 500));
}

function dequeueRequest() {
  activeRequests--;
  if (requestQueue.length > 0) {
    const next = requestQueue.shift();
    activeRequests++;
    if (next) next();
  }
}

export async function getOrGenerateReviewSummary(
  googlePlaceId: string
): Promise<string[]> {
  if (!googlePlaceId) return [];

  try {
    // 1. Check AsyncStorage cache
    const cacheKey = `@review_summary_${googlePlaceId}`;
    const cachedData = await AsyncStorage.getItem(cacheKey);

    if (cachedData) {
      try {
        const parsedCache = JSON.parse(cachedData);
        const updatedAt = parsedCache.updatedAt ? new Date(parsedCache.updatedAt).getTime() : 0;
        const isStale = Date.now() - updatedAt > REVIEW_SUMMARY_TTL_MS;

        if (!isStale && Array.isArray(parsedCache.bullets)) {
          return parsedCache.bullets;
        }
      } catch (e) {
        // Cache corrupted, ignore and refetch
      }
    }

    // Wait in queue to avoid 429 rate limits from Gemini
    await enqueueRequest();

    let bullets: string[] = [];
    try {
      // 2. Cache miss or stale — fetch reviews + call Gemini
      const reviews = await fetchPlaceReviews(googlePlaceId);
      if (reviews.length > 0) {
        bullets = await summarizePlaceReviews(googlePlaceId, reviews);
      }
    } finally {
      dequeueRequest(); // ensure we always unblock the next in queue
    }

    if (bullets.length === 0) return [];

    // 3. Persist to AsyncStorage
    try {
      await AsyncStorage.setItem(
        cacheKey,
        JSON.stringify({
          bullets,
          updatedAt: new Date().toISOString(),
        })
      );
    } catch (e) {
      console.warn("Failed to cache review_summary locally:", e);
    }

    return bullets;
  } catch (error) {
    console.warn("getOrGenerateReviewSummary error:", (error as any)?.message || error);
    return [];
  }
}
