import React, { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZE, SPACING, RADIUS } from "@/constants";

// ─── Section Components ───────────────────────────────────────
import TrendingRoutesSection    from "@/components/explore/TrendingRoutesSection";
import TrendingPlacesSection    from "@/components/explore/TrendingPlacesSection";
import TopRatedRoutesSection    from "@/components/explore/TopRatedRoutesSection";
import TrendingTravelersSection from "@/components/explore/TrendingTravelersSection";
import HiddenGemsSection        from "@/components/explore/HiddenGemsSection";
import PopularListsSection      from "@/components/explore/PopularListsSection";
import CommunityFavoritesSection from "@/components/explore/CommunityFavoritesSection";
import NewDiscoveriesSection    from "@/components/explore/NewDiscoveriesSection";
import LeaderboardSection       from "@/components/explore/LeaderboardSection";

// ─── Category filter tabs (decorative — for future filtering) ─

const CATEGORIES = [
  { label: "All",         emoji: "✨" },
  { label: "Routes",      emoji: "🛣️" },
  { label: "Food",        emoji: "🍜" },
  { label: "Hidden Gems", emoji: "💎" },
  { label: "Photography", emoji: "📸" },
  { label: "Coffee",      emoji: "☕" },
  { label: "Nature",      emoji: "🌿" },
];

export default function ExploreTab() {
  const router = useRouter();
  const scrollY = useRef(new Animated.Value(0)).current;

  // Parallax header opacity
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Sticky top bar ── */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topBarTitle}>Explore</Text>
          <Animated.Text style={[styles.topBarSub, { opacity: headerOpacity }]}>
            Discover South India & Sri Lanka
          </Animated.Text>
        </View>
        <TouchableOpacity
          style={styles.searchBtn}
          onPress={() => router.push("/search")}
        >
          <Ionicons name="search-outline" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* ── Category filter row ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRow}
        style={styles.categoryScroll}
      >
        {CATEGORIES.map((cat, idx) => (
          <TouchableOpacity
            key={cat.label}
            style={[
              styles.categoryChip,
              idx === 0 && styles.categoryChipActive,
            ]}
          >
            <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
            <Text
              style={[
                styles.categoryText,
                idx === 0 && styles.categoryTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Main scroll content ── */}
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* 
          Each section is fully independent.
          One failing will never crash or block the others.
          Sections render in priority order per spec.
        */}

        {/* 1. Trending Routes */}
        <TrendingRoutesSection />

        {/* 2. Trending Places */}
        <TrendingPlacesSection />

        {/* 3. Top Rated Routes */}
        <TopRatedRoutesSection />

        {/* 4. Trending Travelers */}
        <TrendingTravelersSection />

        {/* 5. Hidden Gems */}
        <HiddenGemsSection />

        {/* 6. Popular Lists */}
        <PopularListsSection />

        {/* 7. Community Favorites */}
        <CommunityFavoritesSection />

        {/* 8. New Discoveries */}
        <NewDiscoveriesSection />

        {/* 9. Leaderboard (embedded) */}
        <View style={styles.leaderboardWrapper}>
          <LeaderboardSection />
        </View>

        {/* Bottom padding for tab bar */}
        <View style={styles.bottomSpacer} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Sticky header
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
    backgroundColor: COLORS.background,
  },
  topBarTitle: {
    fontSize: FONT_SIZE["3xl"],
    fontWeight: "800",
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  topBarSub: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // Category filter
  categoryScroll: {
    flexGrow: 0,
    backgroundColor: COLORS.background,
  },
  categoryRow: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryChipActive: {
    backgroundColor: `${COLORS.primary}20`,
    borderColor: COLORS.primary,
  },
  categoryEmoji: { fontSize: 13 },
  categoryText: {
    color: COLORS.textSecondary,
    fontWeight: "600",
    fontSize: FONT_SIZE.sm,
  },
  categoryTextActive: {
    color: COLORS.primary,
  },

  // Scroll content
  scrollContent: {
    paddingTop: SPACING.sm,
  },
  leaderboardWrapper: {
    // LeaderboardSection has its own horizontal margin
  },
  bottomSpacer: {
    height: 100,
  },
});
