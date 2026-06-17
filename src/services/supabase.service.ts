import { supabase } from "./supabase.client";
import type { User, Trip, Place, Tip, SavedPlace, Visit } from "@/types";

// ============================================================
// User Service
// ============================================================
export const userService = {
  async upsertUser(clerkId: string, email: string, name: string, avatarUrl?: string): Promise<User> {
    const { data, error } = await supabase
      .from("users")
      .upsert(
        { clerk_id: clerkId, email, name, avatar_url: avatarUrl },
        { onConflict: "clerk_id" }
      )
      .select()
      .single();

    if (error) throw error;
    return mapUser(data);
  },

  async getUserByClerkId(clerkId: string): Promise<User | null> {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("clerk_id", clerkId)
      .single();

    if (error) return null;
    return mapUser(data);
  },
};

// ============================================================
// Trip Service
// ============================================================
export const tripService = {
  async createTrip(trip: Omit<Trip, "id" | "createdAt" | "updatedAt">): Promise<Trip> {
    const { data, error } = await supabase
      .from("trips")
      .insert({
        user_id: trip.userId,
        source: trip.source,
        destination: trip.destination,
        prompt: trip.prompt,
        source_lat: trip.sourceLat,
        source_lng: trip.sourceLng,
        destination_lat: trip.destinationLat,
        destination_lng: trip.destinationLng,
        polyline: trip.polyline,
        status: trip.status,
      })
      .select()
      .single();

    if (error) throw error;
    return mapTrip(data);
  },

  async getUserTrips(userId: string): Promise<Trip[]> {
    const { data, error } = await supabase
      .from("trips")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []).map(mapTrip);
  },

  async updateTripStatus(tripId: string, status: Trip["status"]): Promise<void> {
    const { error } = await supabase
      .from("trips")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", tripId);

    if (error) throw error;
  },
};

// ============================================================
// Place Service
// ============================================================
export const placeService = {
  async upsertPlace(place: Omit<Place, "id" | "isSaved" | "isVisited">): Promise<Place> {
    const { data, error } = await supabase
      .from("places")
      .upsert(
        {
          google_place_id: place.googlePlaceId,
          name: place.name,
          address: place.address,
          lat: place.lat,
          lng: place.lng,
          category: place.category,
          rating: place.rating,
          total_ratings: place.totalRatings,
          price_level: place.priceLevel,
          photo_reference: place.photoReference,
          photo_url: place.photoUrl,
          tags: place.tags,
        },
        { onConflict: "google_place_id" }
      )
      .select()
      .single();

    if (error) throw error;
    return mapPlace(data);
  },

  async getPlaceById(placeId: string): Promise<Place | null> {
    const { data, error } = await supabase
      .from("places")
      .select("*")
      .eq("id", placeId)
      .single();

    if (error) return null;
    return mapPlace(data);
  },

  async getPlacesByTripId(tripId: string, userId: string): Promise<Place[]> {
    const { data, error } = await supabase
      .from("trip_places")
      .select(`
        worth_stop_score,
        detour_minutes,
        detour_km,
        places (*)
      `)
      .eq("trip_id", tripId);

    if (error) throw error;
    return (data || []).map((item: any) => ({
      ...mapPlace(item.places),
      worthStopScore: item.worth_stop_score,
      detourMinutes: item.detour_minutes,
      detourKm: item.detour_km,
    }));
  },

  async savePlace(userId: string, placeId: string): Promise<void> {
    const { error } = await supabase
      .from("saved_places")
      .upsert({ user_id: userId, place_id: placeId }, { onConflict: "user_id,place_id" });

    if (error) throw error;
  },

  async unsavePlace(userId: string, placeId: string): Promise<void> {
    const { error } = await supabase
      .from("saved_places")
      .delete()
      .eq("user_id", userId)
      .eq("place_id", placeId);

    if (error) throw error;
  },

  async getSavedPlaces(userId: string): Promise<Place[]> {
    const { data, error } = await supabase
      .from("saved_places")
      .select("*, places(*)")
      .eq("user_id", userId)
      .order("saved_at", { ascending: false });

    if (error) throw error;
    return (data || []).map((item: any) => mapPlace(item.places));
  },

  async markVisited(userId: string, placeId: string, tripId?: string): Promise<void> {
    const { error } = await supabase.from("visits").insert({
      user_id: userId,
      place_id: placeId,
      trip_id: tripId || null,
    });

    if (error) throw error;
  },

  async isSaved(userId: string, placeId: string): Promise<boolean> {
    const { data } = await supabase
      .from("saved_places")
      .select("id")
      .eq("user_id", userId)
      .eq("place_id", placeId)
      .single();

    return !!data;
  },
};

