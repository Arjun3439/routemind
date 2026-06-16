import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { COLORS, FONT_SIZE, SPACING, RADIUS } from "@/constants";
import {
  getGlobalLeaderboard,
  getRegionalLeaderboard,
  type LeaderboardEntry,
  type LeaderboardCategory,
  type LeaderboardRegion,
} from "@/services/leaderboard.service";

// ─── Types ────────────────────────────────────────────────────

type ScopeTab = "global" | "regional";

const CATEGORIES: { key: LeaderboardCategory; label: string; emoji: string }[] = [
  { key: "overall", label: "Top Contributors", emoji: "🏆" },
  { key: "food", label: "Food Explorers", emoji: "🍜" },
  { key: "coffee", label: "Coffee Hunters", emoji: "☕" },
  { key: "hidden_gem", label: "Gem Finders", emoji: "💎" },
  { key: "photography", label: "Photographers", emoji: "📸" },
];

const REGIONS: { key: LeaderboardRegion; label: string }[] = [
  { key: "Tamil Nadu", label: "Tamil Nadu" },
  { key: "Karnataka", label: "Karnataka" },
  { key: "Kerala", label: "Kerala" },
  { key: "Sri Lanka", label: "Sri Lanka" },
];

const LEVEL_COLORS: Record<string, string> = {
  traveler: "#94a3b8",
  explorer: "#60a5fa",
  guide: "#34d399",
  expert: "#f59e0b",
  legend: "#e11d48",
};

// ─── Main Screen ──────────────────────────────────────────────

