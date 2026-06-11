import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator, TextInput, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZE, SPACING, RADIUS } from "@/constants";
import { communityService } from "@/services/community.service";
import { useAuthStore, useCommunityStore } from "@/store";
import PostCard from "@/components/community/PostCard";
import type { Post, Comment as CommentType } from "@/types";

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const updatePostInFeeds = useCommunityStore(s => s.updatePostInFeeds);

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<CommentType[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchPostAndComments();
  }, [id, user]);

  const fetchPostAndComments = async () => {
    try {
      const fetchedPost = await communityService.getPostById(id, user?.id);
      setPost(fetchedPost);
      
      const fetchedComments = await communityService.getCommentsForPost(id, user?.id);
      setComments(fetchedComments);
    } catch (e) {
      console.error("Failed to load post detail:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleVoteChange = (postId: string, userVote: 1 | -1 | null, netChange: number) => {
    if (!post) return;
    
    const newUpvoteCount = post.upvoteCount + (userVote === 1 ? 1 : 0) - (post.userVote === 1 && userVote !== 1 ? 1 : 0);
    const newDownvoteCount = post.downvoteCount + (userVote === -1 ? 1 : 0) - (post.userVote === -1 && userVote !== -1 ? 1 : 0);

    const updatedPost = {
      ...post,
      userVote,
      upvoteCount: Math.max(0, newUpvoteCount),
      downvoteCount: Math.max(0, newDownvoteCount),
    };

    setPost(updatedPost);
    updatePostInFeeds(updatedPost); // Sync with store feeds
  };

  const handleComment = async () => {
    if (!user) return router.push("/(auth)/welcome");
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      await communityService.createComment(id, user.id, newComment.trim());
      setNewComment("");
      // Refresh comments
      const fetchedComments = await communityService.getCommentsForPost(id, user.id);
      setComments(fetchedComments);
      
      // Update post comment count optimistically
      if (post) {
        const updatedPost = { ...post, commentCount: post.commentCount + 1 };
        setPost(updatedPost);
        updatePostInFeeds(updatedPost);
      }
    } catch (e) {
      console.error("Failed to post comment:", e);
    } finally {
      setSubmitting(false);
    }
  };

  const renderComment = (c: CommentType) => (
    <View key={c.id} style={[styles.commentCard, { marginLeft: (c.depth || 0) * SPACING.md }]}>
      <View style={styles.commentHeader}>
        <Text style={styles.commentAuthor}>{c.authorName || "Traveler"}</Text>
        <Text style={styles.commentTime}>• Just now</Text>
      </View>
      <Text style={styles.commentBody}>{c.body}</Text>
      
      {c.replies && c.replies.length > 0 && (
        <View style={styles.repliesContainer}>
          {c.replies.map(renderComment)}
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Post not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <PostCard post={post} onVoteChange={handleVoteChange} />
        
        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>{post.commentCount} Comments</Text>
          {comments.map(renderComment)}
        </View>
      </ScrollView>

      {/* Comment Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Add a comment..."
          placeholderTextColor={COLORS.textSecondary}
          value={newComment}
          onChangeText={setNewComment}
          multiline
        />
        <TouchableOpacity 
          style={[styles.sendButton, (!newComment.trim() || submitting) && styles.sendButtonDisabled]}
          onPress={handleComment}
          disabled={!newComment.trim() || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  errorText: {
    textAlign: "center",
    marginTop: 100,
    color: COLORS.textSecondary,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 100,
  },
  commentsSection: {
    marginTop: SPACING.lg,
  },
  commentsTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  commentCard: {
    marginBottom: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  commentAuthor: {
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginRight: SPACING.xs,
  },
  commentTime: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.xs,
  },
  commentBody: {
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  repliesContainer: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    maxHeight: 100,
    marginRight: SPACING.sm,
    color: COLORS.textPrimary,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
