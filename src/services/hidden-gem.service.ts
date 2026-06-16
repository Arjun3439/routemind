// ============================================================
// RouteMind V3 — Hidden Gem Service
// ============================================================
// Manages hidden gem nominations.
// Note: Auto-approval logic and XP rewards are handled by DB triggers.
// ============================================================

import { supabase } from "./supabase.client";
import type { HiddenGemNomination, Post } from "@/types";

/**
 * Nominate a place as a hidden gem.
 * Creates a post of type 'hidden_gem_nomination' and a corresponding nomination record.
 */
export async function nominateHiddenGem(
  placeId: string,
  userId: string,
  title: string,
  body: string,
  mediaUrls: string[] = []
): Promise<{ nomination: HiddenGemNomination; post: Post }> {
  
  // 1. Create the post
  const { data: postData, error: postError } = await supabase
    .from("posts")
    .insert({
      author_id: userId,
      type: "hidden_gem_nomination",
      place_id: placeId,
      title,
      body,
      media_urls: mediaUrls,
    })
    .select(`
      *,
      users:author_id (name, avatar_url),
      places:place_id (name)
    `)
    .single();

  if (postError || !postData) {
    throw new Error(`Failed to create nomination post: ${postError?.message}`);
  }

  // 2. Create the nomination record linking to the post
  const { data: nomData, error: nomError } = await supabase
    .from("hidden_gem_nominations")
    .insert({
      place_id: placeId,
      nominated_by: userId,
      post_id: postData.id,
    })
    .select(`
      *,
      places:place_id (name),
      users:nominated_by (name)
    `)
    .single();

  if (nomError || !nomData) {
    throw new Error(`Failed to create nomination record: ${nomError?.message}`);
  }

  // Map post
  const post: Post = {
    id: postData.id,
    authorId: postData.author_id,
    type: postData.type,
    placeId: postData.place_id,
    tripId: postData.trip_id,
    routeCommunityId: postData.route_community_id,
    title: postData.title,
    body: postData.body,
    mediaUrls: postData.media_urls || [],
    upvoteCount: postData.upvote_count || 0,
    downvoteCount: postData.downvote_count || 0,
    commentCount: postData.comment_count || 0,
    isDeleted: postData.is_deleted,
    createdAt: postData.created_at,
    updatedAt: postData.updated_at,
    authorName: postData.users?.name,
    authorAvatar: postData.users?.avatar_url,
    placeName: postData.places?.name,
  };

  // Map nomination
  const nomination: HiddenGemNomination = {
    id: nomData.id,
    placeId: nomData.place_id,
    nominatedBy: nomData.nominated_by,
    postId: nomData.post_id,
    upvoteCount: nomData.upvote_count || 0,
    downvoteCount: nomData.downvote_count || 0,
    status: nomData.status,
    approvedAt: nomData.approved_at,
    createdAt: nomData.created_at,
    placeName: nomData.places?.name,
    nominatorName: nomData.users?.name,
  };

  return { nomination, post };
}

/**
 * Get nominations for a specific place.
 */
export async function getPlaceNominations(placeId: string): Promise<HiddenGemNomination[]> {
  const { data, error } = await supabase
    .from("hidden_gem_nominations")
    .select(`
      *,
      places:place_id (name),
      users:nominated_by (name)
    `)
    .eq("place_id", placeId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((nom: any) => ({
    id: nom.id,
    placeId: nom.place_id,
    nominatedBy: nom.nominated_by,
    postId: nom.post_id,
    upvoteCount: nom.upvote_count || 0,
    downvoteCount: nom.downvote_count || 0,
    status: nom.status,
    approvedAt: nom.approved_at,
    createdAt: nom.created_at,
    placeName: nom.places?.name,
    nominatorName: nom.users?.name,
  }));
}

/**
 * Cast or change a vote on a hidden gem nomination.
 *
 * Calls the `vote_on_hidden_gem` Postgres RPC which atomically:
 *   - Upserts the vote in `hidden_gem_votes` (UNIQUE per user+nomination)
 *   - Handles vote toggles (same value = remove vote)
 *   - Handles vote flips (upvote → downvote)
 *   - Recomputes upvote_count / downvote_count on `hidden_gem_nominations`
 *   - Auto-approves and marks `places.is_hidden_gem = true` via existing trigger
 *
 * Returns the updated nomination row so the caller can refresh UI with
 * authoritative counts rather than relying on optimistic local state.
 */
export async function voteOnNomination(
  nominationId: string,
  userId: string,
  value: 1 | -1
): Promise<HiddenGemNomination> {
  const { data, error } = await supabase.rpc("vote_on_hidden_gem", {
    p_nomination_id: nominationId,
    p_user_id: userId,
    p_value: value,
  });

  if (error) throw new Error(`Vote failed: ${error.message}`);

  const nom = Array.isArray(data) ? data[0] : data;
  if (!nom) throw new Error("No nomination returned from vote RPC");

  return {
    id: nom.id,
    placeId: nom.place_id,
    nominatedBy: nom.nominated_by,
    postId: nom.post_id,
    upvoteCount: nom.upvote_count ?? 0,
    downvoteCount: nom.downvote_count ?? 0,
    status: nom.status,
    approvedAt: nom.approved_at,
    createdAt: nom.created_at,
  };
}

/**
 * Returns the current user's vote value (1, -1) on a nomination,
 * or null if they have not voted.
 */
export async function getUserVoteOnNomination(
  nominationId: string,
  userId: string
): Promise<1 | -1 | null> {
  const { data, error } = await supabase
    .from("hidden_gem_votes")
    .select("value")
    .eq("nomination_id", nominationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return null;
  if (!data) return null;
  return data.value as 1 | -1;
}
