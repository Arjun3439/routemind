// ============================================================
// RouteMind — Explore Hooks (React Query)
// ============================================================
// One hook per Explore section. Each hook is fully independent:
// - its own query key
// - its own loading / error / empty state
// - staleTime of 5 minutes (explore data changes slowly)
// One section failing does NOT affect the others.
// ============================================================

import { useQuery } from "@tanstack/react-query";
import {
  getTrendingRoutes,
  getTrendingPlaces,
  getTopRatedRoutes,
  getTrendingTravelers,
  getRecentHiddenGems,
  getTrendingLists,
  getCommunityFavoritePlaces,
  getNewDiscoveries,
  type TrendingRoute,
  type TrendingPlace,
  type TopRatedRoute,
  type TrendingTraveler,
  type HiddenGem,
  type TrendingList,
  type CommunityFavoritePlace,
  type NewDiscovery,
} from "@/services/explore.service";
import {
  getGlobalLeaderboard,
  getRegionalLeaderboard,
  type LeaderboardEntry,
  type LeaderboardCategory,
  type LeaderboardRegion,
} from "@/services/leaderboard.service";

const STALE_TIME = 1000 * 60 * 5; // 5 minutes

// ─── Section 1: Trending Routes ──────────────────────────────

export function useTrendingRoutes(limit = 10) {
  return useQuery<TrendingRoute[], Error>({
    queryKey: ["explore", "trending-routes", limit],
    queryFn: () => getTrendingRoutes(limit),
    staleTime: STALE_TIME,
    retry: 2,
  });
}

// ─── Section 2: Trending Places ──────────────────────────────

export function useTrendingPlaces(limit = 10) {
  return useQuery<TrendingPlace[], Error>({
    queryKey: ["explore", "trending-places", limit],
    queryFn: () => getTrendingPlaces(limit),
    staleTime: STALE_TIME,
    retry: 2,
  });
}

// ─── Section 3: Top Rated Routes ─────────────────────────────

export function useTopRatedRoutes(limit = 10) {
  return useQuery<TopRatedRoute[], Error>({
    queryKey: ["explore", "top-rated-routes", limit],
    queryFn: () => getTopRatedRoutes(limit),
    staleTime: STALE_TIME,
    retry: 2,
  });
}

// ─── Section 4: Trending Travelers ───────────────────────────

export function useTrendingTravelers(limit = 10) {
  return useQuery<TrendingTraveler[], Error>({
    queryKey: ["explore", "trending-travelers", limit],
    queryFn: () => getTrendingTravelers(limit),
    staleTime: STALE_TIME,
    retry: 2,
  });
}

// ─── Section 5: Hidden Gems ──────────────────────────────────

export function useRecentHiddenGems(limit = 10) {
  return useQuery<HiddenGem[], Error>({
    queryKey: ["explore", "hidden-gems", limit],
    queryFn: () => getRecentHiddenGems(limit),
    staleTime: STALE_TIME,
    retry: 2,
  });
}

// ─── Section 6: Trending Lists ───────────────────────────────

export function useTrendingLists(limit = 10) {
  return useQuery<TrendingList[], Error>({
    queryKey: ["explore", "trending-lists", limit],
    queryFn: () => getTrendingLists(limit),
    staleTime: STALE_TIME,
    retry: 2,
  });
}

// ─── Section 7: Community Favorites ──────────────────────────

export function useCommunityFavoritePlaces(limit = 10) {
  return useQuery<CommunityFavoritePlace[], Error>({
    queryKey: ["explore", "community-favorites", limit],
    queryFn: () => getCommunityFavoritePlaces(limit),
    staleTime: STALE_TIME,
    retry: 2,
  });
}

// ─── Section 8: New Discoveries ──────────────────────────────

export function useNewDiscoveries(limit = 10) {
  return useQuery<NewDiscovery[], Error>({
    queryKey: ["explore", "new-discoveries", limit],
    queryFn: () => getNewDiscoveries(limit),
    staleTime: STALE_TIME,
    retry: 2,
  });
}

// ─── Section 9: Leaderboard (embedded) ───────────────────────

export function useLeaderboard(
  scope: "global" | "regional",
  category: LeaderboardCategory,
  region: LeaderboardRegion
) {
  return useQuery<LeaderboardEntry[], Error>({
    queryKey: ["explore", "leaderboard", scope, category, region],
    queryFn: () =>
      scope === "global"
        ? getGlobalLeaderboard(category)
        : getRegionalLeaderboard(category, region),
    staleTime: STALE_TIME,
    retry: 2,
  });
}

// Re-export types for convenience
export type {
  TrendingRoute,
  TrendingPlace,
  TopRatedRoute,
  TrendingTraveler,
  HiddenGem,
  TrendingList,
  CommunityFavoritePlace,
  NewDiscovery,
  LeaderboardEntry,
  LeaderboardCategory,
  LeaderboardRegion,
};
