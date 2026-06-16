// ============================================================
// RouteMind — Leaderboard Service
// ============================================================
// Fetches ranked user data from the get_leaderboard Postgres RPC.
// Supports global and regional leaderboards by category.
// ============================================================

import { supabase } from "./supabase.client";

export type LeaderboardCategory =
  | "overall"
  | "food"
  | "coffee"
  | "hidden_gem"
  | "photography";

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  avatarUrl: string | null;
  region: string | null;
  score: number;
  level: string;
  xpPoints: number;
  badges: any[];
  hiddenGems: number;
}

export type LeaderboardRegion =
  | "Tamil Nadu"
  | "Karnataka"
  | "Kerala"
  | "Sri Lanka"
  | null; // null = global

/**
 * Fetch the global leaderboard for a given category.
 * Returns top 50 users ranked by score descending.
 */
export async function getGlobalLeaderboard(
  category: LeaderboardCategory = "overall",
  limit = 50
): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase.rpc("get_leaderboard", {
    p_category: category,
    p_region: null,
    p_limit: limit,
  });

  if (error) throw new Error(`Leaderboard fetch failed: ${error.message}`);
  return mapLeaderboardRows(data || []);
}

/**
 * Fetch the leaderboard filtered to a specific region.
 */
export async function getRegionalLeaderboard(
  category: LeaderboardCategory = "overall",
  region: LeaderboardRegion,
  limit = 50
): Promise<LeaderboardEntry[]> {
  if (!region) return getGlobalLeaderboard(category, limit);

  const { data, error } = await supabase.rpc("get_leaderboard", {
    p_category: category,
    p_region: region,
    p_limit: limit,
  });

  if (error) throw new Error(`Regional leaderboard fetch failed: ${error.message}`);
  return mapLeaderboardRows(data || []);
}

/**
 * Update the current user's region preference.
 * Called from the profile/settings screen.
 */
export async function setUserRegion(
  userId: string,
  region: LeaderboardRegion
): Promise<void> {
  const { error } = await supabase
    .from("users")
    .update({ region })
    .eq("id", userId);

  if (error) throw new Error(`Failed to update region: ${error.message}`);
}

/**
 * Upsert category stats for a user (called when XP-earning actions occur).
 * category: food | coffee | hidden_gem | photography | overall
 * scoreDelta: points to add (positive) or subtract (negative)
 */
export async function addCategoryScore(
  userId: string,
  category: LeaderboardCategory,
  scoreDelta: number
): Promise<void> {
  const { data: existing } = await supabase
    .from("reputation_category_stats")
    .select("score")
    .eq("user_id", userId)
    .eq("category", category)
    .maybeSingle();

  const newScore = Math.max(0, (existing?.score ?? 0) + scoreDelta);

  const { error } = await supabase
    .from("reputation_category_stats")
    .upsert(
      { user_id: userId, category, score: newScore },
      { onConflict: "user_id,category" }
    );

  if (error) throw new Error(`Failed to update category score: ${error.message}`);
}

// ─── Internal mapper ──────────────────────────────────────────

function mapLeaderboardRows(rows: any[]): LeaderboardEntry[] {
  return rows.map((row) => ({
    rank: Number(row.rank),
    userId: row.user_id,
    userName: row.user_name ?? "Unknown",
    avatarUrl: row.avatar_url ?? null,
    region: row.region ?? null,
    score: row.score ?? 0,
    level: row.level ?? "traveler",
    xpPoints: row.xp_points ?? 0,
    badges: row.badges ?? [],
    hiddenGems: row.hidden_gems ?? 0,
  }));
}
