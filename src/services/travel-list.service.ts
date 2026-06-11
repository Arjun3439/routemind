// ============================================================
// RouteMind V3 — Travel List Service
// ============================================================
// Manages creation, fetching, and duplication of travel lists.
// ============================================================

import { supabase } from "./supabase.client";
import type { TravelList, TravelListItem, Place } from "@/types";

export const travelListService = {
  /**
   * Create a new travel list.
   */
  async createList(ownerId: string, title: string, description?: string, isPublic = true): Promise<TravelList> {
    const { data, error } = await supabase
      .from("travel_lists")
      .insert({
        owner_id: ownerId,
        title,
        description,
        is_public: isPublic,
      })
      .select(`
        *,
        users:owner_id (name, avatar_url)
      `)
      .single();

    if (error) throw error;
    return mapList(data);
  },

  /**
   * Get lists owned by a specific user.
   */
  async getUserLists(userId: string): Promise<TravelList[]> {
    const { data, error } = await supabase
      .from("travel_lists")
      .select(`
        *,
        users:owner_id (name, avatar_url),
        travel_list_items(count)
      `)
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []).map(mapList);
  },

  /**
   * Add a place to a list.
   */
  async addPlaceToList(listId: string, placeId: string, note?: string): Promise<void> {
    // Get current max position
    const { data: items } = await supabase
      .from("travel_list_items")
      .select("position")
      .eq("list_id", listId)
      .order("position", { ascending: false })
      .limit(1);

    const position = items && items.length > 0 ? (items[0].position || 0) + 1 : 0;

    const { error } = await supabase
      .from("travel_list_items")
      .insert({
        list_id: listId,
        place_id: placeId,
        note,
        position,
      });

    if (error) throw error;
  },

  /**
   * Get items in a list.
   */
  async getListItems(listId: string): Promise<TravelListItem[]> {
    const { data, error } = await supabase
      .from("travel_list_items")
      .select(`
        *,
        places:place_id (*)
      `)
      .eq("list_id", listId)
      .order("position", { ascending: true });

    if (error) throw error;
    
    return (data || []).map((item: any) => ({
      id: item.id,
      listId: item.list_id,
      placeId: item.place_id,
      note: item.note,
      position: item.position,
      createdAt: item.created_at,
      place: item.places as Place, // Assuming places table matches Place interface
    }));
  },

  /**
   * Duplicate a public list to user's own lists.
   */
  async duplicateList(listId: string, userId: string): Promise<TravelList> {
    // 1. Fetch original list
    const { data: originalList } = await supabase
      .from("travel_lists")
      .select("*")
      .eq("id", listId)
      .single();

    if (!originalList) throw new Error("List not found");

    // 2. Create new list
    const { data: newList, error: createError } = await supabase
      .from("travel_lists")
      .insert({
        owner_id: userId,
        title: `${originalList.title} (Copy)`,
        description: originalList.description,
        is_public: false, // Default duplicated lists to private
        duplicated_from_list_id: listId,
      })
      .select(`*, users:owner_id (name, avatar_url)`)
      .single();

    if (createError) throw createError;

    // 3. Increment save count on original
    await supabase
      .from("travel_lists")
      .update({ save_count: (originalList.save_count || 0) + 1 })
      .eq("id", listId);

    // 4. Copy items
    const { data: originalItems } = await supabase
      .from("travel_list_items")
      .select("*")
      .eq("list_id", listId);

    if (originalItems && originalItems.length > 0) {
      const newItems = originalItems.map((item: any) => ({
        list_id: newList.id,
        place_id: item.place_id,
        note: item.note,
        position: item.position,
      }));

      await supabase.from("travel_list_items").insert(newItems);
    }

    return mapList(newList);
  },
};

function mapList(data: any): TravelList {
  // Subquery count extraction
  const itemCount = data.travel_list_items?.[0]?.count 
    ? data.travel_list_items[0].count 
    : data.travel_list_items?.length || 0;

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
    itemCount,
  };
}
