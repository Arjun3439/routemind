import React from "react";
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZE, SPACING, RADIUS } from "@/constants";

export default function ExploreTab() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Explore</Text>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.push("/search")}>
            <Ionicons name="search-outline" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Top Categories */}
        <View style={styles.section}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesRow}>
            {["Hidden Gems", "Scenic Routes", "Foodie Favorites", "Camping", "Off-Road"].map(cat => (
              <TouchableOpacity key={cat} style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Leaderboards Entry */}
        <TouchableOpacity style={styles.leaderboardCard} onPress={() => router.push("/leaderboard")}>
          <View style={styles.leaderboardLeft}>
            <Text style={styles.leaderboardEmoji}>🏆</Text>
            <View>
              <Text style={styles.leaderboardTitle}>Community Leaderboards</Text>
              <Text style={styles.leaderboardSub}>See top contributors and rank up!</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>

        {/* Trending Travel Lists */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Trending Lists</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
            {[1, 2, 3].map(i => (
              <View key={i} style={styles.placeholderCard}>
                <Ionicons name="list" size={32} color={COLORS.primary} />
                <Text style={styles.placeholderText}>List {i}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Top Rated Routes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top Rated Routes</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
            {[1, 2, 3].map(i => (
              <View key={i} style={[styles.placeholderCard, { width: 200, height: 120 }]}>
                <Ionicons name="map" size={32} color={COLORS.success} />
                <Text style={styles.placeholderText}>Route {i}</Text>
              </View>
            ))}
          </ScrollView>
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
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.background,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  iconButton: {
    padding: 8,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  categoriesRow: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  categoryBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryText: {
    color: COLORS.textPrimary,
    fontWeight: "600",
    fontSize: FONT_SIZE.sm,
  },
  leaderboardCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.xl,
    padding: SPACING.md,
    backgroundColor: `${COLORS.primary}15`,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
  },
  leaderboardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  leaderboardEmoji: {
    fontSize: 32,
  },
  leaderboardTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: "700",
    color: COLORS.primary,
  },
  leaderboardSub: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  seeAllText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.primary,
    fontWeight: "600",
  },
  horizontalList: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
  },
  placeholderCard: {
    width: 140,
    height: 140,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
    gap: SPACING.xs,
  },
  placeholderText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
  },
});
