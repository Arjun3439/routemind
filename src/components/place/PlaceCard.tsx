import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { Place } from "@/types";
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  RADIUS,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
} from "@/constants";
import { getScoreLabel, getScoreColor } from "@/services/recommendation.service";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.72;

interface PlaceCardProps {
  place: Place;
  isSelected?: boolean;
  onPress?: () => void;
  onDetailPress?: () => void;
}

export default function PlaceCard({
  place,
  isSelected,
  onPress,
  onDetailPress,
}: PlaceCardProps) {
  const scoreColor = getScoreColor(place.worthStopScore);
  const scoreLabel = getScoreLabel(place.worthStopScore);
  const icon = CATEGORY_ICONS[place.category] || "📍";
  const categoryLabel = CATEGORY_LABELS[place.category] || "Place";

  return (
    <TouchableOpacity
      style={[styles.card, isSelected && styles.cardSelected]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Photo */}
      <View style={styles.imageContainer}>
        {place.photoUrl ? (
          <Image
            source={{ uri: place.photoUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.imagePlaceholder]}>
            <Text style={styles.imagePlaceholderEmoji}>{icon}</Text>
          </View>
        )}
        <LinearGradient
          colors={["transparent", "rgba(9,15,35,0.9)"]}
          style={styles.imageGradient}
        />

        {/* Category badge */}
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>{icon} {categoryLabel}</Text>
        </View>

        {/* Open/Closed badge */}
        {place.openNow !== undefined && (
          <View style={[styles.openBadge, { backgroundColor: place.openNow ? "rgba(16,185,129,0.85)" : "rgba(239,68,68,0.85)" }]}>
            <Text style={styles.openBadgeText}>{place.openNow ? "Open" : "Closed"}</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Worth Stop Score */}
        <View style={styles.scoreRow}>
          <View style={[styles.scoreBadge, { backgroundColor: `${scoreColor}22`, borderColor: `${scoreColor}55` }]}>
            <Text style={[styles.scoreNumber, { color: scoreColor }]}>{place.worthStopScore}</Text>
            <Text style={[styles.scoreLabel, { color: scoreColor }]}>{scoreLabel}</Text>
          </View>

          {/* Rating */}
          <View style={styles.ratingRow}>
            <Text style={styles.star}>⭐</Text>
            <Text style={styles.ratingText}>{place.rating.toFixed(1)}</Text>
            <Text style={styles.ratingCount}>({place.totalRatings.toLocaleString()})</Text>
          </View>
        </View>

        {/* Name */}
        <Text style={styles.name} numberOfLines={2}>{place.name}</Text>

        {/* Address */}
        <Text style={styles.address} numberOfLines={1}>{place.address}</Text>

        {/* Detour info */}
        <View style={styles.detourRow}>
          <View style={styles.detourBadge}>
            <Text style={styles.detourText}>🚗 {place.detourMinutes} min detour</Text>
          </View>
          {place.tipCount > 0 && (
            <View style={styles.tipBadge}>
              <Text style={styles.tipText}>💬 {place.tipCount} tips</Text>
            </View>
          )}
        </View>

        {/* Detail Button */}
        <TouchableOpacity style={styles.detailButton} onPress={onDetailPress}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.detailGradient}
          >
            <Text style={styles.detailButtonText}>View Details →</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: "rgba(15,23,42,0.95)",
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  cardSelected: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },

  // Image
  imageContainer: { position: "relative", height: 160 },
  image: { width: "100%", height: "100%" },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(37,99,235,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  imagePlaceholderEmoji: { fontSize: 48 },
  imageGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  categoryBadge: {
    position: "absolute",
    top: SPACING.sm,
    left: SPACING.sm,
    backgroundColor: "rgba(2,6,23,0.85)",
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  categoryBadgeText: { fontSize: FONT_SIZE.xs, color: "#fff", fontWeight: "600" },
  openBadge: {
    position: "absolute",
    top: SPACING.sm,
    right: SPACING.sm,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  openBadgeText: { fontSize: FONT_SIZE.xs, color: "#fff", fontWeight: "700" },

  // Content
  content: { padding: SPACING.base },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  scoreBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    gap: 4,
  },
  scoreNumber: { fontSize: FONT_SIZE.base, fontWeight: "800" },
  scoreLabel: { fontSize: FONT_SIZE.xs, fontWeight: "600" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  star: { fontSize: FONT_SIZE.sm },
  ratingText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "700",
    color: COLORS.accent,
  },
  ratingCount: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },

  name: {
    fontSize: FONT_SIZE.md,
    fontWeight: "700",
    color: "#fff",
    marginBottom: SPACING.xs,
    lineHeight: 22,
  },
  address: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },

  detourRow: { flexDirection: "row", gap: SPACING.xs, marginBottom: SPACING.md },
  detourBadge: {
    backgroundColor: "rgba(37,99,235,0.15)",
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  detourText: { fontSize: FONT_SIZE.xs, color: COLORS.primary, fontWeight: "600" },
  tipBadge: {
    backgroundColor: "rgba(245,158,11,0.15)",
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  tipText: { fontSize: FONT_SIZE.xs, color: COLORS.accent, fontWeight: "600" },

  detailButton: { borderRadius: RADIUS.md, overflow: "hidden" },
  detailGradient: {
    paddingVertical: SPACING.sm,
    alignItems: "center",
  },
  detailButtonText: { fontSize: FONT_SIZE.sm, fontWeight: "700", color: "#fff" },
});
