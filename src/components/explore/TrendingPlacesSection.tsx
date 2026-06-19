// ============================================================
// TrendingPlacesSection — Section 2
// Places with highest recent community activity velocity.
// ============================================================
import React from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  Image, StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZE, SPACING, RADIUS, CATEGORY_ICONS } from "@/constants";
import { useTrendingPlaces } from "@/hooks/useExplore";
import { HorizontalCardSkeleton } from "./SectionSkeleton";
import { SectionHeader, EmptyState } from "./TrendingRoutesSection";

export default function TrendingPlacesSection() {
  const router = useRouter();
  const { data = [], isLoading, isError } = useTrendingPlaces(10);

  if (isLoading) {
    return (
      <View style={styles.section}>
        <SectionHeader title="Trending Places" emoji="📍" />
        <HorizontalCardSkeleton count={4} />
      </View>
    );
  }

  if (isError || data.length === 0) {
    return (
      <View style={styles.section}>
        <SectionHeader title="Trending Places" emoji="📍" />
        <EmptyState message="No trending places yet — explore and post!" />
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <SectionHeader title="Trending Places" emoji="📍" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {data.map((place) => (
          <TouchableOpacity
            key={place.id}
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => router.push(`/place/${place.id}` as any)}
          >
            {place.photoUrl ? (
              <Image source={{ uri: place.photoUrl }} style={styles.cardImage} />
            ) : (
              <View style={[styles.cardImage, styles.imageFallback]}>
                <Text style={styles.categoryEmoji}>
                  {CATEGORY_ICONS[place.category] ?? "📍"}
                </Text>
              </View>
            )}
            {/* Hidden gem badge */}
            {place.isHiddenGem && (
              <View style={styles.gemBadge}>
                <Text style={styles.gemText}>💎 Hidden Gem</Text>
              </View>
            )}
            {/* Activity pulse */}
            {place.recentActivity > 0 && (
              <View style={styles.activityDot} />
            )}
            <View style={styles.cardBody}>
              <Text style={styles.placeName} numberOfLines={1}>
                {place.name}
              </Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={10} color={COLORS.starColor} />
                <Text style={styles.ratingText}>{place.rating.toFixed(1)}</Text>
                <Text style={styles.dot}>·</Text>
                <Text style={styles.scoreText}>Score {place.finalScore.toFixed(0)}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: SPACING.xl,
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
  },
  card: {
    width: 155,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardImage: {
    width: "100%",
    height: 105,
  },
  imageFallback: {
    backgroundColor: COLORS.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryEmoji: {
    fontSize: 30,
  },
  gemBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(245,158,11,0.92)",
    borderRadius: RADIUS.full,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  gemText: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "700",
  },
  activityDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
    borderWidth: 1.5,
    borderColor: COLORS.surface,
  },
  cardBody: {
    padding: SPACING.sm,
    gap: 4,
  },
  placeName: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.starColor,
    fontWeight: "600",
  },
  dot: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
  },
  scoreText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
  },
});
