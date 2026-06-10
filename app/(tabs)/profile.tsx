import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useUser, useClerk } from "@clerk/clerk-expo";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import { COLORS, SPACING, FONT_SIZE, RADIUS } from "@/constants";
import { tripService } from "@/services/supabase.service";
import { useAuthStore } from "@/store";

export default function ProfileScreen() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const { clearUser } = useAuthStore();

  const { data: trips = [] } = useQuery({
    queryKey: ["trips", user?.id],
    queryFn: () => tripService.getUserTrips(user?.id || ""),
    enabled: !!user?.id,
  });

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          clearUser();
        },
      },
    ]);
  };

  const fullName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Traveler";
  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const menuItems = [
    { emoji: "🗺", label: "My Trips", sub: `${trips.length} trips taken`, onPress: () => router.push("/settings/past-trips") },
    { emoji: "🔔", label: "Notifications", sub: "Manage alerts", onPress: () => router.push("/settings/notifications") },
    { emoji: "🛡", label: "Privacy & Data", sub: "Manage your data", onPress: () => router.push("/settings/privacy") },
    { emoji: "ℹ️", label: "About RouteMind", sub: "Version 1.0.0", onPress: () => router.push("/settings/about") },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#020617", "#0F172A"]} style={StyleSheet.absoluteFill} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + Name */}
        <View style={styles.profileSection}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.secondary]}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </LinearGradient>
          <Text style={styles.name}>{fullName}</Text>
          <Text style={styles.email}>{user?.primaryEmailAddress?.emailAddress}</Text>

          {/* Stats */}
          <View style={styles.statsRow}>
            {[
              { label: "Trips", value: trips.length },
              { label: "Places Saved", value: "—" },
              { label: "Tips Shared", value: "—" },
            ].map((stat) => (
              <View key={stat.label} style={styles.statItem}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Recent Trips */}
        {trips.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Trips</Text>
            {trips.slice(0, 3).map((trip) => (
              <View key={trip.id} style={styles.tripCard}>
                <Text style={styles.tripEmoji}>🗺</Text>
                <View style={styles.tripInfo}>
                  <Text style={styles.tripRoute}>{trip.source} → {trip.destination}</Text>
                  <Text style={styles.tripPrompt} numberOfLines={1}>"{trip.prompt}"</Text>
                  <Text style={styles.tripDate}>
                    {new Date(trip.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </Text>
                </View>
                <View style={[
                  styles.tripStatusBadge,
                  { backgroundColor: trip.status === "completed" ? "rgba(16,185,129,0.15)" : "rgba(37,99,235,0.15)" },
                ]}>
                  <Text style={[
                    styles.tripStatusText,
                    { color: trip.status === "completed" ? COLORS.success : COLORS.primary },
                  ]}>
                    {trip.status}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Menu */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          {menuItems.map((item) => (
            <TouchableOpacity key={item.label} style={styles.menuItem} onPress={item.onPress}>
              <Text style={styles.menuEmoji}>{item.emoji}</Text>
              <View style={styles.menuInfo}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuSub}>{item.sub}</Text>
              </View>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>RouteMind v1.0.0 · Made with ❤️</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: 100 },

  profileSection: {
    alignItems: "center",
    paddingTop: 70,
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.xl,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.base,
  },
  avatarText: { fontSize: FONT_SIZE["2xl"], fontWeight: "800", color: "#fff" },
  name: { fontSize: FONT_SIZE["2xl"], fontWeight: "800", color: COLORS.textPrimary },
  email: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 4 },

  statsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: SPACING.base,
    marginTop: SPACING.xl,
    width: "100%",
  },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: FONT_SIZE.xl, fontWeight: "800", color: COLORS.textPrimary },
  statLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },

  section: { padding: SPACING.base, marginBottom: SPACING.base },
  sectionTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "700",
    color: COLORS.textMuted,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: SPACING.sm,
    marginLeft: SPACING.xs,
  },

  tripCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    padding: SPACING.base,
    marginBottom: SPACING.xs,
    gap: SPACING.md,
  },
  tripEmoji: { fontSize: 28 },
  tripInfo: { flex: 1 },
  tripRoute: { fontSize: FONT_SIZE.sm, fontWeight: "700", color: COLORS.textPrimary },
  tripPrompt: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2, fontStyle: "italic" },
  tripDate: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2 },
  tripStatusBadge: {
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  tripStatusText: { fontSize: FONT_SIZE.xs, fontWeight: "700", textTransform: "capitalize" },

  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    padding: SPACING.base,
    marginBottom: SPACING.xs,
  },
  menuEmoji: { fontSize: 22, marginRight: SPACING.md },
  menuInfo: { flex: 1 },
  menuLabel: { fontSize: FONT_SIZE.base, fontWeight: "600", color: COLORS.textPrimary },
  menuSub: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
  menuArrow: { fontSize: FONT_SIZE.xl, color: COLORS.textMuted },

  signOutBtn: {
    marginHorizontal: SPACING.xl,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.25)",
    padding: SPACING.base,
    alignItems: "center",
    marginTop: SPACING.xs,
  },
  signOutText: { fontSize: FONT_SIZE.base, fontWeight: "700", color: COLORS.error },
  footer: {
    textAlign: "center",
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.xl,
  },
});
