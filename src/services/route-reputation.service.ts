// ============================================================
// RouteMind V3 — Route Reputation Score Service
// ============================================================
// Computes per-category reputation scores for route communities.
// Does NOT modify any existing service.
// ============================================================

import { supabase } from "./supabase.client";
import type { RouteReputationScores } from "@/types";

// ─── Category Keywords ────────────────────────────────────────
// Used to classify posts/tips into reputation categories

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  food: ["food", "restaurant", "biryani", "dosa", "meal", "eat", "lunch", "dinner", "breakfast", "snack", "thali", "idli", "vada"],
  coffee: ["coffee", "cafe", "espresso", "latte", "filter coffee", "tea", "chai", "beverage"],
  roadQuality: ["road", "highway", "pothole", "smooth", "construction", "toll", "bypass", "lane", "asphalt"],
  photography: ["photo", "photography", "scenic", "view", "sunrise", "sunset", "landscape", "camera", "instagram"],
  safety: ["safe", "safety", "dangerous", "accident", "police", "light", "well-lit", "secure", "crime"],
  nightDriving: ["night", "dark", "headlight", "visibility", "street light", "fog", "late night", "midnight"],
  fuelAvailability: ["fuel", "petrol", "diesel", "gas station", "pump", "ev charging", "cng"],
};

// Category weights for overall score
const CATEGORY_WEIGHTS: Record<string, number> = {
  food: 0.20,
  coffee: 0.10,
  roadQuality: 0.20,
  photography: 0.10,
  safety: 0.20,
  nightDriving: 0.10,
  fuelAvailability: 0.10,
};

// ─── Score Computation ────────────────────────────────────────

/**
 * Classify text content into category scores.
 * Returns a map of category → match strength (0–100).
 */
function classifyContent(
  texts: string[],
  sentiments: number[] // net votes per text as sentiment proxy
): Record<string, number> {
  const scores: Record<string, { total: number; count: number }> = {};

  for (const cat of Object.keys(CATEGORY_KEYWORDS)) {
    scores[cat] = { total: 0, count: 0 };
  }

  texts.forEach((text, index) => {
    const lower = text.toLowerCase();
    const sentiment = sentiments[index] || 0;
    // Normalize sentiment to 0–100 (clamped)
    const sentimentScore = Math.min(100, Math.max(0, 50 + sentiment * 5));

    for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      const matches = keywords.filter((kw) => lower.includes(kw)).length;
      if (matches > 0) {
        scores[cat].total += sentimentScore * (matches / keywords.length);
        scores[cat].count += 1;
      }
    }
  });

  // Average scores per category
  const result: Record<string, number> = {};
  for (const [cat, data] of Object.entries(scores)) {
    result[cat] = data.count > 0 ? Math.round(data.total / data.count) : 0;
  }
  return result;
}

/**
 * Compute weighted overall score from category scores.
 */
function computeOverallScore(categoryScores: Record<string, number>): number {
  let total = 0;
  for (const [cat, weight] of Object.entries(CATEGORY_WEIGHTS)) {
    total += (categoryScores[cat] || 0) * weight;
  }
  return Math.round(total);
}

// ─── Public API ───────────────────────────────────────────────

/**
 * Compute and persist route reputation scores for a route community.
 */
export async function computeRouteReputationScores(
  routeCommunityId: string
): Promise<RouteReputationScores> {
  // 1. Fetch posts for this route community
  const { data: posts } = await supabase
    .from("posts")
    .select("title, body, upvote_count, downvote_count")
    .eq("route_community_id", routeCommunityId)
    .eq("is_deleted", false);

  // 2. Fetch live reports for this route community
  const { data: liveReports } = await supabase
    .from("live_reports")
    .select("report_type, upvote_count")
    .eq("route_community_id", routeCommunityId);

  // 3. Combine text content for classification
  const texts: string[] = [];
  const sentiments: number[] = [];

  (posts || []).forEach((p: any) => {
    texts.push(`${p.title} ${p.body}`);
    sentiments.push((p.upvote_count || 0) - (p.downvote_count || 0));
  });

  // Live reports contribute to specific categories
  (liveReports || []).forEach((lr: any) => {
    const typeText = (lr.report_type || "").replace(/_/g, " ");
    texts.push(typeText);
    sentiments.push(lr.upvote_count || 0);
  });

  // 4. Classify and compute scores
  const categoryScores = classifyContent(texts, sentiments);
  const overallScore = computeOverallScore(categoryScores);

  // 5. Build result
  const result: RouteReputationScores = {
    routeCommunityId,
    foodScore: categoryScores.food || 0,
    coffeeScore: categoryScores.coffee || 0,
    roadQualityScore: categoryScores.roadQuality || 0,
    photographyScore: categoryScores.photography || 0,
    safetyScore: categoryScores.safety || 0,
    nightDrivingScore: categoryScores.nightDriving || 0,
    fuelAvailabilityScore: categoryScores.fuelAvailability || 0,
    overallScore,
    computedAt: new Date().toISOString(),
  };

  // 6. Persist
  await supabase
    .from("route_reputation_scores")
    .upsert({
      route_community_id: routeCommunityId,
      food_score: result.foodScore,
      coffee_score: result.coffeeScore,
      road_quality_score: result.roadQualityScore,
      photography_score: result.photographyScore,
      safety_score: result.safetyScore,
      night_driving_score: result.nightDrivingScore,
      fuel_availability_score: result.fuelAvailabilityScore,
      overall_score: result.overallScore,
      computed_at: result.computedAt,
    }, { onConflict: "route_community_id" });

  return result;
}

/**
 * Get cached reputation scores for a route community.
 */
export async function getRouteReputationScores(
  routeCommunityId: string
): Promise<RouteReputationScores | null> {
  const { data, error } = await supabase
    .from("route_reputation_scores")
    .select("*")
    .eq("route_community_id", routeCommunityId)
    .single();

  if (error || !data) return null;

  return {
    routeCommunityId: data.route_community_id,
    foodScore: data.food_score,
    coffeeScore: data.coffee_score,
    roadQualityScore: data.road_quality_score,
    photographyScore: data.photography_score,
    safetyScore: data.safety_score,
    nightDrivingScore: data.night_driving_score,
    fuelAvailabilityScore: data.fuel_availability_score,
    overallScore: data.overall_score,
    computedAt: data.computed_at,
  };
}
