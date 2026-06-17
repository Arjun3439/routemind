// ============================================================
// RouteMind V3 — Community Feed Ranking Service
// ============================================================
// Fetches the "For You" feed from the get_for_you_feed Postgres RPC
// (server-side scoring) and the "Following" feed from Supabase.
// Score computation helpers are kept for client-side use elsewhere.
// ============================================================

import { supabase } from "./supabase.client";
import type { Post, ScoredPost, FeedScoreWeights } from "@/types";

// ─── Configurable Weights (kept for reference / client-side use) ──

export const FEED_SCORE_WEIGHTS: FeedScoreWeights = {
  engagement: 0.35,
  freshness: 0.25,
  authorReputation: 0.15,
  trustScore: 0.15,
  routeRelevance: 0.10,
};

const MAX_XP_FOR_NORMALIZATION = 10000;
const HALF_LIFE_HOURS = 24;

// ─── Score Helpers (used externally, kept intact) ─────────────

export function computeEngagementScore(
  upvotes: number,
  downvotes: number,
  comments: number
): number {
  const netVotes = Math.max(0, upvotes - downvotes);
  const engagement = netVotes + comments;
  const raw = (Math.log1p(engagement) / Math.log1p(100)) * 100;
  return Math.min(100, Math.round(raw));
}

export function computeFreshnessScore(createdAt: string): number {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  const decay = Math.pow(0.5, ageHours / HALF_LIFE_HOURS);
  return Math.round(decay * 100);
}

export function computeAuthorReputationScore(xpPoints: number): number {
  return Math.min(100, Math.round((xpPoints / MAX_XP_FOR_NORMALIZATION) * 100));
}

export function computeRouteRelevanceScore(
  postRouteCommunityId: string | undefined,
  userActiveRouteCommunityIds: string[]
): number {
  if (!postRouteCommunityId) return 0;
  return userActiveRouteCommunityIds.includes(postRouteCommunityId) ? 100 : 0;
}

export function computeFeedScore(
  post: Post,
  authorXp: number,
  placeTrustScore: number,
  userActiveRouteCommunityIds: string[],
  weights: FeedScoreWeights = FEED_SCORE_WEIGHTS
): number {
  const engagement = computeEngagementScore(post.upvoteCount, post.downvoteCount, post.commentCount);
  const freshness = computeFreshnessScore(post.createdAt);
  const authorRep = computeAuthorReputationScore(authorXp);
  const trust = Math.min(100, placeTrustScore);
  const routeRel = computeRouteRelevanceScore(post.routeCommunityId, userActiveRouteCommunityIds);

  return Math.round(
    weights.engagement * engagement +
    weights.freshness * freshness +
    weights.authorReputation * authorRep +
    weights.trustScore * trust +
    weights.routeRelevance * routeRel
  );
}

// ─── For You Feed (server-side RPC) ──────────────────────────

/**
 * Fetch the "For You" feed using the server-side `get_for_you_feed` RPC.
 *
 * The Postgres function handles:
 *   - Engagement + freshness + author reputation + trust + follow boost scoring
 *   - Cursor-based pagination (pass the `created_at` of the last post)
 *   - Zero-rows-safe: returns empty array, never throws, when no posts exist
 *
 * @param userId  Supabase user UUID (for follow-boost personalisation)
 * @param limit   Max posts to return (default 20)
 * @param cursor  created_at of the last post seen (for next-page calls)
 */
export async function getRankedFeed(
  userId: string,
  userActiveRouteCommunityIds: string[] = [], // kept for API compat, boost now done server-side
  limit = 20,
  cursor?: string
): Promise<ScoredPost[]> {
  const { data, error } = await supabase.rpc("get_for_you_feed", {
    p_user_id: userId,
    p_limit: limit,
    p_cursor: cursor ?? null,
  });

  if (error) {
    // Log but don't throw — feed should degrade gracefully
    console.error("getRankedFeed error:", error.message);
    return [];
  }

  if (!data || data.length === 0) return [];

  return (data as any[]).map((row) => {
    const post: Post = {
      id: row.id,
      authorId: row.author_id,
      type: row.type,
      placeId: row.place_id,
      tripId: row.trip_id,
      routeCommunityId: row.route_community_id,
      title: row.title,
      body: row.body,
      mediaUrls: row.media_urls ?? [],
      upvoteCount: row.upvote_count ?? 0,
      downvoteCount: row.downvote_count ?? 0,
      commentCount: row.comment_count ?? 0,
      isDeleted: false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      authorName: row.author_name,
      authorEmail: row.author_email,
      authorAvatar: row.author_avatar,
      placeName: row.place_name,
      routeName: row.route_name,
    };

    return {
      ...post,
      feedScore: Math.round(row.feed_score ?? 0),
    } as ScoredPost;
  });
}

// ─── Following Feed ───────────────────────────────────────────

/**
 * Fetch posts from followed users, places, and route communities.
 *
 * Returns [] (not an error) when the user follows no one — the UI should
 * show a "follow people to see their posts" CTA in that case.
 */
export async function getFollowingFeed(
  userId: string,
  limit = 20,
  offset = 0
): Promise<Post[]> {
  const { data: follows } = await supabase
    .from("follows")
    .select("followed_type, followed_id")
    .eq("follower_id", userId);

  if (!follows || follows.length === 0) return [];

  const followedUserIds = follows
    .filter((f: any) => f.followed_type === "user")
    .map((f: any) => f.followed_id);
  const followedPlaceIds = follows
    .filter((f: any) => f.followed_type === "place")
    .map((f: any) => f.followed_id);
  const followedRouteIds = follows
    .filter((f: any) => f.followed_type === "route_community")
    .map((f: any) => f.followed_id);

  let query = supabase
    .from("posts")
    .select(`
      *,
      users:author_id (name, email, avatar_url),
      places:place_id (name)
    `)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const filters: string[] = [];
  if (followedUserIds.length > 0) {
    filters.push(`author_id.in.(${followedUserIds.join(",")})`);
  }
  if (followedPlaceIds.length > 0) {
    filters.push(`place_id.in.(${followedPlaceIds.join(",")})`);
  }
  if (followedRouteIds.length > 0) {
    filters.push(`route_community_id.in.(${followedRouteIds.join(",")})`);
  }

  if (filters.length > 0) {
    query = query.or(filters.join(","));
  }

  const { data, error } = await query;
  if (error) {
    console.error("getFollowingFeed error:", error.message);
    return [];
  }

  return (data || []).map((p: any) => ({
    id: p.id,
    authorId: p.author_id,
    type: p.type,
    placeId: p.place_id,
    tripId: p.trip_id,
    routeCommunityId: p.route_community_id,
    title: p.title,
    body: p.body,
    mediaUrls: p.media_urls ?? [],
    upvoteCount: p.upvote_count ?? 0,
    downvoteCount: p.downvote_count ?? 0,
    commentCount: p.comment_count ?? 0,
    isDeleted: p.is_deleted,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    authorName: p.users?.name,
    authorEmail: p.users?.email,
    authorAvatar: p.users?.avatar_url,
    placeName: p.places?.name,
  }));
}
