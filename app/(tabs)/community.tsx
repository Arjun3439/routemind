import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { COLORS, FONT_SIZE, SPACING } from "@/constants";
import FeedSection from "@/components/community/FeedSection";
import { useCommunityStore, useAuthStore } from "@/store";
import { useLocationStore } from "@/store";
import { getRankedFeed, getFollowingFeed } from "@/services/community-ranking.service";
import { fetchGoogleReviewPosts, clearGoogleReviewCache } from "@/services/google-reviews.service";
import type { Post, ScoredPost } from "@/types";

type FeedType = "foryou" | "following";

export default function CommunityTab() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { currentLocation, setCurrentLocation, setLocationPermission } = useLocationStore();

  const { 
    forYouFeed, 
    followingFeed, 
    setForYouFeed, 
    setFollowingFeed,
    updatePostInFeeds 
  } = useCommunityStore();

  const [activeFeed, setActiveFeed] = useState<FeedType>("foryou");
  const [loading, setLoading] = useState(true);

  // Request location on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        setLocationPermission(status === "granted" ? "granted" : "denied");

        if (status === "granted" && !currentLocation) {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setCurrentLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
        }
      } catch (e) {
        console.warn("Location request failed:", e);
      }
    })();
  }, []);

  const fetchFeed = useCallback(async (type: FeedType, forceRefresh = false) => {
    setLoading(true);
    try {
      if (type === "foryou") {
        // Fetch both Supabase posts and Google review posts in parallel
        const [supabasePosts, googlePosts] = await Promise.allSettled([
          getRankedFeed(user?.id || "00000000-0000-0000-0000-000000000000", []).catch(() => [] as ScoredPost[]),
          fetchGoogleReviewPosts(
            currentLocation?.latitude,
            currentLocation?.longitude
          ),
        ]);

        const dbPosts: ScoredPost[] = supabasePosts.status === "fulfilled" ? supabasePosts.value : [];
        const reviewPosts: ScoredPost[] = (googlePosts.status === "fulfilled" ? googlePosts.value : [])
          .map((p) => ({ ...p, feedScore: 0 }));

        // Merge and sort by creation date (most recent first)
        const merged: ScoredPost[] = [...dbPosts, ...reviewPosts].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setForYouFeed(merged);
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
  }, [user, currentLocation, setForYouFeed, setFollowingFeed]);

  // Re-fetch when location becomes available or feed tab changes
  useEffect(() => {
    fetchFeed(activeFeed);
  }, [activeFeed, fetchFeed]);

  const handleRefresh = useCallback(() => {
    if (activeFeed === "foryou") {
      clearGoogleReviewCache();
    }
    fetchFeed(activeFeed, true);
  }, [activeFeed, fetchFeed]);

  const handleVoteChange = (postId: string, userVote: 1 | -1 | null, netChange: number) => {
    if (postId.startsWith("google-review-")) return;

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
    <SafeAreaView style={styles.container} edges={["top"]}>
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
        onRefresh={handleRefresh}
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
