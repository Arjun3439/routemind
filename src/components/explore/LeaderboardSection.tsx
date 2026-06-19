// ============================================================
// LeaderboardSection — Section 9 (embedded in Explore)
// Full Global + Regional leaderboard with category tabs.
// Uses the real get_leaderboard RPC (now SECURITY DEFINER).
// ============================================================
import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  Image, StyleSheet, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZE, SPACING, RADIUS } from "@/constants";
import {
  useLeaderboard,
  type LeaderboardCategory,
  type LeaderboardRegion,
  type LeaderboardEntry,
} from "@/hooks/useExplore";

// ─── Constants ────────────────────────────────────────────────

const CATEGORIES: { key: LeaderboardCategory; label: string; emoji: string }[] = [
  { key: "overall",     label: "Top Contributors", emoji: "🏆" },
  { key: "food",        label: "Food Explorers",   emoji: "🍜" },
  { key: "coffee",      label: "Coffee Hunters",   emoji: "☕" },
  { key: "hidden_gem",  label: "Gem Finders",      emoji: "💎" },
  { key: "photography", label: "Photographers",    emoji: "📸" },
];

const REGIONS: { key: LeaderboardRegion; label: string; flag: string }[] = [
  { key: "Tamil Nadu", label: "Tamil Nadu",  flag: "🏛️" },
  { key: "Karnataka",  label: "Karnataka",   flag: "🌿" },
  { key: "Kerala",     label: "Kerala",      flag: "🌴" },
  { key: "Sri Lanka",  label: "Sri Lanka",   flag: "🦁" },
];

const LEVEL_COLORS: Record<string, string> = {
  traveler: "#94a3b8",
  explorer: "#60a5fa",
  guide:    "#34d399",
  expert:   "#f59e0b",
  legend:   "#e11d48",
};

// ─── Podium (top 3) ───────────────────────────────────────────

function PodiumSection({ top3 }: { top3: LeaderboardEntry[] }) {
  if (top3.length < 3) return null;

  const PodiumItem = ({
    entry,
    size,
    marginTop,
    medalColor,
    rankLabel,
  }: {
    entry: LeaderboardEntry;
    size: number;
    marginTop: number;
    medalColor: string;
    rankLabel: string;
  }) => {
    const levelColor = LEVEL_COLORS[entry.level] ?? COLORS.textSecondary;
    return (
      <View style={[podium.item, { marginTop }]}>
        <Text style={[podium.rank, { color: medalColor }]}>{rankLabel}</Text>
        <View
          style={[
            podium.avatarRing,
            {
              width: size, height: size, borderRadius: size / 2,
              borderColor: medalColor,
            },
          ]}
        >
          {entry.avatarUrl ? (
            <Image
              source={{ uri: entry.avatarUrl }}
              style={{ width: size - 6, height: size - 6, borderRadius: (size - 6) / 2 }}
            />
          ) : (
            <Ionicons name="person" size={size * 0.4} color={COLORS.textSecondary} />
          )}
        </View>
        <Text style={podium.name} numberOfLines={1}>
          {entry.userName.split(" ")[0]}
        </Text>
        <Text style={[podium.level, { color: levelColor }]}>{entry.level}</Text>
        <Text style={podium.score}>{entry.score.toLocaleString()}</Text>
      </View>
    );
  };

  return (
    <View style={podium.container}>
      <PodiumItem entry={top3[1]} size={56} marginTop={40} medalColor="#C0C0C0" rankLabel="2" />
      <PodiumItem entry={top3[0]} size={72} marginTop={0}  medalColor="#FFD700" rankLabel="👑" />
      <PodiumItem entry={top3[2]} size={52} marginTop={56} medalColor="#CD7F32" rankLabel="3" />
    </View>
  );
}

// ─── Row (rank 4+) ────────────────────────────────────────────

function LeaderRow({ entry }: { entry: LeaderboardEntry }) {
  const levelColor = LEVEL_COLORS[entry.level] ?? COLORS.textSecondary;
  return (
    <View style={rowStyle.row}>
      <Text style={rowStyle.rank}>#{entry.rank}</Text>
      <View style={rowStyle.avatarBox}>
        {entry.avatarUrl ? (
          <Image source={{ uri: entry.avatarUrl }} style={rowStyle.avatarImg} />
        ) : (
          <Ionicons name="person" size={14} color={COLORS.textSecondary} />
        )}
      </View>
      <View style={rowStyle.info}>
        <Text style={rowStyle.name}>{entry.userName}</Text>
        <Text style={[rowStyle.level, { color: levelColor }]}>{entry.level}</Text>
      </View>
      {entry.hiddenGems > 0 && (
        <Text style={rowStyle.gems}>💎 {entry.hiddenGems}</Text>
      )}
      <Text style={rowStyle.score}>{entry.score.toLocaleString()}</Text>
    </View>
  );
}

// ─── Main Section ─────────────────────────────────────────────

