// ============================================================
// RouteMind V3 — Place Trust Score Service
// ============================================================
// Computes multi-dimensional trust scores for places.
// Does NOT modify any existing service.
// ============================================================

import { supabase } from "./supabase.client";
import type { PlaceTrustScore } from "@/types";

// ─── Configurable Weights ─────────────────────────────────────

/** Weights for final_score computation */
const TRUST_WEIGHTS = {
  ai: 0.30,          // From Google rating/review data
  community: 0.35,   // From tips + post votes
  freshness: 0.20,   // Recency of activity
  trust: 0.15,       // Blend of community + freshness
} as const;

/** How many hours before freshness starts decaying significantly */
const FRESHNESS_HALF_LIFE_HOURS = 72; // 3 days

// ─── Score Computation ────────────────────────────────────────

/**
 * Compute AI score from Google rating and review count.
 * Based on the same normalization as the existing Worth Stop Score.
 */
function computeAIScore(rating: number, totalRatings: number): number {
  const ratingComponent = (rating / 5) * 100;
  const reviewComponent = Math.min(
    100,
    (Math.log10(totalRatings + 1) / Math.log10(1001)) * 100
  );
  // Weighted blend: 60% rating, 40% reviews
  return Math.round(ratingComponent * 0.6 + reviewComponent * 0.4);
}

/**
 * Compute community score from tips and post engagement.
 */
function computeCommunityScore(
  tipUpvotes: number,
  tipCount: number,
  postNetVotes: number,
  postCount: number
): number {
  // Tip component: average upvotes per tip, normalized
  const tipAvg = tipCount > 0 ? tipUpvotes / tipCount : 0;
  const tipComponent = Math.min(100, tipAvg * 10); // 10 avg upvotes = 100

  // Post component: average net votes per post, normalized
  const postAvg = postCount > 0 ? postNetVotes / postCount : 0;
  const postComponent = Math.min(100, postAvg * 5); // 20 avg net votes = 100

  // Blend: 50/50 tips and posts
  if (tipCount === 0 && postCount === 0) return 0;
  if (tipCount === 0) return Math.round(postComponent);
  if (postCount === 0) return Math.round(tipComponent);
  return Math.round(tipComponent * 0.5 + postComponent * 0.5);
}

/**
 * Compute freshness score based on most recent activity.
 */
function computeFreshnessScore(
  latestLiveReportAt: string | null,
  latestPostAt: string | null,
  latestTipAt: string | null
): number {
  const dates = [latestLiveReportAt, latestPostAt, latestTipAt]
    .filter(Boolean)
    .map((d) => new Date(d!).getTime());

  if (dates.length === 0) return 0;

  const mostRecent = Math.max(...dates);
  const ageHours = (Date.now() - mostRecent) / (1000 * 60 * 60);
  const decay = Math.pow(0.5, ageHours / FRESHNESS_HALF_LIFE_HOURS);
  return Math.round(decay * 100);
}

/**
 * Compute the blended trust score from community + freshness.
 */
function computeTrustBlend(communityScore: number, freshnessScore: number): number {
  return Math.round(communityScore * 0.6 + freshnessScore * 0.4);
}

/**
 * Compute the final composite score.
 */
function computeFinalScore(
  aiScore: number,
  communityScore: number,
  freshnessScore: number,
  trustScore: number
): number {
  const final =
    TRUST_WEIGHTS.ai * aiScore +
    TRUST_WEIGHTS.community * communityScore +
    TRUST_WEIGHTS.freshness * freshnessScore +
    TRUST_WEIGHTS.trust * trustScore;
  return Math.min(100, Math.round(final));
}

// ─── Public API ───────────────────────────────────────────────

/**
 * Compute and persist trust scores for a specific place.
 */
export async function computePlaceTrustScores(
  placeId: string
): Promise<PlaceTrustScore> {
  // 1. Fetch place data (rating, reviews)
  const { data: place } = await supabase
    .from("places")
    .select("rating, total_ratings, tip_count")
    .eq("id", placeId)
    .single();

  if (!place) throw new Error(`Place not found: ${placeId}`);

  // 2. Fetch tip upvotes sum
  const { data: tips } = await supabase
    .from("tips")
    .select("upvotes")
    .eq("place_id", placeId);

  const tipUpvotes = (tips || []).reduce((sum: number, t: any) => sum + (t.upvotes || 0), 0);

  // 3. Fetch post engagement for this place
  const { data: posts } = await supabase
    .from("posts")
    .select("upvote_count, downvote_count, created_at")
    .eq("place_id", placeId)
    .eq("is_deleted", false);

  const postNetVotes = (posts || []).reduce(
    (sum: number, p: any) => sum + (p.upvote_count || 0) - (p.downvote_count || 0),
    0
  );
  const latestPostAt = posts && posts.length > 0
    ? posts.sort((a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0].created_at
    : null;

  // 4. Fetch latest live report
  const { data: liveReports } = await supabase
    .from("live_reports")
    .select("created_at")
    .eq("place_id", placeId)
    .order("created_at", { ascending: false })
    .limit(1);

  const latestLiveReportAt = liveReports?.[0]?.created_at || null;

  // 5. Fetch latest tip
  const { data: latestTips } = await supabase
    .from("tips")
    .select("created_at")
    .eq("place_id", placeId)
    .order("created_at", { ascending: false })
    .limit(1);

  const latestTipAt = latestTips?.[0]?.created_at || null;

  // 6. Compute scores
  const aiScore = computeAIScore(place.rating || 0, place.total_ratings || 0);
  const communityScore = computeCommunityScore(
    tipUpvotes,
    place.tip_count || 0,
    postNetVotes,
    (posts || []).length
  );
  const freshnessScore = computeFreshnessScore(
    latestLiveReportAt,
    latestPostAt,
    latestTipAt
  );
  const trustScore = computeTrustBlend(communityScore, freshnessScore);
  const finalScore = computeFinalScore(aiScore, communityScore, freshnessScore, trustScore);

  // 7. Persist
  const result: PlaceTrustScore = {
    placeId,
    aiScore,
    communityScore,
    freshnessScore,
    trustScore,
    finalScore,
    computedAt: new Date().toISOString(),
  };

  await supabase
    .from("place_trust_scores")
    .upsert({
      place_id: placeId,
      ai_score: aiScore,
      community_score: communityScore,
      freshness_score: freshnessScore,
      trust_score: trustScore,
      final_score: finalScore,
      computed_at: result.computedAt,
    }, { onConflict: "place_id" });

  return result;
}

/**
 * Batch recompute trust scores for multiple places.
 * Useful for scheduled jobs.
 */
export async function batchComputeTrustScores(
  placeIds: string[]
): Promise<PlaceTrustScore[]> {
  const results: PlaceTrustScore[] = [];
  for (const placeId of placeIds) {
    try {
      const score = await computePlaceTrustScores(placeId);
      results.push(score);
    } catch (e) {
      console.warn(`Failed to compute trust score for place ${placeId}:`, e);
    }
  }
  return results;
}

/**
 * Get cached trust scores for a place.
 */
export async function getPlaceTrustScores(
  placeId: string
): Promise<PlaceTrustScore | null> {
  const { data, error } = await supabase
    .from("place_trust_scores")
    .select("*")
    .eq("place_id", placeId)
    .single();

  if (error || !data) return null;

  return {
    placeId: data.place_id,
    aiScore: data.ai_score,
    communityScore: data.community_score,
    freshnessScore: data.freshness_score,
    trustScore: data.trust_score,
    finalScore: data.final_score,
    computedAt: data.computed_at,
  };
}
