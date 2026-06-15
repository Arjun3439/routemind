// ============================================================
// RouteMind — ReviewSummarySection Component
// ============================================================
// Self-contained component that fetches (or serves cached)
// Gemini-generated review bullet points for a place, with a
// shimmer loading state and silent hide on empty/error.
// ============================================================

import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { COLORS, SPACING, FONT_SIZE, RADIUS } from "@/constants";
import { getOrGenerateReviewSummary } from "@/services/places.service";

interface ReviewSummarySectionProps {
  /** Google Place ID for the place */
  placeId: string;
  /** Maximum number of bullets to display. Defaults to 5 (full). */
  maxBullets?: number;
}

// ─── Shimmer Placeholder ──────────────────────────────────────
function ShimmerLine({ width, opacity }: { width: number | `${number}%`; opacity: number }) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [shimmer]);

  const animatedOpacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0.55],
  });

  return (
    <Animated.View
      style={[
        styles.shimmerLine,
        {
          width,
          opacity: animatedOpacity,
          marginBottom: SPACING.xs,
        },
      ]}
    />
  );
}

// ─── Main Component ───────────────────────────────────────────
export default function ReviewSummarySection({
  placeId,
  maxBullets = 5,
}: ReviewSummarySectionProps) {
  const { data: bullets, isLoading } = useQuery({
    queryKey: ["review-summary", placeId],
    queryFn: () => getOrGenerateReviewSummary(placeId),
    enabled: !!placeId,
    staleTime: 1000 * 60 * 60, // 1 hour in-memory cache
    retry: false,
  });

  // Nothing fetched yet and not loading — hide
  if (!isLoading && (!bullets || bullets.length === 0)) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>✨</Text>
        <Text style={styles.headerText}>Review Summary</Text>
      </View>

      {/* Loading shimmer */}
      {isLoading && (
        <View style={styles.shimmerContainer}>
          <ShimmerLine width={"90%"} opacity={0.4} />
          <ShimmerLine width={"75%"} opacity={0.35} />
          <ShimmerLine width={"82%"} opacity={0.3} />
        </View>
      )}

      {/* Bullet list */}
      {!isLoading && bullets && bullets.length > 0 && (
        <View style={styles.bulletList}>
          {bullets.slice(0, maxBullets).map((bullet, index) => (
            <View key={index} style={styles.bulletRow}>
              <Text style={styles.bulletDot}>·</Text>
              <Text style={styles.bulletText}>{bullet}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.sm,
    gap: SPACING.xs,
  },
  headerEmoji: {
    fontSize: FONT_SIZE.sm,
  },
  headerText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "700",
    color: COLORS.textSecondary,
    letterSpacing: 0.3,
  },

  // Shimmer
  shimmerContainer: {
    gap: SPACING.xs,
  },
  shimmerLine: {
    height: 10,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.textMuted,
  },

  // Bullets
  bulletList: {
    gap: SPACING.xs,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.xs,
  },
  bulletDot: {
    fontSize: FONT_SIZE.md,
    color: COLORS.secondary,
    lineHeight: 18,
    fontWeight: "700",
    marginTop: -1,
  },
  bulletText: {
    flex: 1,
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    lineHeight: 17,
  },
});