export default function LeaderboardSection() {
  const router = useRouter();
  const [scope, setScope] = useState<"global" | "regional">("global");
  const [category, setCategory] = useState<LeaderboardCategory>("overall");
  const [region, setRegion] = useState<LeaderboardRegion>("Tamil Nadu");

  const { data: entries = [], isLoading, isError, refetch } = useLeaderboard(
    scope, category, region
  );

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3, 13); // Show up to rank 13 in the embedded view

  return (
    <View style={styles.container}>
      {/* Section header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerEmoji}>🏆</Text>
          <Text style={styles.headerTitle}>Leaderboard</Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/leaderboard")}>
          <Text style={styles.fullView}>Full View →</Text>
        </TouchableOpacity>
      </View>

      {/* Scope toggle */}
      <View style={styles.scopeRow}>
        {(["global", "regional"] as const).map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.scopeTab, scope === s && styles.scopeTabActive]}
            onPress={() => setScope(s)}
          >
            <Text style={[styles.scopeText, scope === s && styles.scopeTextActive]}>
              {s === "global" ? "🌍 Global" : "📍 Regional"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Region picker */}
      {scope === "regional" && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {REGIONS.map((r) => (
            <TouchableOpacity
              key={r.key}
              style={[styles.chip, region === r.key && styles.chipActive]}
              onPress={() => setRegion(r.key)}
            >
              <Text style={styles.chipFlag}>{r.flag}</Text>
              <Text style={[styles.chipText, region === r.key && styles.chipTextActive]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Category picker */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c.key}
            style={[styles.chip, category === c.key && styles.chipCategoryActive]}
            onPress={() => setCategory(c.key)}
          >
            <Text style={styles.chipFlag}>{c.emoji}</Text>
            <Text style={[styles.chipText, category === c.key && styles.chipCategoryTextActive]}>
              {c.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading rankings…</Text>
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>⚠️</Text>
          <Text style={styles.emptyText}>Failed to load</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🏜️</Text>
          <Text style={styles.emptyText}>No rankings yet</Text>
          <Text style={styles.emptySubtext}>Be the first to explore and earn XP!</Text>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {/* Podium */}
          {top3.length >= 3 && <PodiumSection top3={top3} />}

          {/* Rows 4-13 */}
          {rest.length > 0 && (
            <View style={styles.rowsContainer}>
              {rest.map((entry) => (
                <LeaderRow key={entry.userId} entry={entry} />
              ))}
            </View>
          )}

          {/* Full leaderboard CTA */}
          {entries.length > 10 && (
            <TouchableOpacity
              style={styles.seeMoreBtn}
              onPress={() => router.push("/leaderboard")}
            >
              <Text style={styles.seeMoreText}>See full leaderboard →</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.xl,
    marginHorizontal: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS["2xl"],
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    paddingBottom: SPACING.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerEmoji: { fontSize: 20 },
  headerTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  fullView: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.primary,
    fontWeight: "600",
  },
  scopeRow: {
    flexDirection: "row",
    margin: SPACING.md,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADIUS.lg,
    padding: 3,
    gap: 3,
  },
  scopeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: RADIUS.md,
  },
  scopeTabActive: { backgroundColor: COLORS.primary },
  scopeText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  scopeTextActive: { color: "#fff" },
  chipRow: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceLight,
  },
  chipActive: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}20`,
  },
  chipCategoryActive: {
    borderColor: COLORS.accent,
    backgroundColor: `${COLORS.accent}18`,
  },
  chipFlag: { fontSize: 13 },
  chipText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  chipTextActive: { color: COLORS.primary },
  chipCategoryTextActive: { color: COLORS.accent },
  center: {
    alignItems: "center",
    paddingVertical: SPACING.xl,
    gap: SPACING.sm,
  },
  loadingText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm },
  emptyEmoji: { fontSize: 36 },
  emptyText: {
    fontSize: FONT_SIZE.md,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  emptySubtext: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  retryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  retryText: { color: "#fff", fontWeight: "700", fontSize: FONT_SIZE.sm },
  listContainer: { gap: 0 },
  rowsContainer: {
    marginHorizontal: SPACING.md,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  seeMoreBtn: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    alignItems: "center",
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  seeMoreText: {
    color: COLORS.primary,
    fontWeight: "600",
    fontSize: FONT_SIZE.sm,
  },
});

const podium = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-start",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  item: { flex: 1, alignItems: "center", gap: 3 },
  rank: { fontSize: FONT_SIZE.lg, fontWeight: "800" },
  avatarRing: {
    borderWidth: 2.5,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  name: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  level: { fontSize: 9, fontWeight: "600", textTransform: "capitalize" },
  score: { fontSize: FONT_SIZE.xs, fontWeight: "700", color: COLORS.textSecondary },
});

const rowStyle = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  rank: {
    width: 32,
    fontSize: FONT_SIZE.xs,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  avatarBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarImg: { width: 32, height: 32, borderRadius: 16 },
  info: { flex: 1 },
  name: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  level: { fontSize: 9, fontWeight: "600", textTransform: "capitalize" },
  gems: { fontSize: FONT_SIZE.xs, color: COLORS.accent },
  score: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "700",
    color: COLORS.primary,
  },
});
