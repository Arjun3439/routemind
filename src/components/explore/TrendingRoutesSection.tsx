// ============================================================
// TrendingRoutesSection — Section 1
// Route communities ranked by 7-day post velocity.
// ============================================================
import React from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  Image, StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZE, SPACING, RADIUS } from "@/constants";
import { useTrendingRoutes } from "@/hooks/useExplore";
import { HorizontalCardSkeleton } from "./SectionSkeleton";

export default function TrendingRoutesSection() {
  const router = useRouter();
  const { data = [], isLoading, isError } = useTrendingRoutes(10);

  if (isLoading) {
    return (
      <View style={styles.section}>
        <SectionHeader title="Trending Routes" emoji="🔥" />
        <HorizontalCardSkeleton count={4} />
      </View>
    );
  }

  if (isError || data.length === 0) {
    return (
      <View style={styles.section}>
        <SectionHeader title="Trending Routes" emoji="🔥" />
        <EmptyState message="No trending routes yet — start posting!" />
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <SectionHeader title="Trending Routes" emoji="🔥" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {data.map((route) => (
          <TouchableOpacity
            key={route.id}
            style={styles.card}
            activeOpacity={0.85}
            onPress={() =>
              router.push(`/route-community/${route.slug}` as any)
            }
          >
            {route.coverImageUrl ? (
              <Image
                source={{ uri: route.coverImageUrl }}
                style={styles.cardImage}
              />
            ) : (
              <View style={[styles.cardImage, styles.imageFallback]}>
                <Ionicons name="map" size={32} color={COLORS.primary} />
              </View>
            )}
            {/* Velocity badge */}
            {route.recentPostCount > 0 && (
              <View style={styles.velocityBadge}>
                <Text style={styles.velocityText}>
                  +{route.recentPostCount} this week
                </Text>
              </View>
            )}
            <View style={styles.cardBody}>
              <Text style={styles.routeLabel} numberOfLines={1}>
                {route.originLabel} → {route.destinationLabel}
              </Text>
              <View style={styles.cardMeta}>
                <Ionicons name="people" size={11} color={COLORS.textSecondary} />
                <Text style={styles.metaText}>{route.memberCount.toLocaleString()}</Text>
                <Ionicons name="document-text" size={11} color={COLORS.textSecondary} />
                <Text style={styles.metaText}>{route.postCount}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Shared sub-components ────────────────────────────────────

export function SectionHeader({
  title,
  emoji,
  onSeeAll,
}: {
  title: string;
  emoji?: string;
  onSeeAll?: () => void;
}) {
  return (
    <View style={headerStyles.row}>
      <View style={headerStyles.left}>
        {emoji && <Text style={headerStyles.emoji}>{emoji}</Text>}
        <Text style={headerStyles.title}>{title}</Text>
      </View>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll}>
          <Text style={headerStyles.seeAll}>See All</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <View style={emptyStyles.container}>
      <Text style={emptyStyles.emoji}>🌱</Text>
      <Text style={emptyStyles.text}>{message}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  section: {
    marginBottom: SPACING.xl,
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
  },
  card: {
    width: 170,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardImage: {
    width: "100%",
    height: 110,
  },
  imageFallback: {
    backgroundColor: COLORS.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
  },
  velocityBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(37,99,235,0.9)",
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  velocityText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
  },
  cardBody: {
    padding: SPACING.sm,
    gap: 4,
  },
  routeLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginRight: 6,
  },
});

const headerStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  emoji: {
    fontSize: 18,
  },
  title: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  seeAll: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.primary,
    fontWeight: "600",
  },
});

const emptyStyles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: SPACING.xl,
    gap: SPACING.sm,
    marginHorizontal: SPACING.md,
  },
  emoji: {
    fontSize: 32,
  },
  text: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
});
