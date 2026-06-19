// ============================================================
// PopularListsSection — Section 6 (Trending Lists)
// Travel lists ranked by like + save + follow combined score.
// ============================================================
import React from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  Image, StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZE, SPACING, RADIUS } from "@/constants";
import { useTrendingLists } from "@/hooks/useExplore";
import { TallCardSkeleton } from "./SectionSkeleton";
import { SectionHeader, EmptyState } from "./TrendingRoutesSection";

export default function PopularListsSection() {
  const router = useRouter();
  const { data = [], isLoading, isError } = useTrendingLists(10);

  if (isLoading) {
    return (
      <View style={styles.section}>
        <SectionHeader title="Popular Lists" emoji="📋" />
        <TallCardSkeleton count={3} />
      </View>
    );
  }

  if (isError || data.length === 0) {
    return (
      <View style={styles.section}>
        <SectionHeader title="Popular Lists" emoji="📋" />
        <EmptyState message="No lists trending yet — create yours!" />
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <SectionHeader title="Popular Lists" emoji="📋" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {data.map((list) => (
          <TouchableOpacity
            key={list.id}
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => router.push(`/list/${list.id}` as any)}
          >
            {/* Cover image */}
            {list.coverImageUrl ? (
              <Image source={{ uri: list.coverImageUrl }} style={styles.coverImage} />
            ) : (
              <View style={[styles.coverImage, styles.coverFallback]}>
                <Ionicons name="list" size={36} color={COLORS.secondary} />
              </View>
            )}

            {/* Item count badge */}
            <View style={styles.countBadge}>
              <Ionicons name="location" size={9} color="#fff" />
              <Text style={styles.countText}>{list.itemCount} places</Text>
            </View>

            <View style={styles.cardBody}>
              <Text style={styles.listTitle} numberOfLines={2}>
                {list.title}
              </Text>

              {/* Creator row */}
              <View style={styles.creatorRow}>
                {list.ownerAvatar ? (
                  <Image source={{ uri: list.ownerAvatar }} style={styles.creatorAvatar} />
                ) : (
                  <View style={[styles.creatorAvatar, styles.avatarFallback]}>
                    <Ionicons name="person" size={8} color={COLORS.textMuted} />
                  </View>
                )}
                <Text style={styles.creatorName} numberOfLines={1}>
                  {list.ownerName}
                </Text>
              </View>

              {/* Stats row */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Ionicons name="heart" size={10} color={COLORS.error} />
                  <Text style={styles.statText}>{list.likeCount.toLocaleString()}</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="bookmark" size={10} color={COLORS.accent} />
                  <Text style={styles.statText}>{list.saveCount.toLocaleString()}</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="add-circle" size={10} color={COLORS.success} />
                  <Text style={styles.statText}>{list.followCount.toLocaleString()}</Text>
                </View>
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
    width: 200,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  coverImage: { width: "100%", height: 130 },
  coverFallback: {
    backgroundColor: COLORS.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
  },
  countBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(0,0,0,0.75)",
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  countText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  cardBody: { padding: SPACING.sm, gap: 6 },
  listTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "700",
    color: COLORS.textPrimary,
    lineHeight: 16,
  },
  creatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  creatorAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    overflow: "hidden",
  },
  avatarFallback: {
    backgroundColor: COLORS.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
  },
  creatorName: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    flex: 1,
  },
  statsRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  statText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
});
