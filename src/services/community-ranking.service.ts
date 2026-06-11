// ============================================================
// RouteMind V3 — Community Feed Ranking Service
// ============================================================
// Computes feed scores for the "For You" community feed.
// Does NOT modify recommendation.service.ts or any existing service.
// ============================================================

import { supabase } from "./supabase.client";
import type { Post, ScoredPost, FeedScoreWeights } from "@/types";

// ─── Configurable Weights ─────────────────────────────────────
// Total should sum to 1.0
export const FEED_SCORE_WEIGHTS: FeedScoreWeights = {
  engagement: 0.35,     // Log of net votes + comments
  freshness: 0.25,      // Exponential decay from creation time
  authorReputation: 0.15, // Author's XP points normalized
  trustScore: 0.15,     // Place trust score (if post has a place)
  routeRelevance: 0.10, // 1.0 if matches user's recent route, else 0
};

// Maximum XP for normalization (Legend threshold)
const MAX_XP_FOR_NORMALIZATION = 10000;

// Freshness decay: score halves every HALF_LIFE_HOURS hours
const HALF_LIFE_HOURS = 24;

// ─── Score Computation ────────────────────────────────────────

/**
 * Compute engagement score from votes and comments.
 * Uses log1p to dampen extreme values. Range: 0–100.
 */
export function computeEngagementScore(
  upvotes: number,
  downvotes: number,
  comments: number
): number {
  const netVotes = Math.max(0, upvotes - downvotes);
  const engagement = netVotes + comments;
  // log1p(100) ≈ 4.62, so 100 engagement → ~100 score
  const raw = (Math.log1p(engagement) / Math.log1p(100)) * 100;
  return Math.min(100, Math.round(raw));
}

/**
 * Compute freshness score using exponential decay.
 * A post created now scores 100; after HALF_LIFE_HOURS it scores 50.
 */
export function computeFreshnessScore(createdAt: string): number {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  const decay = Math.pow(0.5, ageHours / HALF_LIFE_HOURS);
  return Math.round(decay * 100);
}

/**
 * Normalize author reputation XP to 0–100 range.
 */
export function computeAuthorReputationScore(xpPoints: number): number {
  return Math.min(100, Math.round((xpPoints / MAX_XP_FOR_NORMALIZATION) * 100));
}

/**
 * Route relevance: 1.0 if post's route matches user's active/recent route.
 */
export function computeRouteRelevanceScore(
  postRouteCommunityId: string | undefined,
  userActiveRouteCommunityIds: string[]
): number {
  if (!postRouteCommunityId) return 0;
  return userActiveRouteCommunityIds.includes(postRouteCommunityId) ? 100 : 0;
}

/**
 * Compute the final feed score for a post.
 */
export function computeFeedScore(
  post: Post,
  authorXp: number,
  placeTrustScore: number,
  userActiveRouteCommunityIds: string[],
  weights: FeedScoreWeights = FEED_SCORE_WEIGHTS
): number {
  const engagement = computeEngagementScore(
    post.upvoteCount,
    post.downvoteCount,
    post.commentCount
  );
  const freshness = computeFreshnessScore(post.createdAt);
  const authorRep = computeAuthorReputationScore(authorXp);
  const trust = Math.min(100, placeTrustScore);
  const routeRel = computeRouteRelevanceScore(
    post.routeCommunityId,
    userActiveRouteCommunityIds
  );

  const score =
    weights.engagement * engagement +
    weights.freshness * freshness +
    weights.authorReputation * authorRep +
    weights.trustScore * trust +
    weights.routeRelevance * routeRel;

  return Math.round(score);
}

// ─── Feed Query + Ranking ─────────────────────────────────────

/**
 * Fetch and rank posts for the "For You" feed.
 * Fetches a batch of recent posts and scores them client-side.
 */
