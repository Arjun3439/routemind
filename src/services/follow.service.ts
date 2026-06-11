// ============================================================
// RouteMind V3 — Follow Service
// ============================================================
// Manage following users, places, route communities, and lists.
// ============================================================

import { supabase } from "./supabase.client";
import type { FollowTargetType } from "@/types";

export const followService = {
  /**
   * Follow a target.
   */
  async follow(followerId: string, targetType: FollowTargetType, targetId: string): Promise<void> {
    const { error } = await supabase
      .from("follows")
      .insert({
        follower_id: followerId,
        followed_type: targetType,
        followed_id: targetId,
      });

    if (error) {
      // Ignore unique violation if already following
      if (error.code !== "23505") throw error;
    }
  },

  /**
   * Unfollow a target.
   */
  async unfollow(followerId: string, targetType: FollowTargetType, targetId: string): Promise<void> {
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", followerId)
      .eq("followed_type", targetType)
      .eq("followed_id", targetId);

    if (error) throw error;
  },

  /**
   * Check if user is following a target.
   */
  async isFollowing(followerId: string, targetType: FollowTargetType, targetId: string): Promise<boolean> {
    const { count, error } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", followerId)
      .eq("followed_type", targetType)
      .eq("followed_id", targetId);

    if (error) throw error;
    return (count || 0) > 0;
  },

  /**
   * Get total followers for a target.
   */
  async getFollowerCount(targetType: FollowTargetType, targetId: string): Promise<number> {
    const { count, error } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("followed_type", targetType)
      .eq("followed_id", targetId);

    if (error) throw error;
    return count || 0;
  },
};
