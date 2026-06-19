// ============================================================
// RouteMind — Explore Service
// ============================================================
// All 8 Explore section queries + Leaderboard helpers.
// Each function calls a SECURITY DEFINER Postgres RPC defined
// in supabase/migrations/005_explore_rpcs.sql.
// No client-side sorting of unbounded fetches — all ranking
// is done server-side.
// ============================================================

import { supabase } from "./supabase.client";

// ─── Shared Types ────────────────────────────────────────────

export interface TrendingRoute {
  id: string;
  slug: string;
  originLabel: string;
  destinationLabel: string;
  description: string | null;
  coverImageUrl: string | null;
  memberCount: number;
  postCount: number;
  recentPostCount: number;
  overallScore: number;
  createdAt: string;
}

export interface TrendingPlace {
  id: string;
  name: string;
  address: string | null;
  category: string;
  rating: number;
  photoUrl: string | null;
  communityScore: number;
  tipCount: number;
  finalScore: number;
  recentActivity: number;
  isHiddenGem: boolean;
}

export interface TopRatedRoute {
  id: string;
  slug: string;
  originLabel: string;
  destinationLabel: string;
  description: string | null;
  coverImageUrl: string | null;
  memberCount: number;
  postCount: number;
  overallScore: number;
  foodScore: number;
  coffeeScore: number;
  roadQualityScore: number;
  photographyScore: number;
  safetyScore: number;
  nightDrivingScore: number;
  fuelAvailabilityScore: number;
}

export interface TrendingTraveler {
  userId: string;
  userName: string;
  avatarUrl: string | null;
  level: string;
  xpPoints: number;
  recentPosts: number;
  recentUpvotes: number;
  hiddenGems: number;
  region: string | null;
}

export interface HiddenGem {
  nominationId: string;
  placeId: string;
  placeName: string;
  placeAddress: string | null;
  placeCategory: string;
  photoUrl: string | null;
  upvoteCount: number;
  downvoteCount: number;
  approvedAt: string | null;
  nominatorName: string;
  communityScore: number;
}

export interface TrendingList {
  id: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  likeCount: number;
  saveCount: number;
  followCount: number;
  itemCount: number;
  ownerName: string;
  ownerAvatar: string | null;
  trendingScore: number;
}

export interface CommunityFavoritePlace {
  id: string;
  name: string;
  address: string | null;
  category: string;
  rating: number;
  photoUrl: string | null;
  communityScore: number;
  tipCount: number;
  finalScore: number;
  isHiddenGem: boolean;
}

export interface NewDiscovery {
  id: string;
  name: string;
  address: string | null;
  category: string;
  rating: number;
  photoUrl: string | null;
  communityScore: number;
  tipCount: number;
  createdAt: string;
  isHiddenGem: boolean;
}

// ─── Query Functions ─────────────────────────────────────────

/**
 * Section 1 — Trending Routes
 * Route communities by recent post velocity (last 7 days).
 */
export async function getTrendingRoutes(limit = 10): Promise<TrendingRoute[]> {
  const { data, error } = await supabase.rpc("get_trending_routes", {
    limit_n: limit,
  });
  if (error) throw new Error(`getTrendingRoutes failed: ${error.message}`);
  return (data || []).map((r: any) => ({
    id: r.id,
    slug: r.slug,
    originLabel: r.origin_label,
    destinationLabel: r.destination_label,
    description: r.description ?? null,
    coverImageUrl: r.cover_image_url ?? null,
    memberCount: r.member_count ?? 0,
    postCount: r.post_count ?? 0,
    recentPostCount: Number(r.recent_post_count ?? 0),
    overallScore: Number(r.overall_score ?? 0),
    createdAt: r.created_at,
  }));
}

/**
 * Section 2 — Trending Places
 * Places with highest recent tip/post velocity (last 7 days).
 */
export async function getTrendingPlaces(limit = 10): Promise<TrendingPlace[]> {
  const { data, error } = await supabase.rpc("get_trending_places", {
    limit_n: limit,
  });
  if (error) throw new Error(`getTrendingPlaces failed: ${error.message}`);
  return (data || []).map((r: any) => ({
    id: r.id,
    name: r.name,
    address: r.address ?? null,
    category: r.category,
    rating: Number(r.rating ?? 0),
    photoUrl: r.photo_url ?? null,
    communityScore: r.community_score ?? 0,
    tipCount: r.tip_count ?? 0,
    finalScore: Number(r.final_score ?? 0),
    recentActivity: Number(r.recent_activity ?? 0),
    isHiddenGem: r.is_hidden_gem ?? false,
  }));
}

/**
 * Section 3 — Top Rated Routes
 * Route communities ranked by overall_score with full breakdown.
 */
