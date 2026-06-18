import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, SPACING, FONT_SIZE, RADIUS } from "@/constants";
import { useCommunityInsights } from "@/hooks/useCommunityInsights";

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface CommunityInsightsCardProps {
  googlePlaceId: string;
  placeName: string;
  placeRating: number;
  query?: string;
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
          marginBottom: SPACING.sm,
        },
      ]}
    />
  );
}

// ─── Main Component ───────────────────────────────────────────
export default function CommunityInsightsCard({
  googlePlaceId,
  placeName,
  placeRating,
  query
}: CommunityInsightsCardProps) {
  const { data: insights, isLoading, isError } = useCommunityInsights(googlePlaceId, query);
  const [showReviews, setShowReviews] = useState(false);

  // Auto-expand reviews if there's a specific query to show exact matches
  useEffect(() => {
    if (query && insights?.reviews && insights.reviews.length > 0) {
      setShowReviews(true);
    }
  }, [query, insights]);

  if (isError) return null; // Graceful hide on error

  // If not loading and no insights found, hide
  if (!isLoading && (!insights || insights.summary.length === 0)) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>😕</Text>
        <Text style={styles.emptyText}>No community insights available yet.</Text>
      </View>
    );
  }

  const toggleReviews = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowReviews(!showReviews);
  };

  return (
    <View style={styles.container}>
      {/* Decorative gradient border effect */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBorder}
      />
      
      <View style={styles.innerContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerEmoji}>🧠</Text>
            <Text style={styles.headerText}>Community Intelligence</Text>
          </View>
          {query && (
            <View style={styles.contextBadge}>
              <Text style={styles.contextBadgeText}>Searching: "{query}"</Text>
            </View>
          )}
        </View>

        {/* Loading shimmer */}
        {isLoading && (
          <View style={styles.shimmerContainer}>
            <ShimmerLine width="90%" opacity={0.4} />
            <ShimmerLine width="75%" opacity={0.35} />
            <ShimmerLine width="85%" opacity={0.3} />
            <ShimmerLine width="60%" opacity={0.25} />
          </View>
        )}

        {/* AI Summary Bullets */}
        {!isLoading && insights && insights.summary.length > 0 && (
          <View style={styles.summaryList}>
            {insights.summary.map((bullet, index) => {
              // Simple heuristic for icons
              let icon = "✨";
              const lower = bullet.toLowerCase();
              if (lower.includes("food") || lower.includes("try") || lower.includes("dish")) icon = "🍽";
              else if (lower.includes("time") || lower.includes("wait") || lower.includes("crowd")) icon = "⏰";
              else if (lower.includes("park") || lower.includes("car")) icon = "🅿";
              else if (lower.includes("clean") || lower.includes("dirty")) icon = "🧹";
              else if (lower.includes("service") || lower.includes("staff")) icon = "🛎";

              return (
                <View key={index} style={styles.bulletRow}>
                  <Text style={styles.bulletIcon}>{icon}</Text>
                  <Text style={styles.bulletText}>{bullet}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Expandable Source Reviews */}
        {!isLoading && insights && insights.reviews.length > 0 && (
          <View style={styles.reviewsSection}>
            <TouchableOpacity style={styles.expandBtn} onPress={toggleReviews}>
              <Text style={styles.expandBtnText}>
                {showReviews ? "Hide Source Reviews" : `View Top Reviews (${insights.reviews.length})`}
              </Text>
              <Text style={styles.expandBtnIcon}>{showReviews ? "▲" : "▼"}</Text>
            </TouchableOpacity>

            {showReviews && (
              <View style={styles.reviewsList}>
                {insights.reviews.map((review, index) => (
                  <View key={review.id || index} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <Text style={styles.reviewAuthor}>{review.authorName}</Text>
                      <View style={styles.ratingBadge}>
                        <Text style={styles.ratingText}>{review.rating}★</Text>
                      </View>
                    </View>
                    <Text style={styles.reviewText}>{review.reviewText}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Powered by Semantic RAG AI</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    marginTop: SPACING.md,
    borderRadius: RADIUS.xl,
    padding: 1, // for gradient border
  },
  gradientBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: RADIUS.xl,
    opacity: 0.5,
  },
  innerContainer: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
  },
  
  // Header
  header: {
    marginBottom: SPACING.md,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  headerEmoji: {
    fontSize: FONT_SIZE.lg,
  },
  headerText: {
    fontSize: FONT_SIZE.md,
    fontWeight: "800",
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  contextBadge: {
    marginTop: SPACING.xs,
    backgroundColor: "rgba(37,99,235,0.15)",
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    alignSelf: "flex-start",
  },
  contextBadgeText: {
    color: COLORS.primaryLight,
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
  },

  // Shimmer
  shimmerContainer: {
    gap: SPACING.xs,
    marginVertical: SPACING.sm,
  },
  shimmerLine: {
    height: 12,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.textMuted,
  },

  // Bullets
  summaryList: {
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
  },
  bulletIcon: {
    fontSize: FONT_SIZE.base,
    marginTop: -2,
  },
  bulletText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: COLORS.textPrimary,
    lineHeight: 20,
    fontWeight: "500",
  },

  // Reviews Expand
  reviewsSection: {
    marginTop: SPACING.sm,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingTop: SPACING.md,
  },
  expandBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  expandBtnText: {
    color: COLORS.secondaryLight,
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
  },
  expandBtnIcon: {
    color: COLORS.secondaryLight,
    fontSize: FONT_SIZE.xs,
  },
  
  reviewsList: {
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  reviewCard: {
    backgroundColor: "rgba(0,0,0,0.2)",
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  reviewAuthor: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
  },
  ratingBadge: {
    backgroundColor: "rgba(245,158,11,0.2)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  ratingText: {
    color: COLORS.accentLight,
    fontSize: FONT_SIZE.xs,
    fontWeight: "700",
  },
  reviewText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.xs,
    lineHeight: 18,
  },

  // Footer
  footer: {
    marginTop: SPACING.md,
    alignItems: "flex-end",
  },
  footerText: {
    fontSize: 10,
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: "700",
  },

  // Empty State
  emptyContainer: {
    padding: SPACING.xl,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: RADIUS.xl,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  emptyEmoji: {
    fontSize: 24,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
  }
});
