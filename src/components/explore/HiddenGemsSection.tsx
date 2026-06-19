// ============================================================
// HiddenGemsSection — Section 5
// Recently approved hidden gems sorted by vote count.
// ============================================================
import React from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  Image, StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZE, SPACING, RADIUS } from "@/constants";
import { useRecentHiddenGems } from "@/hooks/useExplore";
import { HorizontalCardSkeleton } from "./SectionSkeleton";
import { SectionHeader, EmptyState } from "./TrendingRoutesSection";

export default function HiddenGemsSection() {
  const router = useRouter();
  const { data = [], isLoading, isError } = useRecentHiddenGems(10);

  if (isLoading) {
    return (
      <View style={styles.section}>
        <SectionHeader title="Hidden Gems" emoji="💎" />
        <HorizontalCardSkeleton count={4} />
      </View>
    );
  }

  if (isError || data.length === 0) {
    return (
      <View style={styles.section}>
        <SectionHeader title="Hidden Gems" emoji="💎" />
        <EmptyState message="No gems discovered yet — nominate one!" />
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <SectionHeader title="Hidden Gems" emoji="💎" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {data.map((gem) => {
          const approvalRate =
            gem.upvoteCount + gem.downvoteCount > 0
              ? Math.round(
                  (gem.upvoteCount / (gem.upvoteCount + gem.downvoteCount)) * 100
                )
              : 0;
          return (
            <TouchableOpacity
              key={gem.nominationId}
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => router.push(`/place/${gem.placeId}` as any)}
            >
              {gem.photoUrl ? (
                <Image source={{ uri: gem.photoUrl }} style={styles.cardImage} />
              ) : (
                <View style={[styles.cardImage, styles.imageFallback]}>
                  <Text style={styles.gemIcon}>💎</Text>
                </View>
              )}

              {/* Approval rate badge */}
              <View style={styles.approvalBadge}>
                <Text style={styles.approvalText}>{approvalRate}% ✓</Text>
              </View>

              <View style={styles.cardBody}>
                <Text style={styles.gemName} numberOfLines={1}>
                  {gem.placeName}
                </Text>
                <Text style={styles.gemAddress} numberOfLines={1}>
                  {gem.placeAddress ?? ""}
                </Text>
                <View style={styles.voteRow}>
                  <Ionicons name="thumbs-up" size={10} color={COLORS.success} />
                  <Text style={styles.voteText}>{gem.upvoteCount.toLocaleString()}</Text>
                  <Text style={styles.nominatorText}>by {gem.nominatorName.split(" ")[0]}</Text>
                </View>
              </View>
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
    width: 160,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: `${COLORS.accent}40`,
  },
  cardImage: { width: "100%", height: 110 },
  imageFallback: {
    backgroundColor: `${COLORS.accent}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  gemIcon: { fontSize: 36 },
  approvalBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: `${COLORS.success}CC`,
    borderRadius: RADIUS.full,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  approvalText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  cardBody: { padding: SPACING.sm, gap: 3 },
  gemName: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  gemAddress: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
  },
  voteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  voteText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.success,
    fontWeight: "700",
  },
  nominatorText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    flex: 1,
  },
});
