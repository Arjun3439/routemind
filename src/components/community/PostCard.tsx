import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZE, RADIUS, SPACING } from "@/constants";
import type { Post } from "@/types";
import VoteButtons from "./VoteButtons";
import { useAuthStore } from "@/store";
import { communityService } from "@/services/community.service";

interface PostCardProps {
  post: Post;
  onVoteChange?: (postId: string, userVote: 1 | -1 | null, netChange: number) => void;
  compact?: boolean;
}

export default function PostCard({ post, onVoteChange, compact = false }: PostCardProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const handleVote = async (value: 1 | -1) => {
    if (!user) return router.push("/(auth)/sign-in");
    try {
      await communityService.vote(user.id, "post", post.id, value);
      // Optimistic update
      const change = post.userVote === value ? 0 : post.userVote ? value * 2 : value;
      onVoteChange?.(post.id, value, change);
    } catch (e) {
      console.error("Vote failed:", e);
    }
  };

  const handleRemoveVote = async () => {
    if (!user || !post.userVote) return;
    try {
      await communityService.removeVote(user.id, "post", post.id);
      onVoteChange?.(post.id, null, -post.userVote);
    } catch (e) {
      console.error("Remove vote failed:", e);
    }
  };

  const navigateToDetail = () => {
    router.push(`/post/${post.id}`);
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? "star" : i - 0.5 <= rating ? "star-half" : "star-outline"}
          size={14}
          color={COLORS.starColor}
        />
      );
    }
    return <View style={styles.starsRow}>{stars}</View>;
  };

  const renderBadge = () => {
    switch (post.type) {
      case "hidden_gem_nomination":
        return <View style={[styles.badge, { backgroundColor: COLORS.secondary }]}><Text style={styles.badgeText}>💎 Hidden Gem</Text></View>;
      case "travel_story":
        return <View style={[styles.badge, { backgroundColor: COLORS.primary }]}><Text style={styles.badgeText}>📖 Story</Text></View>;
      case "route_post":
        return <View style={[styles.badge, { backgroundColor: COLORS.success }]}><Text style={styles.badgeText}>🛣️ Route Update</Text></View>;
      case "google_review":
        return <View style={[styles.badge, { backgroundColor: COLORS.accent }]}><Text style={styles.badgeText}>⭐ Google Review</Text></View>;
      default:
        return null;
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.card, compact && styles.cardCompact]} 
      onPress={navigateToDetail}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <View style={styles.authorRow}>
          <View style={styles.avatar}>
            {post.authorAvatar ? (
              <Image source={{ uri: post.authorAvatar }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={16} color={COLORS.textSecondary} />
            )}
          </View>
          <View>
            <Text style={styles.authorName}>{post.authorName || "Traveler"}</Text>
            {post.authorEmail ? (
              <Text style={styles.authorEmailText}>{post.authorEmail}</Text>
            ) : null}
            <Text style={styles.timeAgo}>{timeAgo(post.createdAt)}</Text>
          </View>
        </View>
        {renderBadge()}
      </View>

      <Text style={styles.title}>{post.title}</Text>

      {post.type === "google_review" && post.rating != null && (
        <View style={styles.ratingRow}>
          {renderStars(post.rating)}
          <Text style={styles.ratingText}>{post.rating.toFixed(1)}</Text>
        </View>
      )}
      
      {!compact && post.body && (
        <Text style={styles.body} numberOfLines={3}>
          {post.body}
        </Text>
      )}

      {!compact && post.mediaUrls && post.mediaUrls.length > 0 && (
        <Image source={{ uri: post.mediaUrls[0] }} style={styles.image} />
      )}

      {post.placeName && (
        <View style={styles.locationRow}>
          <Ionicons name="location" size={14} color={COLORS.primary} />
          <Text style={styles.locationText}>{post.placeName}</Text>
        </View>
      )}

      {post.routeName && (
        <View style={styles.locationRow}>
          <Ionicons name="map" size={14} color={COLORS.primary} />
          <Text style={styles.locationText}>{post.routeName}</Text>
        </View>
      )}

      <View style={styles.footer}>
        <VoteButtons
          upvotes={post.upvoteCount}
          downvotes={post.downvoteCount}
          userVote={post.userVote || null}
          targetType="post"
          targetId={post.id}
          onVote={handleVote}
          onRemoveVote={handleRemoveVote}
          size={compact ? "small" : "medium"}
        />
        
        <View style={styles.commentBtn}>
          <Ionicons name="chatbubble-outline" size={compact ? 18 : 20} color={COLORS.textSecondary} />
          <Text style={styles.commentCount}>{post.commentCount}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardCompact: {
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  authorName: {
    color: COLORS.textPrimary,
    fontWeight: "600",
    fontSize: FONT_SIZE.sm,
  },
  authorEmailText: {
    color: COLORS.textSecondary,
    fontSize: 10,
    marginTop: 1,
  },
  timeAgo: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.xs,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
    marginBottom: SPACING.xs,
  },
  body: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.base,
    lineHeight: 22,
    marginBottom: SPACING.sm,
  },
  image: {
    width: "100%",
    height: 200,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    alignSelf: "flex-start",
  },
  locationText: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  commentBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 8,
  },
  commentCount: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
  },
  starsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  ratingText: {
    color: COLORS.starColor,
    fontSize: FONT_SIZE.sm,
    fontWeight: "700",
  },
});