export async function getTopRatedRoutes(limit = 10): Promise<TopRatedRoute[]> {
  const { data, error } = await supabase.rpc("get_top_rated_routes", {
    limit_n: limit,
  });
  if (error) throw new Error(`getTopRatedRoutes failed: ${error.message}`);
  return (data || []).map((r: any) => ({
    id: r.id,
    slug: r.slug,
    originLabel: r.origin_label,
    destinationLabel: r.destination_label,
    description: r.description ?? null,
    coverImageUrl: r.cover_image_url ?? null,
    memberCount: r.member_count ?? 0,
    postCount: r.post_count ?? 0,
    overallScore: Number(r.overall_score ?? 0),
    foodScore: Number(r.food_score ?? 0),
    coffeeScore: Number(r.coffee_score ?? 0),
    roadQualityScore: Number(r.road_quality_score ?? 0),
    photographyScore: Number(r.photography_score ?? 0),
    safetyScore: Number(r.safety_score ?? 0),
    nightDrivingScore: Number(r.night_driving_score ?? 0),
    fuelAvailabilityScore: Number(r.fuel_availability_score ?? 0),
  }));
}

/**
 * Section 4 — Trending Travelers
 * Users with highest activity velocity in the last 7 days.
 */
export async function getTrendingTravelers(limit = 10): Promise<TrendingTraveler[]> {
  const { data, error } = await supabase.rpc("get_trending_travelers", {
    limit_n: limit,
  });
  if (error) throw new Error(`getTrendingTravelers failed: ${error.message}`);
  return (data || []).map((r: any) => ({
    userId: r.user_id,
    userName: r.user_name ?? "Explorer",
    avatarUrl: r.avatar_url ?? null,
    level: r.level ?? "traveler",
    xpPoints: r.xp_points ?? 0,
    recentPosts: Number(r.recent_posts ?? 0),
    recentUpvotes: Number(r.recent_upvotes ?? 0),
    hiddenGems: r.hidden_gems ?? 0,
    region: r.region ?? null,
  }));
}

/**
 * Section 5 — Hidden Gems
 * Recently approved nominations sorted by vote count.
 */
export async function getRecentHiddenGems(limit = 10): Promise<HiddenGem[]> {
  const { data, error } = await supabase.rpc("get_recent_hidden_gems", {
    limit_n: limit,
  });
  if (error) throw new Error(`getRecentHiddenGems failed: ${error.message}`);
  return (data || []).map((r: any) => ({
    nominationId: r.nomination_id,
    placeId: r.place_id,
    placeName: r.place_name ?? "Hidden Gem",
    placeAddress: r.place_address ?? null,
    placeCategory: r.place_category ?? "hidden_gem",
    photoUrl: r.photo_url ?? null,
    upvoteCount: r.upvote_count ?? 0,
    downvoteCount: r.downvote_count ?? 0,
    approvedAt: r.approved_at ?? null,
    nominatorName: r.nominator_name ?? "Explorer",
    communityScore: r.community_score ?? 0,
  }));
}

/**
 * Section 6 — Trending Lists (Popular Lists)
 * Travel lists ranked by like + save + follow combined score.
 */
export async function getTrendingLists(limit = 10): Promise<TrendingList[]> {
  const { data, error } = await supabase.rpc("get_trending_lists", {
    limit_n: limit,
  });
  if (error) throw new Error(`getTrendingLists failed: ${error.message}`);
  return (data || []).map((r: any) => ({
    id: r.id,
    title: r.title,
    description: r.description ?? null,
    coverImageUrl: r.cover_image_url ?? null,
    likeCount: r.like_count ?? 0,
    saveCount: r.save_count ?? 0,
    followCount: r.follow_count ?? 0,
    itemCount: Number(r.item_count ?? 0),
    ownerName: r.owner_name ?? "Creator",
    ownerAvatar: r.owner_avatar ?? null,
    trendingScore: r.trending_score ?? 0,
  }));
}

/**
 * Section 7 — Community Favorites
 * Highest place_trust_scores.final_score places.
 */
export async function getCommunityFavoritePlaces(limit = 10): Promise<CommunityFavoritePlace[]> {
  const { data, error } = await supabase.rpc("get_community_favorite_places", {
    limit_n: limit,
  });
  if (error) throw new Error(`getCommunityFavoritePlaces failed: ${error.message}`);
  return (data || []).map((r: any) => ({
    id: r.id,
    name: r.name,
    address: r.address ?? null,
    category: r.category,
    rating: Number(r.rating ?? 0),
    photoUrl: r.photo_url ?? null,
    communityScore: r.community_score ?? 0,
    tipCount: r.tip_count ?? 0,
    finalScore: Number(r.final_score ?? 0),
    isHiddenGem: r.is_hidden_gem ?? false,
  }));
}

/**
 * Section 8 — New Discoveries
 * Recently added places with low post history.
 */
export async function getNewDiscoveries(limit = 10): Promise<NewDiscovery[]> {
  const { data, error } = await supabase.rpc("get_new_discoveries", {
    limit_n: limit,
  });
  if (error) throw new Error(`getNewDiscoveries failed: ${error.message}`);
  return (data || []).map((r: any) => ({
    id: r.id,
    name: r.name,
    address: r.address ?? null,
    category: r.category,
    rating: Number(r.rating ?? 0),
    photoUrl: r.photo_url ?? null,
    communityScore: r.community_score ?? 0,
    tipCount: r.tip_count ?? 0,
    createdAt: r.created_at,
    isHiddenGem: r.is_hidden_gem ?? false,
  }));
}
