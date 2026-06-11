import React, { useState } from "react";
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZE, SPACING, RADIUS } from "@/constants";

type TimeFrame = "weekly" | "all_time";

const MOCK_LEADERBOARD = [
  { id: "1", name: "Sarah Explorer", points: 15420, rank: 1, avatar: null },
  { id: "2", name: "RoadWarrior99", points: 14200, rank: 2, avatar: null },
  { id: "3", name: "MountainGoat", points: 13500, rank: 3, avatar: null },
  { id: "4", name: "CitySlicker", points: 12100, rank: 4, avatar: null },
  { id: "5", name: "VanLifeNomad", points: 11800, rank: 5, avatar: null },
  { id: "6", name: "WeekendDriver", points: 10500, rank: 6, avatar: null },
  { id: "7", name: "DesertFox", points: 9200, rank: 7, avatar: null },
  { id: "8", name: "CoastalCruiser", points: 8900, rank: 8, avatar: null },
];

export default function LeaderboardScreen() {
  const router = useRouter();
  const [timeframe, setTimeframe] = useState<TimeFrame>("weekly");

  const renderTopThree = () => {
    const top3 = MOCK_LEADERBOARD.slice(0, 3);
    if (top3.length < 3) return null;

    return (
      <View style={styles.topThreeContainer}>
        {/* Rank 2 */}
        <View style={[styles.podiumItem, { marginTop: 40 }]}>
          <Text style={styles.podiumRank}>2</Text>
          <View style={[styles.podiumAvatar, { borderColor: "#C0C0C0" }]}>
            <Ionicons name="person" size={24} color={COLORS.textSecondary} />
          </View>
          <Text style={styles.podiumName} numberOfLines={1}>{top3[1].name}</Text>
          <Text style={styles.podiumPoints}>{top3[1].points}</Text>
        </View>

        {/* Rank 1 */}
        <View style={styles.podiumItem}>
          <Text style={[styles.podiumRank, { color: "#FFD700" }]}>👑</Text>
          <View style={[styles.podiumAvatar, { borderColor: "#FFD700", width: 80, height: 80, borderRadius: 40 }]}>
            <Ionicons name="person" size={32} color={COLORS.textSecondary} />
          </View>
          <Text style={[styles.podiumName, { fontWeight: "800", fontSize: FONT_SIZE.base }]} numberOfLines={1}>
            {top3[0].name}
          </Text>
          <Text style={[styles.podiumPoints, { color: COLORS.primary }]}>{top3[0].points}</Text>
        </View>

        {/* Rank 3 */}
        <View style={[styles.podiumItem, { marginTop: 60 }]}>
          <Text style={styles.podiumRank}>3</Text>
          <View style={[styles.podiumAvatar, { borderColor: "#CD7F32" }]}>
            <Ionicons name="person" size={24} color={COLORS.textSecondary} />
          </View>
          <Text style={styles.podiumName} numberOfLines={1}>{top3[2].name}</Text>
          <Text style={styles.podiumPoints}>{top3[2].points}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, timeframe === "weekly" && styles.activeTab]}
          onPress={() => setTimeframe("weekly")}
        >
          <Text style={[styles.tabText, timeframe === "weekly" && styles.activeTabText]}>This Week</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, timeframe === "all_time" && styles.activeTab]}
          onPress={() => setTimeframe("all_time")}
        >
          <Text style={[styles.tabText, timeframe === "all_time" && styles.activeTabText]}>All Time</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {renderTopThree()}

        <View style={styles.listContainer}>
          {MOCK_LEADERBOARD.slice(3).map((user) => (
            <View key={user.id} style={styles.row}>
              <Text style={styles.rowRank}>{user.rank}</Text>
              <View style={styles.rowAvatar}>
                <Ionicons name="person" size={16} color={COLORS.textSecondary} />
              </View>
              <Text style={styles.rowName}>{user.name}</Text>
              <Text style={styles.rowPoints}>{user.points} pts</Text>
            </View>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  iconButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.primary,
  },
  scrollContent: {
    paddingBottom: SPACING.xl,
  },
  topThreeContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-start",
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING["2xl"],
  },
  podiumItem: {
    flex: 1,
    alignItems: "center",
  },
  podiumRank: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  podiumAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  podiumName: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: 4,
  },
  podiumPoints: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  listContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    marginHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowRank: {
    width: 30,
    fontSize: FONT_SIZE.base,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  rowAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.sm,
  },
  rowName: {
    flex: 1,
    fontSize: FONT_SIZE.base,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  rowPoints: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "700",
    color: COLORS.primary,
  },
});
