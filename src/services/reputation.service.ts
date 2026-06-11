// ============================================================
// RouteMind V3 — User Reputation Service
// ============================================================
// Manages XP points, levels, and badges for users.
// Note: Basic XP increments are handled by DB triggers in v3_migration.sql.
// This service handles complex badge logic and level promotions.
// ============================================================

import { supabase } from "./supabase.client";
import type { UserReputation, ReputationLevel } from "@/types";

// ─── Constants & Thresholds ───────────────────────────────────

export const LEVEL_THRESHOLDS: Record<ReputationLevel, number> = {
  traveler: 0,
  explorer: 100,
  guide: 500,
  expert: 2000,
  legend: 10000,
};

export const XP_VALUES = {
  create_post: 10,
  receive_upvote: 2,
  hidden_gem_approved: 50,
  create_comment: 3,
  create_list: 5,
} as const;

// ─── Badge Logic ──────────────────────────────────────────────

/**
 * Evaluates which badges a user should have based on their activity.
 */
async function evaluateBadges(userId: string): Promise<string[]> {
  const badges: string[] = [];

  // Fetch user stats from reputation table
  const { data: rep } = await supabase
    .from("user_reputation")
    .select("posts_count, hidden_gems_found, total_upvotes_received")
    .eq("user_id", userId)
    .single();

  if (!rep) return [];

  // Hidden Gem Finder
  if (rep.hidden_gems_found >= 1) {
    badges.push("hidden_gem_finder");
  }

  // Top Contributor
  if (rep.posts_count >= 50 && rep.total_upvotes_received >= 200) {
    badges.push("top_contributor");
  }

  // Fetch category-specific post counts
  // We infer category from tagged posts or place categories
  const { data: posts } = await supabase
    .from("posts")
    .select(`
      id,
      places:place_id (category)
    `)
    .eq("author_id", userId)
    .eq("is_deleted", false);

  if (posts && posts.length > 0) {
    let foodCount = 0;
    let coffeeCount = 0;
    let photoCount = 0; // Using viewpoint/attraction as proxy
    let roadTripCount = posts.length; // All posts count towards road trip

    posts.forEach((p: any) => {
      const cat = p.places?.category;
      if (cat === "restaurant") foodCount++;
      if (cat === "cafe") coffeeCount++;
      if (cat === "viewpoint" || cat === "attraction") photoCount++;
    });

    if (foodCount >= 10) badges.push("food_explorer");
    if (coffeeCount >= 5) badges.push("coffee_hunter");
    if (photoCount >= 10) badges.push("photographer");
    if (roadTripCount >= 20) badges.push("road_tripper");
  }

  return badges;
}

/**
 * Determine level based on XP.
 */
function determineLevel(xp: number): ReputationLevel {
  if (xp >= LEVEL_THRESHOLDS.legend) return "legend";
  if (xp >= LEVEL_THRESHOLDS.expert) return "expert";
  if (xp >= LEVEL_THRESHOLDS.guide) return "guide";
  if (xp >= LEVEL_THRESHOLDS.explorer) return "explorer";
  return "traveler";
}

// ─── Public API ───────────────────────────────────────────────

/**
 * Fetch a user's reputation profile.
 */
export async function getUserReputation(userId: string): Promise<UserReputation | null> {
  const { data, error } = await supabase
    .from("user_reputation")
    .select(`
      *,
      users:user_id (name, avatar_url)
    `)
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    // If not exists, might need initialization
    return null;
  }

  return {
    userId: data.user_id,
    level: data.level,
    xpPoints: data.xp_points,
    badges: data.badges || [],
    postsCount: data.posts_count,
    hiddenGemsFound: data.hidden_gems_found,
    totalUpvotesReceived: data.total_upvotes_received,
    updatedAt: data.updated_at,
    userName: data.users?.name,
    userAvatar: data.users?.avatar_url,
  };
}

/**
 * Recompute a user's level and badges.
 * Useful to run periodically or after significant milestones.
 */
export async function syncUserReputation(userId: string): Promise<UserReputation | null> {
  // Get current rep to check XP
  const { data: currentRep } = await supabase
    .from("user_reputation")
    .select("xp_points")
    .eq("user_id", userId)
    .single();

  if (!currentRep) return null;

  const newLevel = determineLevel(currentRep.xp_points);
  const newBadges = await evaluateBadges(userId);

  // Update
  const { data, error } = await supabase
    .from("user_reputation")
    .update({
      level: newLevel,
      badges: newBadges,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select(`
      *,
      users:user_id (name, avatar_url)
    `)
    .single();

  if (error || !data) return null;

  return {
    userId: data.user_id,
    level: data.level,
    xpPoints: data.xp_points,
    badges: data.badges || [],
    postsCount: data.posts_count,
    hiddenGemsFound: data.hidden_gems_found,
    totalUpvotesReceived: data.total_upvotes_received,
    updatedAt: data.updated_at,
    userName: data.users?.name,
    userAvatar: data.users?.avatar_url,
  };
}
