// ============================================================
// NewDiscoveriesSection — Section 8
// Recently added places with low post history — fresh finds.
// ============================================================
import React from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  Image, StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZE, SPACING, RADIUS, CATEGORY_ICONS } from "@/constants";
import { useNewDiscoveries } from "@/hooks/useExplore";
import { HorizontalCardSkeleton } from "./SectionSkeleton";
import { SectionHeader, EmptyState } from "./TrendingRoutesSection";

// Human-readable time-ago helper
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d} days ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

export default function NewDiscoveriesSection() {
  const router = useRouter();
  const { data = [], isLoading, isError } = useNewDiscoveries(10);

  if (isLoading) {
    return (
      <View style={styles.section}>
        <SectionHeader title="New Discoveries" emoji="🌟" />
        <HorizontalCardSkeleton count={4} />
      </View>
    );
  }

  if (isError || data.length === 0) {
    return (
      <View style={styles.section}>
        <SectionHeader title="New Discoveries" emoji="🌟" />
        <EmptyState message="No new places discovered yet!" />
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <SectionHeader title="New Discoveries" emoji="🌟" />
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

            {/* "NEW" badge */}
            <View style={styles.newBadge}>
              <Text style={styles.newText}>NEW</Text>
            </View>

            {/* Be first badge */}
            {place.tipCount === 0 && (
              <View style={styles.firstBadge}>
                <Text style={styles.firstText}>Be the first!</Text>
              </View>
            )}

            <View style={styles.cardBody}>
              <Text style={styles.placeName} numberOfLines={1}>
                {place.name}
              </Text>
              <View style={styles.metaRow}>
                <Ionicons name="time-outline" size={10} color={COLORS.textMuted} />
                <Text style={styles.metaText}>{timeAgo(place.createdAt)}</Text>
                {place.rating > 0 && (
                  <>
                    <Text style={styles.dot}>·</Text>
                    <Ionicons name="star" size={10} color={COLORS.starColor} />
                    <Text style={styles.ratingText}>{place.rating.toFixed(1)}</Text>
                  </>
                )}
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
    borderColor: `${COLORS.secondary}40`,
  },
  cardImage: { width: "100%", height: 105 },
  imageFallback: {
    backgroundColor: COLORS.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryEmoji: { fontSize: 30 },
  newBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: COLORS.secondary,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  newText: { color: "#fff", fontSize: 8, fontWeight: "800", letterSpacing: 0.5 },
  firstBadge: {
    position: "absolute",
    bottom: 52,
    left: 8,
    right: 8,
    backgroundColor: "rgba(6,182,212,0.2)",
    borderRadius: RADIUS.sm,
    paddingVertical: 3,
    alignItems: "center",
    borderWidth: 1,
    borderColor: `${COLORS.secondary}60`,
  },
  firstText: { color: COLORS.secondary, fontSize: 9, fontWeight: "700" },
  cardBody: { padding: SPACING.sm, gap: 4 },
  placeName: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },
  dot: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs },
  ratingText: { fontSize: FONT_SIZE.xs, color: COLORS.starColor, fontWeight: "600" },
});