export default function LeaderboardScreen() {
  const router = useRouter();
  const [scope, setScope] = useState<ScopeTab>("global");
  const [category, setCategory] = useState<LeaderboardCategory>("overall");
  const [region, setRegion] = useState<LeaderboardRegion>("Tamil Nadu");

  const { data: entries = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["leaderboard", scope, category, scope === "regional" ? region : null],
    queryFn: () =>
      scope === "global"
        ? getGlobalLeaderboard(category)
        : getRegionalLeaderboard(category, region),
    staleTime: 1000 * 60 * 5, // 5 min cache
  });

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Scope tabs: Global / Regional */}
      <View style={styles.scopeTabRow}>
        {(["global", "regional"] as ScopeTab[]).map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.scopeTab, scope === s && styles.scopeTabActive]}
            onPress={() => setScope(s)}
          >
            <Text style={[styles.scopeTabText, scope === s && styles.scopeTabTextActive]}>
              {s === "global" ? "🌍 Global" : "📍 Regional"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Region picker (only visible in regional tab) */}
      {scope === "regional" && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.regionRow}
        >
          {REGIONS.map((r) => (
            <TouchableOpacity
              key={r.key}
              style={[styles.regionChip, region === r.key && styles.regionChipActive]}
              onPress={() => setRegion(r.key)}
            >
              <Text style={[styles.regionChipText, region === r.key && styles.regionChipTextActive]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRow}
      >
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c.key}
            style={[styles.categoryChip, category === c.key && styles.categoryChipActive]}
            onPress={() => setCategory(c.key)}
          >
            <Text style={[styles.categoryEmoji]}>{c.emoji}</Text>
            <Text style={[styles.categoryChipText, category === c.key && styles.categoryChipTextActive]}>
              {c.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading rankings…</Text>
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>⚠️</Text>
          <Text style={styles.emptyTitle}>Failed to load</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🏜️</Text>
          <Text style={styles.emptyTitle}>No rankings yet</Text>
          <Text style={styles.emptySubtitle}>
            Be the first to explore and earn XP!
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Podium — top 3 */}
          {top3.length >= 3 && <PodiumSection top3={top3} />}

          {/* Rest of the list */}
          {rest.length > 0 && (
            <View style={styles.listContainer}>
              {rest.map((entry) => (
                <LeaderboardRow key={entry.userId} entry={entry} />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────

function PodiumSection({ top3 }: { top3: LeaderboardEntry[] }) {
  const levelColor = (level: string) => LEVEL_COLORS[level] ?? COLORS.textSecondary;

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
  }) => (
    <View style={[styles.podiumItem, { marginTop }]}>
      <Text style={[styles.podiumRank, { color: medalColor }]}>{rankLabel}</Text>
      <View style={[styles.podiumAvatar, { width: size, height: size, borderRadius: size / 2, borderColor: medalColor }]}>
        {entry.avatarUrl ? (
          <Image source={{ uri: entry.avatarUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} />
        ) : (
          <Ionicons name="person" size={size * 0.4} color={COLORS.textSecondary} />
        )}
      </View>
      <Text style={styles.podiumName} numberOfLines={1}>{entry.userName}</Text>
      <Text style={[styles.podiumLevel, { color: levelColor(entry.level) }]}>{entry.level}</Text>
      <Text style={styles.podiumPoints}>{entry.score.toLocaleString()} pts</Text>
    </View>
  );

  return (
    <View style={styles.topThreeContainer}>
      <PodiumItem entry={top3[1]} size={56} marginTop={40} medalColor="#C0C0C0" rankLabel="2" />
      <PodiumItem entry={top3[0]} size={72} marginTop={0} medalColor="#FFD700" rankLabel="👑" />
      <PodiumItem entry={top3[2]} size={56} marginTop={56} medalColor="#CD7F32" rankLabel="3" />
    </View>
  );
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  const levelColor = LEVEL_COLORS[entry.level] ?? COLORS.textSecondary;
  return (
    <View style={styles.row}>
      <Text style={styles.rowRank}>#{entry.rank}</Text>
      <View style={styles.rowAvatar}>
        {entry.avatarUrl ? (
          <Image source={{ uri: entry.avatarUrl }} style={styles.rowAvatarImage} />
        ) : (
          <Ionicons name="person" size={16} color={COLORS.textSecondary} />
        )}
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowName}>{entry.userName}</Text>
        <Text style={[styles.rowLevel, { color: levelColor }]}>{entry.level}</Text>
      </View>
      {entry.hiddenGems > 0 && (
        <Text style={styles.rowGems}>💎 {entry.hiddenGems}</Text>
      )}
      <Text style={styles.rowPoints}>{entry.score.toLocaleString()} pts</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  iconButton: { padding: 8 },
  headerTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },

  // Scope tabs
  scopeTabRow: {
    flexDirection: "row",
    marginHorizontal: SPACING.md,
    marginTop: SPACING.xs,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 4,
  },
  scopeTab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: "center",
    borderRadius: RADIUS.md,
  },
  scopeTabActive: { backgroundColor: COLORS.primary },
  scopeTabText: { fontSize: FONT_SIZE.sm, fontWeight: "600", color: COLORS.textSecondary },
  scopeTabTextActive: { color: "#fff" },

  // Region picker
  regionRow: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  regionChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  regionChipActive: { borderColor: COLORS.primary, backgroundColor: "rgba(37,99,235,0.15)" },
  regionChipText: { fontSize: FONT_SIZE.xs, fontWeight: "600", color: COLORS.textSecondary },
  regionChipTextActive: { color: COLORS.primary },

  // Category chips
  categoryRow: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  categoryChipActive: { borderColor: COLORS.accent, backgroundColor: "rgba(245,158,11,0.12)" },
  categoryEmoji: { fontSize: 14 },
  categoryChipText: { fontSize: FONT_SIZE.xs, fontWeight: "600", color: COLORS.textSecondary },
  categoryChipTextActive: { color: COLORS.accent },

  // States
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: SPACING.sm },
  loadingText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: FONT_SIZE.md, fontWeight: "700", color: COLORS.textPrimary },
  emptySubtitle: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, textAlign: "center", paddingHorizontal: SPACING.xl },
  retryBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, marginTop: SPACING.sm },
  retryText: { color: "#fff", fontWeight: "700", fontSize: FONT_SIZE.sm },

  scrollContent: { paddingBottom: SPACING.xl },

  // Podium
  topThreeContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-start",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xl,
    gap: SPACING.sm,
  },
  podiumItem: { flex: 1, alignItems: "center" },
  podiumRank: { fontSize: FONT_SIZE.lg, fontWeight: "800", marginBottom: SPACING.xs },
  podiumAvatar: {
    borderWidth: 3,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.sm,
    overflow: "hidden",
  },
  podiumName: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: 2,
  },
  podiumLevel: { fontSize: 10, fontWeight: "600", marginBottom: 2 },
  podiumPoints: { fontSize: FONT_SIZE.xs, fontWeight: "700", color: COLORS.textSecondary },

  // List rows
  listContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    marginHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  rowRank: { width: 36, fontSize: FONT_SIZE.sm, fontWeight: "700", color: COLORS.textSecondary },
  rowAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: "center", alignItems: "center",
    overflow: "hidden",
  },
  rowAvatarImage: { width: 36, height: 36, borderRadius: 18 },
  rowInfo: { flex: 1 },
  rowName: { fontSize: FONT_SIZE.sm, fontWeight: "600", color: COLORS.textPrimary },
  rowLevel: { fontSize: 10, fontWeight: "600", textTransform: "capitalize" },
  rowGems: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  rowPoints: { fontSize: FONT_SIZE.sm, fontWeight: "700", color: COLORS.primary },
});
