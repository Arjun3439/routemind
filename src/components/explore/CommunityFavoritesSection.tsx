// ============================================================
// CommunityFavoritesSection — Section 7
// Highest-scored places by place_trust_scores.final_score.
// ============================================================
import React from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  Image, StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZE, SPACING, RADIUS, CATEGORY_ICONS } from "@/constants";
import { useCommunityFavoritePlaces } from "@/hooks/useExplore";
import { HorizontalCardSkeleton } from "./SectionSkeleton";
import { SectionHeader, EmptyState } from "./TrendingRoutesSection";

export default function CommunityFavoritesSection() {
  const router = useRouter();
  const { data = [], isLoading, isError } = useCommunityFavoritePlaces(10);

  if (isLoading) {
    return (
      <View style={styles.section}>
        <SectionHeader title="Community Favorites" emoji="❤️" />
        <HorizontalCardSkeleton count={4} />
      </View>
    );
  }

  if (isError || data.length === 0) {
    return (
      <View style={styles.section}>
        <SectionHeader title="Community Favorites" emoji="❤️" />
        <EmptyState message="Community scores loading soon!" />
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <SectionHeader title="Community Favorites" emoji="❤️" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {data.map((place, idx) => (
          <TouchableOpacity
            key={place.id}
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => router.push(`/place/${place.id}` as any)}
          >
            {/* Photo or fallback */}
            {place.photoUrl ? (
              <Image source={{ uri: place.photoUrl }} style={styles.cardImage} />
            ) : (
              <View style={[styles.cardImage, styles.imageFallback]}>
                <Text style={styles.categoryEmoji}>
                  {CATEGORY_ICONS[place.category] ?? "📍"}
                </Text>
              </View>
            )}

            {/* Trust score badge */}
            <View style={styles.trustBadge}>
              <Ionicons name="shield-checkmark" size={9} color="#fff" />
              <Text style={styles.trustText}>{place.finalScore.toFixed(0)}</Text>
            </View>

            {/* Rank */}
            {idx < 3 && (
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>
                  {idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}
                </Text>
              </View>
            )}

            <View style={styles.cardBody}>
              <Text style={styles.placeName} numberOfLines={1}>
                {place.name}
              </Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={10} color={COLORS.starColor} />
                <Text style={styles.ratingText}>{place.rating.toFixed(1)}</Text>
                <Text style={styles.dot}>·</Text>
                <Text style={styles.tipText}>
                  {place.tipCount} {place.tipCount === 1 ? "tip" : "tips"}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: SPACING.xl },
  listContent: { paddingHorizontal: SPACING.md, gap: SPACING.md },
  card: {
    width: 155,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardImage: { width: "100%", height: 105 },
  imageFallback: {
    backgroundColor: COLORS.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryEmoji: { fontSize: 30 },
  trustBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: `${COLORS.primary}CC`,
    borderRadius: RADIUS.full,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  trustText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  rankBadge: {
    position: "absolute",
    top: 8,
    left: 8,
  },
  rankText: { fontSize: 18 },
  cardBody: { padding: SPACING.sm, gap: 4 },
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
  dot: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs },
  tipText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
  },
});
