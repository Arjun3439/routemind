// ============================================================
// RouteMind V3 — Community Service
// ============================================================
// Core CRUD operations for the Community Tab.
// ============================================================

import { supabase } from "./supabase.client";
import type { Post, Comment, PostType } from "@/types";

export const communityService = {
  // ─── Posts ──────────────────────────────────────────────────

  async createPost(
    authorId: string,
    type: PostType,
    title: string,
    body: string,
    mediaUrls: string[] = [],
    placeId?: string,
    routeCommunityId?: string
  ): Promise<Post> {
    const { data, error } = await supabase
      .from("posts")
      .insert({
        author_id: authorId,
        type,
        title,
        body,
        media_urls: mediaUrls,
        place_id: placeId,
        route_community_id: routeCommunityId,
      })
      .select(`
        *,
        users:author_id (name, email, avatar_url),
        places:place_id (name)
      `)
      .single();

    if (error) throw error;
    return mapPost(data);
  },

  async getPostById(postId: string, userId?: string): Promise<Post | null> {
    const { data, error } = await supabase
      .from("posts")
      .select(`
        *,
        users:author_id (name, email, avatar_url),
        places:place_id (name)
      `)
      .eq("id", postId)
      .eq("is_deleted", false)
      .single();

    if (error || !data) return null;

    let userVote: 1 | -1 | null = null;
    if (userId) {
      const { data: voteData } = await supabase
        .from("votes")
        .select("value")
        .eq("target_type", "post")
        .eq("target_id", postId)
        .eq("user_id", userId)
        .single();
      if (voteData) userVote = voteData.value as 1 | -1;
    }

    return { ...mapPost(data), userVote };
  },

  async deletePost(postId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from("posts")
      .update({ is_deleted: true })
      .eq("id", postId)
      .eq("author_id", userId);
    if (error) throw error;
  },

  // ─── Comments ───────────────────────────────────────────────

  async getCommentsForPost(postId: string, userId?: string): Promise<Comment[]> {
    const { data, error } = await supabase
      .from("comments")
      .select(`
        *,
        users:author_id (name, email, avatar_url)
      `)
      .eq("post_id", postId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) return [];

    // Map votes if userId provided
    const comments = data.map(mapComment);

    if (userId) {
      const commentIds = comments.map(c => c.id);
      const { data: votes } = await supabase
        .from("votes")
        .select("target_id, value")
        .eq("target_type", "comment")
        .eq("user_id", userId)
        .in("target_id", commentIds);

      if (votes) {
        const voteMap = new Map(votes.map(v => [v.target_id, v.value]));
        comments.forEach(c => {
          c.userVote = voteMap.get(c.id) as 1 | -1 | undefined || null;
        });
      }
    }

    return buildCommentTree(comments);
  },

  async createComment(
    postId: string,
    authorId: string,
    body: string,
    parentCommentId?: string
  ): Promise<Comment> {
    const { data, error } = await supabase
      .from("comments")
      .insert({
        post_id: postId,
        author_id: authorId,
        body,
        parent_comment_id: parentCommentId,
      })
      .select(`
        *,
        users:author_id (name, email, avatar_url)
      `)
      .single();

    if (error) throw error;
    return mapComment(data);
  },

  // ─── Voting ─────────────────────────────────────────────────

  async vote(
    userId: string,
    targetType: "post" | "comment",
    targetId: string,
    value: 1 | -1
  ): Promise<void> {
    // Upsert vote
    const { error } = await supabase
      .from("votes")
      .upsert(
        { user_id: userId, target_type: targetType, target_id: targetId, value },
        { onConflict: "user_id,target_type,target_id" }
      );
    if (error) throw error;
  },

  async removeVote(
    userId: string,
    targetType: "post" | "comment",
    targetId: string
  ): Promise<void> {
    const { error } = await supabase
      .from("votes")
      .delete()
      .eq("user_id", userId)
      .eq("target_type", targetType)
      .eq("target_id", targetId);
    if (error) throw error;
  },
};

// ─── Helpers ──────────────────────────────────────────────────

function mapPost(data: any): Post {
  return {
    id: data.id,
    authorId: data.author_id,
    type: data.type,
    placeId: data.place_id,
    tripId: data.trip_id,
    routeCommunityId: data.route_community_id,
    title: data.title,
    body: data.body,
    mediaUrls: data.media_urls || [],
    upvoteCount: data.upvote_count || 0,
    downvoteCount: data.downvote_count || 0,
    commentCount: data.comment_count || 0,
    isDeleted: data.is_deleted,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    authorName: data.users?.name,
    authorEmail: data.users?.email,
    authorAvatar: data.users?.avatar_url,
    placeName: data.places?.name,
  };
}

function mapComment(data: any): Comment {
  return {
    id: data.id,
    postId: data.post_id,
    authorId: data.author_id,
    parentCommentId: data.parent_comment_id,
    body: data.body,
    upvoteCount: data.upvote_count || 0,
    downvoteCount: data.downvote_count || 0,
    isDeleted: data.is_deleted,
    createdAt: data.created_at,
    authorName: data.users?.name,
    authorEmail: data.users?.email,
    authorAvatar: data.users?.avatar_url,
    replies: [],
    depth: 0,
  };
}

function buildCommentTree(flatComments: Comment[]): Comment[] {
  const commentMap = new Map<string, Comment>();
  const rootComments: Comment[] = [];

  // First pass: put all in map
  flatComments.forEach(c => commentMap.set(c.id, { ...c, replies: [] }));

  // Second pass: link children to parents
  flatComments.forEach(c => {
    const node = commentMap.get(c.id)!;
    if (c.parentCommentId && commentMap.has(c.parentCommentId)) {
      const parent = commentMap.get(c.parentCommentId)!;
      node.depth = (parent.depth || 0) + 1;
      parent.replies!.push(node);
    } else {
      rootComments.push(node);
    }
  });

  return rootComments;
}
