// ============================================================
// TopRatedRoutesSection — Section 3
// Route communities ranked by overall_score with category
// breakdown visible in a tap-through detail view.
// ============================================================
import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  Image, StyleSheet, Modal, Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZE, SPACING, RADIUS } from "@/constants";
import { useTopRatedRoutes, type TopRatedRoute } from "@/hooks/useExplore";
import { TallCardSkeleton } from "./SectionSkeleton";
import { SectionHeader, EmptyState } from "./TrendingRoutesSection";

// Score → colour helper
function scoreColor(score: number): string {
  if (score >= 85) return COLORS.success;
  if (score >= 70) return COLORS.accent;
  return COLORS.error;
}

const SCORE_LABELS = [
  { key: "foodScore",              label: "🍜 Food",          },
  { key: "coffeeScore",            label: "☕ Coffee",        },
  { key: "roadQualityScore",       label: "🛣️ Road",          },
  { key: "photographyScore",       label: "📸 Photography",   },
  { key: "safetyScore",            label: "🛡️ Safety",        },
  { key: "nightDrivingScore",      label: "🌙 Night Driving", },
  { key: "fuelAvailabilityScore",  label: "⛽ Fuel",          },
] as const;

// ─── Score breakdown modal ────────────────────────────────────

function ScoreBreakdownModal({
  route,
  onClose,
  onNavigate,
}: {
  route: TopRatedRoute;
  onClose: () => void;
  onNavigate: () => void;
}) {
  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={modal.overlay} onPress={onClose}>
        <Pressable style={modal.sheet} onPress={() => {}}>
          {/* Handle */}
          <View style={modal.handle} />

          {/* Cover */}
          {route.coverImageUrl && (
            <Image source={{ uri: route.coverImageUrl }} style={modal.cover} />
          )}

          <View style={modal.body}>
            <Text style={modal.routeTitle}>
              {route.originLabel} → {route.destinationLabel}
            </Text>
            {route.description && (
              <Text style={modal.description} numberOfLines={2}>
                {route.description}
              </Text>
            )}

            {/* Overall score hero */}
            <View style={modal.overallRow}>
              <Text style={modal.overallLabel}>Overall Score</Text>
              <Text style={[modal.overallScore, { color: scoreColor(route.overallScore) }]}>
                {route.overallScore.toFixed(0)}
              </Text>
            </View>

            {/* Category bars */}
            {SCORE_LABELS.map(({ key, label }) => {
              const val = route[key] as number;
              return (
                <View key={key} style={modal.barRow}>
                  <Text style={modal.barLabel}>{label}</Text>
                  <View style={modal.barTrack}>
                    <View
                      style={[
                        modal.barFill,
                        {
                          width: `${val}%` as any,
                          backgroundColor: scoreColor(val),
                        },
                      ]}
                    />
                  </View>
                  <Text style={[modal.barScore, { color: scoreColor(val) }]}>
                    {val.toFixed(0)}
                  </Text>
                </View>
              );
            })}

            <TouchableOpacity style={modal.ctaBtn} onPress={onNavigate}>
              <Text style={modal.ctaText}>View Community →</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main section ─────────────────────────────────────────────

export default function TopRatedRoutesSection() {
  const router = useRouter();
  const { data = [], isLoading, isError } = useTopRatedRoutes(10);
  const [selected, setSelected] = useState<TopRatedRoute | null>(null);

  if (isLoading) {
    return (
      <View style={styles.section}>
        <SectionHeader title="Top Rated Routes" emoji="⭐" />
        <TallCardSkeleton count={3} />
      </View>
    );
  }

  if (isError || data.length === 0) {
    return (
      <View style={styles.section}>
        <SectionHeader title="Top Rated Routes" emoji="⭐" />
        <EmptyState message="Route scores loading — check back soon!" />
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <SectionHeader title="Top Rated Routes" emoji="⭐" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {data.map((route, idx) => (
          <TouchableOpacity
            key={route.id}
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => setSelected(route)}
          >
            {route.coverImageUrl ? (
              <Image source={{ uri: route.coverImageUrl }} style={styles.cardImage} />
            ) : (
              <View style={[styles.cardImage, styles.imageFallback]}>
                <Ionicons name="map" size={36} color={COLORS.primary} />
              </View>
            )}

            {/* Rank badge */}
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>#{idx + 1}</Text>
            </View>

            {/* Score pill */}
            <View style={[styles.scorePill, { backgroundColor: scoreColor(route.overallScore) + "E0" }]}>
              <Ionicons name="star" size={10} color="#fff" />
              <Text style={styles.scoreText}>{route.overallScore.toFixed(0)}</Text>
            </View>

            <View style={styles.cardBody}>
              <Text style={styles.routeTitle} numberOfLines={1}>
                {route.originLabel} → {route.destinationLabel}
              </Text>
              {/* Mini score pills row */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.miniPillsRow}>
                  {[
                    { label: "🍜", val: route.foodScore },
                    { label: "☕", val: route.coffeeScore },
                    { label: "📸", val: route.photographyScore },
                  ].map(({ label, val }) => (
                    <View key={label} style={styles.miniPill}>
                      <Text style={styles.miniLabel}>{label}</Text>
                      <Text style={[styles.miniScore, { color: scoreColor(val) }]}>
                        {val.toFixed(0)}
                      </Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
              <Text style={styles.tapHint}>Tap for full breakdown →</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {selected && (
        <ScoreBreakdownModal
          route={selected}
          onClose={() => setSelected(null)}
          onNavigate={() => {
            setSelected(null);
            router.push(`/route-community/${selected.slug}` as any);
          }}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  section: { marginBottom: SPACING.xl },
  listContent: { paddingHorizontal: SPACING.md, gap: SPACING.md },
  card: {
    width: 210,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardImage: { width: "100%", height: 130 },
  imageFallback: {
    backgroundColor: COLORS.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
  },
  rankBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  rankText: { color: "#fff", fontSize: FONT_SIZE.xs, fontWeight: "800" },
  scorePill: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  scoreText: { color: "#fff", fontSize: FONT_SIZE.xs, fontWeight: "700" },
  cardBody: { padding: SPACING.sm, gap: 6 },
  routeTitle: { fontSize: FONT_SIZE.sm, fontWeight: "700", color: COLORS.textPrimary },
  miniPillsRow: { flexDirection: "row", gap: 6 },
  miniPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADIUS.full,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  miniLabel: { fontSize: 10 },
  miniScore: { fontSize: 10, fontWeight: "700" },
  tapHint: { fontSize: 9, color: COLORS.textMuted, fontStyle: "italic" },
});

const modal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS["3xl"],
    borderTopRightRadius: RADIUS["3xl"],
    overflow: "hidden",
    maxHeight: "85%",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: SPACING.sm,
  },
  cover: { width: "100%", height: 160 },
  body: { padding: SPACING.lg, gap: SPACING.sm },
  routeTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  description: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  overallRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: SPACING.sm,
  },
  overallLabel: {
    fontSize: FONT_SIZE.base,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  overallScore: {
    fontSize: FONT_SIZE["2xl"],
    fontWeight: "900",
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginVertical: 3,
  },
  barLabel: {
    width: 120,
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
  },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: { height: 6, borderRadius: 3 },
  barScore: {
    width: 28,
    fontSize: FONT_SIZE.xs,
    fontWeight: "700",
    textAlign: "right",
  },
  ctaBtn: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.sm,
    alignItems: "center",
  },
  ctaText: { color: "#fff", fontWeight: "700", fontSize: FONT_SIZE.base },
});