export async function getRankedFeed(
  userId: string,
  userActiveRouteCommunityIds: string[] = [],
  limit = 20,
  offset = 0
): Promise<ScoredPost[]> {
  // 1. Fetch recent non-deleted posts with author info
  const { data: posts, error } = await supabase
    .from("posts")
    .select(`
      *,
      users:author_id (name, avatar_url),
      places:place_id (name),
      route_communities:route_community_id (slug, origin_label, destination_label)
    `)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit * 3 - 1); // Fetch extra for ranking

  if (error) throw error;
  if (!posts || posts.length === 0) return [];

  // 2. Fetch author reputations in batch
  const authorIds = [...new Set(posts.map((p: any) => p.author_id))];
  const { data: reputations } = await supabase
    .from("user_reputation")
    .select("user_id, xp_points")
    .in("user_id", authorIds);

  const xpMap = new Map<string, number>();
  (reputations || []).forEach((r: any) => xpMap.set(r.user_id, r.xp_points));

  // 3. Fetch place trust scores in batch
  const placeIds = posts
    .map((p: any) => p.place_id)
    .filter((id: any) => id != null);
  const uniquePlaceIds = [...new Set(placeIds)];

  const { data: trustScores } = uniquePlaceIds.length > 0
    ? await supabase
        .from("place_trust_scores")
        .select("place_id, final_score")
        .in("place_id", uniquePlaceIds)
    : { data: [] };

  const trustMap = new Map<string, number>();
  (trustScores || []).forEach((t: any) => trustMap.set(t.place_id, t.final_score));

  // 4. Score each post
  const scoredPosts: ScoredPost[] = posts.map((p: any) => {
    const authorXp = xpMap.get(p.author_id) || 0;
    const placeTrust = p.place_id ? (trustMap.get(p.place_id) || 0) : 0;

    const mapped: Post = {
      id: p.id,
      authorId: p.author_id,
      type: p.type,
      placeId: p.place_id,
      tripId: p.trip_id,
      routeCommunityId: p.route_community_id,
      title: p.title,
      body: p.body,
      mediaUrls: p.media_urls || [],
      upvoteCount: p.upvote_count || 0,
      downvoteCount: p.downvote_count || 0,
      commentCount: p.comment_count || 0,
      isDeleted: p.is_deleted,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      authorName: p.users?.name,
      authorAvatar: p.users?.avatar_url,
      placeName: p.places?.name,
      routeName: p.route_communities
        ? `${p.route_communities.origin_label} → ${p.route_communities.destination_label}`
        : undefined,
    };

    const feedScore = computeFeedScore(
      mapped,
      authorXp,
      placeTrust,
      userActiveRouteCommunityIds
    );

    return { ...mapped, feedScore };
  });

  // 5. Sort by feed score descending, return top N
  scoredPosts.sort((a, b) => b.feedScore - a.feedScore);
  return scoredPosts.slice(0, limit);
}

/**
 * Fetch posts for the "Following" feed — from followed users, places, routes.
 */
export async function getFollowingFeed(
  userId: string,
  limit = 20,
  offset = 0
): Promise<Post[]> {
  // Get user's follows
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

  // Build OR query
  let query = supabase
    .from("posts")
    .select(`
      *,
      users:author_id (name, avatar_url),
      places:place_id (name)
    `)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Filter by followed entities
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
  if (error) throw error;

  return (data || []).map((p: any) => ({
    id: p.id,
    authorId: p.author_id,
    type: p.type,
    placeId: p.place_id,
    tripId: p.trip_id,
    routeCommunityId: p.route_community_id,
    title: p.title,
    body: p.body,
    mediaUrls: p.media_urls || [],
    upvoteCount: p.upvote_count || 0,
    downvoteCount: p.downvote_count || 0,
    commentCount: p.comment_count || 0,
    isDeleted: p.is_deleted,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    authorName: p.users?.name,
    authorAvatar: p.users?.avatar_url,
    placeName: p.places?.name,
  }));
}
