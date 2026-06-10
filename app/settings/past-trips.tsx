import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, SPACING, FONT_SIZE, RADIUS } from "@/constants";
import { tripService } from "@/services/supabase.service";
import type { Trip } from "@/types";

export default function PastTripsScreen() {
  const { user } = useUser();
  const router = useRouter();

  const { data: trips = [], isLoading } = useQuery({
    queryKey: ["trips", user?.id],
    queryFn: () => tripService.getUserTrips(user?.id || ""),
    enabled: !!user?.id,
  });

  const renderTrip = ({ item }: { item: Trip }) => {
    const date = new Date(item.createdAt).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    const statusColor =
      item.status === "completed"
        ? COLORS.success
        : item.status === "active"
        ? COLORS.primary
        : COLORS.accent;

    return (
      <TouchableOpacity
        style={styles.tripCard}
        activeOpacity={0.85}
        onPress={() =>
          router.push({
            pathname: "/trip/results",
            params: { source: item.source, destination: item.destination, prompt: item.prompt },
          })
        }
      >
        <View style={styles.tripHeader}>
          <Text style={styles.tripEmoji}>🗺</Text>
          <View style={styles.tripRoute}>
            <Text style={styles.tripRouteText}>
              {item.source} → {item.destination}
            </Text>
            <Text style={styles.tripDate}>{date}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {item.status}
            </Text>
          </View>
        </View>

        <View style={styles.tripPromptRow}>
          <Text style={styles.promptIcon}>✨</Text>
          <Text style={styles.tripPrompt} numberOfLines={2}>
            "{item.prompt}"
          </Text>
        </View>

        <View style={styles.tripFooter}>
          <Text style={styles.retryText}>Tap to re-discover →</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#020617", "#0F172A"]} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My Trips</Text>
        <Text style={styles.subtitle}>
          {trips.length} {trips.length === 1 ? "trip" : "trips"} taken
        </Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 80 }} />
      ) : trips.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🗺</Text>
          <Text style={styles.emptyTitle}>No trips yet</Text>
          <Text style={styles.emptyText}>
            Start discovering routes and your trips will appear here
          </Text>
          <TouchableOpacity
            style={styles.exploreBtn}
            onPress={() => router.replace("/(tabs)")}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.exploreBtnGradient}
            >
              <Text style={styles.exploreBtnText}>✨ Start Exploring</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => item.id}
          renderItem={renderTrip}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingTop: 60,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.base,
  },
  backBtn: { marginBottom: SPACING.sm },
  backText: { fontSize: FONT_SIZE.md, color: COLORS.primary, fontWeight: "600" },
  title: {
    fontSize: FONT_SIZE["3xl"],
    fontWeight: "800",
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 4 },

  list: { padding: SPACING.base, gap: SPACING.md, paddingBottom: 100 },

  tripCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: SPACING.base,
  },
  tripHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  tripEmoji: { fontSize: 28, marginRight: SPACING.sm },
  tripRoute: { flex: 1 },
  tripRouteText: {
    fontSize: FONT_SIZE.base,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  tripDate: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    gap: 4,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  tripPromptRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: SPACING.sm,
    paddingLeft: 40,
  },
  promptIcon: { fontSize: 14, marginRight: SPACING.xs, marginTop: 1 },
  tripPrompt: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    fontStyle: "italic",
    lineHeight: 20,
  },
  tripFooter: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
    alignItems: "flex-end",
  },
  retryText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.primary,
    fontWeight: "600",
  },

  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING["3xl"],
  },
  emptyEmoji: { fontSize: 64, marginBottom: SPACING.base },
  emptyTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  emptyText: {
    fontSize: FONT_SIZE.base,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  exploreBtn: { borderRadius: RADIUS.lg, overflow: "hidden" },
  exploreBtnGradient: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING["2xl"],
  },
  exploreBtnText: {
    fontSize: FONT_SIZE.base,
    fontWeight: "700",
    color: "#fff",
  },
});
