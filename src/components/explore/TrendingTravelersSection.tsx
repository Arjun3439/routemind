// ============================================================
// TrendingTravelersSection — Section 4
// Users with highest recent XP/activity gain (last 7 days).
// ============================================================
import React from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  Image, StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZE, SPACING, RADIUS } from "@/constants";
import { useTrendingTravelers } from "@/hooks/useExplore";
import { TravelerSkeleton } from "./SectionSkeleton";
import { SectionHeader, EmptyState } from "./TrendingRoutesSection";

const LEVEL_COLORS: Record<string, string> = {
  traveler:  "#94a3b8",
  explorer:  "#60a5fa",
  guide:     "#34d399",
  expert:    "#f59e0b",
  legend:    "#e11d48",
};

const LEVEL_EMOJI: Record<string, string> = {
  traveler: "🧳",
  explorer: "🌍",
  guide:    "🗺️",
  expert:   "🏅",
  legend:   "👑",
};

export default function TrendingTravelersSection() {
  const router = useRouter();
  const { data = [], isLoading, isError } = useTrendingTravelers(10);

  if (isLoading) {
    return (
      <View style={styles.section}>
        <SectionHeader title="Trending Travelers" emoji="✈️" />
        <TravelerSkeleton count={5} />
      </View>
    );
  }

  if (isError || data.length === 0) {
    return (
      <View style={styles.section}>
        <SectionHeader title="Trending Travelers" emoji="✈️" />
        <EmptyState message="No trending travelers yet!" />
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <SectionHeader title="Trending Travelers" emoji="✈️" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {data.map((traveler, idx) => {
          const levelColor = LEVEL_COLORS[traveler.level] ?? COLORS.textSecondary;
          const levelEmoji = LEVEL_EMOJI[traveler.level] ?? "🧳";
          return (
            <TouchableOpacity
              key={traveler.userId}
              style={styles.card}
              activeOpacity={0.82}
              onPress={() => router.push(`/profile/${traveler.userId}` as any)}
            >
              {/* Rank dot for top 3 */}
              {idx < 3 && (
                <View style={[styles.rankDot, { backgroundColor: levelColor }]}>
                  <Text style={styles.rankText}>#{idx + 1}</Text>
                </View>
              )}

              {/* Avatar */}
              <View style={[styles.avatarRing, { borderColor: levelColor }]}>
                {traveler.avatarUrl ? (
                  <Image
                    source={{ uri: traveler.avatarUrl }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Ionicons name="person" size={26} color={COLORS.textSecondary} />
                  </View>
                )}
              </View>

              <Text style={styles.name} numberOfLines={1}>
                {traveler.userName.split(" ")[0]}
              </Text>

              {/* Level badge */}
              <View style={[styles.levelBadge, { backgroundColor: levelColor + "25" }]}>
                <Text style={styles.levelEmoji}>{levelEmoji}</Text>
                <Text style={[styles.levelText, { color: levelColor }]}>
                  {traveler.level}
                </Text>
              </View>

              {/* Headline stat */}
              <Text style={styles.stat}>
                {traveler.recentPosts > 0
                  ? `+${traveler.recentPosts} posts`
                  : `${traveler.xpPoints.toLocaleString()} xp`}
              </Text>

              {traveler.hiddenGems > 0 && (
                <Text style={styles.gems}>💎 {traveler.hiddenGems}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: SPACING.xl },
  listContent: { paddingHorizontal: SPACING.md, gap: SPACING.md },
  card: {
    width: 90,
    alignItems: "center",
    gap: 5,
  },
  rankDot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  rankText: { color: "#fff", fontSize: 8, fontWeight: "800" },
  avatarRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2.5,
    padding: 2,
    overflow: "hidden",
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 100,
  },
  avatarFallback: {
    backgroundColor: COLORS.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
  },
  name: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    borderRadius: RADIUS.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  levelEmoji: { fontSize: 9 },
  levelText: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  stat: {
    fontSize: 9,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  gems: {
    fontSize: 9,
    color: COLORS.accent,
    fontWeight: "600",
  },
});
