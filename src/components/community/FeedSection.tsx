import { View, FlatList, ActivityIndicator, StyleSheet, Text } from "react-native";
import { COLORS, SPACING, FONT_SIZE } from "@/constants";
import type { Post } from "@/types";
import PostCard from "./PostCard";

interface FeedSectionProps {
  posts: Post[];
  loading: boolean;
  onRefresh?: () => void;
  onEndReached?: () => void;
  emptyMessage?: string;
  onVoteChange?: (postId: string, userVote: 1 | -1 | null, netChange: number) => void;
}

export default function FeedSection({
  posts,
  loading,
  onRefresh,
  onEndReached,
  emptyMessage = "No posts found.",
  onVoteChange,
}: FeedSectionProps) {
  if (loading && posts.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!loading && posts.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <PostCard post={item} onVoteChange={onVoteChange} />
      )}
      contentContainerStyle={styles.listContent}
      onRefresh={onRefresh}
      refreshing={loading && posts.length > 0}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: SPACING.md,
    paddingBottom: 100, // padding for bottom tab bar
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.xl,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.base,
    textAlign: "center",
  },
});
