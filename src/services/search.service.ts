// ============================================================
// RouteMind V3 — Search Service
// ============================================================
// Unified search across places, routes, users, and lists.
// ============================================================

import { supabase } from "./supabase.client";
import type { Place, RouteCommunity, TravelList } from "@/types";

export interface SearchResults {
  places: Place[];
  routes: RouteCommunity[];
  users: { id: string; name: string; avatarUrl: string }[];
  lists: TravelList[];
}

export const searchService = {
  /**
   * Search across multiple entities.
   */
  async search(query: string): Promise<SearchResults> {
    if (!query || query.trim().length < 2) {
      return { places: [], routes: [], users: [], lists: [] };
    }

    const searchTerm = `%${query.trim()}%`;

    // We run queries in parallel
    const [placesRes, routesRes, usersRes, listsRes] = await Promise.all([
      // 1. Search Places
      supabase
        .from("places")
        .select("*")
        .ilike("name", searchTerm)
        .limit(5),

      // 2. Search Routes
      supabase
        .from("route_communities")
        .select("*")
        .or(`origin_label.ilike.${searchTerm},destination_label.ilike.${searchTerm},description.ilike.${searchTerm}`)
        .limit(5),

      // 3. Search Users
      supabase
        .from("users")
        .select("id, name, avatar_url")
        .ilike("name", searchTerm)
        .limit(5),

      // 4. Search Lists
      supabase
        .from("travel_lists")
        .select(`
          *,
          users:owner_id (name, avatar_url)
        `)
        .ilike("title", searchTerm)
        .eq("is_public", true)
        .limit(5),
    ]);

    return {
      places: (placesRes.data || []).map(mapPlace),
      routes: (routesRes.data || []).map(mapRoute),
      users: (usersRes.data || []).map((u: any) => ({ id: u.id, name: u.name, avatarUrl: u.avatar_url })),
      lists: (listsRes.data || []).map(mapList),
    };
  },
};

function mapPlace(data: any): Place {
  return {
    id: data.id,
    googlePlaceId: data.google_place_id,
    name: data.name,
    address: data.address,
    lat: data.latitude,
    lng: data.longitude,
    rating: data.rating,
    totalRatings: data.total_ratings,
    category: data.category,
    photoUrl: data.photo_url,
    worthStopScore: data.worth_stop_score || 0,
    detourMinutes: data.detour_minutes || 0,
    detourKm: data.detour_km || 0,
  };
}

function mapRoute(data: any): RouteCommunity {
  return {
    id: data.id,
    slug: data.slug,
    originLabel: data.origin_label,
    destinationLabel: data.destination_label,
    description: data.description,
    coverImageUrl: data.cover_image_url,
    memberCount: data.member_count || 0,
    postCount: data.post_count || 0,
    createdAt: data.created_at,
  };
}

function mapList(data: any): TravelList {
  return {
    id: data.id,
    ownerId: data.owner_id,
    title: data.title,
    description: data.description,
    coverImageUrl: data.cover_image_url,
    isPublic: data.is_public,
    likeCount: data.like_count || 0,
    saveCount: data.save_count || 0,
    followCount: data.follow_count || 0,
    duplicatedFromListId: data.duplicated_from_list_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    ownerName: data.users?.name,
    ownerAvatar: data.users?.avatar_url,
    itemCount: 0, // We don't fetch item count for quick search to save DB load
  };
}
