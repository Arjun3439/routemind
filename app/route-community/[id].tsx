import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Image } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZE, SPACING, RADIUS } from "@/constants";
import { useAuthStore } from "@/store";
import { supabase } from "@/services/supabase.client";
import { getRouteReputationScores } from "@/services/route-reputation.service";
import ReputationRadar from "@/components/community/ReputationRadar";
import FeedSection from "@/components/community/FeedSection";
import type { RouteCommunity, RouteReputationScores, Post } from "@/types";

export default function RouteCommunityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore(s => s.user);

  const [routeData, setRouteData] = useState<RouteCommunity | null>(null);
  const [reputation, setReputation] = useState<RouteReputationScores | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"feed" | "reputation" | "live">("feed");

  useEffect(() => {
    if (!id) return;
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // 1. Fetch Route
      const { data: route } = await supabase
        .from("route_communities")
        .select("*")
        .eq("id", id)
        .single();
        
      if (route) {
        setRouteData({
          id: route.id,
          slug: route.slug,
          originLabel: route.origin_label,
          destinationLabel: route.destination_label,
          description: route.description,
          coverImageUrl: route.cover_image_url,
          memberCount: route.member_count,
          postCount: route.post_count,
          createdAt: route.created_at,
        });
      }

      // 2. Fetch Reputation
      const rep = await getRouteReputationScores(id);
      setReputation(rep);

      // 3. Fetch Posts
      const { data: routePosts } = await supabase
        .from("posts")
        .select(`
          *,
          users:author_id (name, avatar_url),
          places:place_id (name)
        `)
        .eq("route_community_id", id)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(20);

      if (routePosts) {
        setPosts(routePosts.map((p: any) => ({
          id: p.id,
          authorId: p.author_id,
          type: p.type,
          placeId: p.place_id,
          routeCommunityId: p.route_community_id,
          title: p.title,
          body: p.body,
          mediaUrls: p.media_urls || [],
          upvoteCount: p.upvote_count || 0,
          downvoteCount: p.downvote_count || 0,
          commentCount: p.comment_count || 0,
          isDeleted: p.is_deleted,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
          authorName: p.users?.name,
          authorAvatar: p.users?.avatar_url,
          placeName: p.places?.name,
        })));
      }
    } catch (e) {
      console.error("Failed to load route community:", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  if (!routeData) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Route Community not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {routeData.originLabel} → {routeData.destinationLabel}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Cover Image */}
        {routeData.coverImageUrl ? (
          <Image source={{ uri: routeData.coverImageUrl }} style={styles.coverImage} />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Ionicons name="map" size={48} color={COLORS.primary} />
          </View>
        )}

        <View style={styles.infoSection}>
          <Text style={styles.routeName}>{routeData.originLabel} to {routeData.destinationLabel}</Text>
          <Text style={styles.routeStats}>
            <Ionicons name="people" size={14} /> {routeData.memberCount} Members • {routeData.postCount} Posts
          </Text>
          
          <TouchableOpacity style={styles.joinButton}>
            <Text style={styles.joinButtonText}>Join Community</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {(["feed", "reputation", "live"] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab === "feed" && "Feed"}
                {tab === "reputation" && "Reputation"}
                {tab === "live" && "Live Updates"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        {activeTab === "feed" && (
          <FeedSection 
            posts={posts} 
            loading={loading} 
            emptyMessage="No posts in this route community yet." 
          />
        )}

        {activeTab === "reputation" && (
          <View style={styles.contentPad}>
            {reputation ? (
              <ReputationRadar scores={reputation} />
            ) : (
              <Text style={styles.emptyText}>Not enough data to compute reputation yet.</Text>
            )}
          </View>
        )}

        {activeTab === "live" && (
          <View style={styles.contentPad}>
            <View style={styles.placeholderContainer}>
              <Text style={styles.placeholderEmoji}>📡</Text>
              <Text style={styles.placeholderText}>No active live updates for this route.</Text>
              <TouchableOpacity 
                style={styles.primaryBtn} 
                onPress={() => router.push(`/post/create?type=route_post&routeId=${routeData.id}`)}
              >
                <Text style={styles.primaryBtnText}>Report an issue</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Floating Create Post Button */}
      {activeTab === "feed" && (
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => router.push(`/post/create?type=route_post&routeId=${routeData.id}`)}
        >
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>
      )}
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
  },
  iconButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: FONT_SIZE.base,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  errorText: {
    textAlign: "center",
    marginTop: 100,
    color: COLORS.textSecondary,
  },
  coverImage: {
    width: "100%",
    height: 180,
  },
  coverPlaceholder: {
    width: "100%",
    height: 180,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
  },
  infoSection: {
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  routeName: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  routeStats: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  joinButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    alignItems: "center",
  },
  joinButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: FONT_SIZE.base,
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
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
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.primary,
  },
  contentPad: {
    padding: SPACING.md,
  },
  emptyText: {
    textAlign: "center",
    color: COLORS.textSecondary,
    marginTop: SPACING.xl,
  },
  fab: {
    position: "absolute",
    bottom: SPACING.xl,
    right: SPACING.lg,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  placeholderContainer: {
    alignItems: "center",
    paddingVertical: SPACING["2xl"],
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: "dashed",
    marginTop: SPACING.md,
  },
  placeholderEmoji: {
    fontSize: 32,
    marginBottom: SPACING.sm,
  },
  placeholderText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.base,
    marginBottom: SPACING.md,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
});
