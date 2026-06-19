import React from "react";
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZE, SPACING, RADIUS } from "@/constants";
import AIAssistant from "@/components/AIAssistant";

export default function HomeTab() {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>RouteMind</Text>
            <View style={styles.headerIcons}>
              <TouchableOpacity style={styles.iconButton}>
                <Ionicons name="notifications-outline" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton} onPress={() => router.push("/search")}>
                <Ionicons name="search-outline" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* AI Daily Tip */}
          <View style={styles.aiTipContainer}>
            <View style={styles.aiTipHeader}>
              <Ionicons name="sparkles" size={18} color={COLORS.primary} />
              <Text style={styles.aiTipTitle}>Daily Intelligence</Text>
            </View>
            <Text style={styles.aiTipText}>
              Traffic is unusually light on the Coastal Highway this morning. Perfect time for a scenic drive!
            </Text>
          </View>

          {/* Quick Actions */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.actionCard} onPress={() => router.push("/(tabs)/route")}>
              <View style={[styles.actionIcon, { backgroundColor: `${COLORS.primary}20` }]}>
                <Ionicons name="map" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.actionLabel}>Plan Route</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionCard} onPress={() => router.push("/(tabs)/community")}>
              <View style={[styles.actionIcon, { backgroundColor: `${COLORS.secondary}20` }]}>
                <Ionicons name="people" size={24} color={COLORS.secondary} />
              </View>
              <Text style={styles.actionLabel}>Community</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard} onPress={() => router.push("/post/create?type=hidden_gem_nomination")}>
              <View style={[styles.actionIcon, { backgroundColor: `${COLORS.success}20` }]}>
                <Ionicons name="diamond" size={24} color={COLORS.success} />
              </View>
              <Text style={styles.actionLabel}>Nominate</Text>
            </TouchableOpacity>
          </View>

          {/* Trending Routes */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Trending Routes</Text>
              <TouchableOpacity>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>
            {/* Placeholder for RouteCarousel component */}
            <View style={styles.placeholderCard}>
              <Text style={styles.placeholderText}>Route cards will appear here</Text>
            </View>
          </View>

          {/* Hidden Gems Nearby */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Hidden Gems Nearby</Text>
              <TouchableOpacity>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>
            {/* Placeholder for PlaceCarousel component */}
            <View style={styles.placeholderCard}>
              <Text style={styles.placeholderText}>Place cards will appear here</Text>
            </View>
          </View>

        </ScrollView>
      </SafeAreaView>

      {/* AI Assistant FAB — floats above everything */}
      <AIAssistant />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: 100, // For bottom tab bar
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  headerIcons: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  aiTipContainer: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
  },
  aiTipHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  aiTipTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "700",
    color: COLORS.primary,
  },
  aiTipText: {
    fontSize: FONT_SIZE.base,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  actionsContainer: {
    flexDirection: "row",
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  actionCard: {
    flex: 1,
    alignItems: "center",
    gap: SPACING.sm,
    padding: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  actionLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  seeAll: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: COLORS.primary,
  },
  placeholderCard: {
    marginHorizontal: SPACING.md,
    height: 150,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADIUS.lg,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: "dashed",
  },
  placeholderText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
  },
});
