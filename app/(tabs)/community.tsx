import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZE, SPACING, RADIUS } from "@/constants";
import FeedSection from "@/components/community/FeedSection";
import { useCommunityStore, useAuthStore } from "@/store";
import { getRankedFeed, getFollowingFeed } from "@/services/community-ranking.service";
import type { Post } from "@/types";

type FeedType = "foryou" | "following";

export default function CommunityTab() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  
  const { 
    forYouFeed, 
    followingFeed, 
    setForYouFeed, 
    setFollowingFeed,
    updatePostInFeeds 
  } = useCommunityStore();

  const [activeFeed, setActiveFeed] = useState<FeedType>("foryou");
  const [loading, setLoading] = useState(true);

  const fetchFeed = useCallback(async (type: FeedType) => {
    setLoading(true);
    try {
      if (type === "foryou") {
        // Mock active route for now, could be pulled from route store
        const posts = await getRankedFeed(user?.id || "anonymous", []);
        setForYouFeed(posts);
      } else if (type === "following") {
        if (!user) {
          setFollowingFeed([]);
        } else {
          const posts = await getFollowingFeed(user.id);
          setFollowingFeed(posts);
        }
      }
    } catch (e) {
      console.error(`Failed to fetch ${type} feed:`, e);
    } finally {
      setLoading(false);
    }
  }, [user, setForYouFeed, setFollowingFeed]);

  useEffect(() => {
    fetchFeed(activeFeed);
  }, [activeFeed, fetchFeed]);

  const handleVoteChange = (postId: string, userVote: 1 | -1 | null, netChange: number) => {
    // Optimistic update logic
    const updateTarget = (posts: Post[]) => {
      const post = posts.find(p => p.id === postId);
      if (!post) return null;
      
      const newUpvoteCount = post.upvoteCount + (userVote === 1 ? 1 : 0) - (post.userVote === 1 && userVote !== 1 ? 1 : 0);
      const newDownvoteCount = post.downvoteCount + (userVote === -1 ? 1 : 0) - (post.userVote === -1 && userVote !== -1 ? 1 : 0);

      return {
        ...post,
        userVote,
        upvoteCount: Math.max(0, newUpvoteCount),
        downvoteCount: Math.max(0, newDownvoteCount),
      };
    };

    const updatedForYou = updateTarget(forYouFeed);
    if (updatedForYou) updatePostInFeeds(updatedForYou);

    const updatedFollowing = updateTarget(followingFeed);
    if (updatedFollowing) updatePostInFeeds(updatedFollowing);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Community</Text>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => router.push("/post/create")}
        >
          <Ionicons name="pencil" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeFeed === "foryou" && styles.activeTab]}
          onPress={() => setActiveFeed("foryou")}
        >
          <Text style={[styles.tabText, activeFeed === "foryou" && styles.activeTabText]}>
            For You
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeFeed === "following" && styles.activeTab]}
          onPress={() => setActiveFeed("following")}
        >
          <Text style={[styles.tabText, activeFeed === "following" && styles.activeTabText]}>
            Following
          </Text>
        </TouchableOpacity>
      </View>

      {/* Feed Content */}
      <FeedSection
        posts={activeFeed === "foryou" ? forYouFeed : followingFeed}
        loading={loading}
        onRefresh={() => fetchFeed(activeFeed)}
        onVoteChange={handleVoteChange}
        emptyMessage={
          activeFeed === "foryou" 
            ? "No posts to show right now." 
            : "Follow travelers, places, and routes to see updates here."
        }
      />
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  createButton: {
    backgroundColor: COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: FONT_SIZE.base,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  activeTabText: {
    color: COLORS.primary,
  },
});