// ============================================================
// Tip Service
// ============================================================
export const tipService = {
  async getTipsByPlace(placeId: string, userId?: string): Promise<Tip[]> {
    const { data, error } = await supabase
      .from("tips")
      .select("*, users(name, avatar_url)")
      .eq("place_id", placeId)
      .order("upvotes", { ascending: false });

    if (error) throw error;
    return (data || []).map((t: any) => mapTip(t, userId));
  },

  async createTip(placeId: string, userId: string, content: string): Promise<Tip> {
    const { data, error } = await supabase
      .from("tips")
      .insert({ place_id: placeId, user_id: userId, content })
      .select("*, users(name, avatar_url)")
      .single();

    if (error) throw error;
    return mapTip(data, userId);
  },

  async upvoteTip(tipId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from("upvotes")
      .upsert({ tip_id: tipId, user_id: userId }, { onConflict: "tip_id,user_id" });

    if (error) throw error;

    await supabase.rpc("increment_tip_upvotes", { tip_id: tipId });
  },

  async removeUpvote(tipId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from("upvotes")
      .delete()
      .eq("tip_id", tipId)
      .eq("user_id", userId);

    if (error) throw error;
    await supabase.rpc("decrement_tip_upvotes", { tip_id: tipId });
  },

  async getCommunityScore(placeId: string): Promise<number> {
    const { data } = await supabase
      .from("tips")
      .select("upvotes")
      .eq("place_id", placeId);

    if (!data || data.length === 0) return 0;
    const total = data.reduce((sum: number, t: any) => sum + (t.upvotes || 0), 0);
    return Math.min(100, Math.round((total / (data.length * 10)) * 100));
  },
};

// ============================================================
// Mappers
// ============================================================
function mapUser(data: any): User {
  return {
    id: data.id,
    clerkId: data.clerk_id,
    email: data.email,
    name: data.name,
    avatarUrl: data.avatar_url,
    createdAt: data.created_at,
  };
}

function mapTrip(data: any): Trip {
  return {
    id: data.id,
    userId: data.user_id,
    source: data.source,
    destination: data.destination,
    prompt: data.prompt,
    sourceLat: data.source_lat,
    sourceLng: data.source_lng,
    destinationLat: data.destination_lat,
    destinationLng: data.destination_lng,
    polyline: data.polyline,
    status: data.status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

function mapPlace(data: any): Place {
  return {
    id: data.id,
    googlePlaceId: data.google_place_id,
    name: data.name,
    address: data.address,
    lat: data.lat,
    lng: data.lng,
    category: data.category,
    rating: data.rating || 0,
    totalRatings: data.total_ratings || 0,
    priceLevel: data.price_level,
    photoReference: data.photo_reference,
    photoUrl: data.photo_url,
    worthStopScore: data.worth_stop_score || 0,
    detourMinutes: data.detour_minutes || 0,
    detourKm: data.detour_km || 0,
    communityScore: data.community_score || 0,
    tipCount: data.tip_count || 0,
    tags: data.tags || [],
    openNow: data.open_now,
    aiSummary: data.ai_summary || undefined,
  };
}

function mapTip(data: any, userId?: string): Tip {
  return {
    id: data.id,
    placeId: data.place_id,
    userId: data.user_id,
    content: data.content,
    upvotes: data.upvotes || 0,
    hasUpvoted: userId ? data.upvotes_by?.includes(userId) : false,
    userName: data.users?.name,
    userAvatar: data.users?.avatar_url,
    createdAt: data.created_at,
  };
}
