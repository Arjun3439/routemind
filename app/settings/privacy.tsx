import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { useUser, useClerk } from "@clerk/clerk-expo";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, SPACING, FONT_SIZE, RADIUS } from "@/constants";

export default function PrivacyDataScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useClerk();

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all associated data. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: async () => {
            try {
              await user?.delete();
              await signOut();
              router.replace("/(auth)/sign-in");
            } catch (err: any) {
              Alert.alert("Error", err?.message || "Could not delete account.");
            }
          },
        },
      ]
    );
  };

  const handleExportData = () => {
    Alert.alert(
      "Export Data",
      "We'll prepare a copy of your data and email it to you. This may take a few minutes.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Request Export",
          onPress: () => {
            Alert.alert("Request Sent", "You'll receive an email with your data export shortly.");
          },
        },
      ]
    );
  };

  const privacyItems = [
    {
      emoji: "📍",
      label: "Location Data",
      description: "Your location is used only during route discovery and is not stored on our servers.",
      type: "info" as const,
    },
    {
      emoji: "🗺",
      label: "Trip History",
      description: "Your trip routes and preferences are stored to improve your experience.",
      type: "info" as const,
    },
    {
      emoji: "🔐",
      label: "Authentication",
      description: "We use Clerk for secure authentication. We never store your password.",
      type: "info" as const,
    },
    {
      emoji: "🌐",
      label: "Third-Party APIs",
      description: "We use Google Maps and Gemini AI to power route and place recommendations.",
      type: "info" as const,
    },
  ];

  const actionItems = [
    {
      emoji: "📦",
      label: "Export My Data",
      description: "Download a copy of all your data",
      onPress: handleExportData,
      color: COLORS.primary,
    },
    {
      emoji: "🗑",
      label: "Delete Account",
      description: "Permanently delete your account and data",
      onPress: handleDeleteAccount,
      color: COLORS.error,
    },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#020617", "#0F172A"]} style={StyleSheet.absoluteFill} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Privacy & Data</Text>
          <Text style={styles.subtitle}>Manage your data and privacy settings</Text>
        </View>

        {/* Shield */}
        <View style={styles.shieldCard}>
          <Text style={styles.shieldEmoji}>🛡</Text>
          <Text style={styles.shieldTitle}>Your privacy matters</Text>
          <Text style={styles.shieldText}>
            RouteMind is designed with privacy in mind. We only collect what's needed to power your experience.
          </Text>
        </View>

        {/* Privacy Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How We Use Your Data</Text>
          {privacyItems.map((item) => (
            <View key={item.label} style={styles.infoItem}>
              <Text style={styles.infoEmoji}>{item.emoji}</Text>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{item.label}</Text>
                <Text style={styles.infoDesc}>{item.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Data Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Data</Text>
          {actionItems.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.actionItem, { borderColor: `${item.color}30` }]}
              onPress={item.onPress}
            >
              <Text style={styles.actionEmoji}>{item.emoji}</Text>
              <View style={styles.actionInfo}>
                <Text style={[styles.actionLabel, { color: item.color }]}>
                  {item.label}
                </Text>
                <Text style={styles.actionDesc}>{item.description}</Text>
              </View>
              <Text style={[styles.actionArrow, { color: item.color }]}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Legal Links */}
        <View style={styles.legalSection}>
          <TouchableOpacity onPress={() => Linking.openURL("https://routemind.app/privacy")}>
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={styles.legalDot}>·</Text>
          <TouchableOpacity onPress={() => Linking.openURL("https://routemind.app/terms")}>
            <Text style={styles.legalLink}>Terms of Service</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: 100 },

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

  shieldCard: {
    alignItems: "center",
    margin: SPACING.base,
    padding: SPACING.xl,
    backgroundColor: "rgba(16,185,129,0.06)",
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.15)",
  },
  shieldEmoji: { fontSize: 48, marginBottom: SPACING.sm },
  shieldTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  shieldText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },

  section: {
    paddingHorizontal: SPACING.base,
    marginTop: SPACING.base,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "700",
    color: COLORS.textMuted,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: SPACING.sm,
    marginLeft: SPACING.xs,
  },

  infoItem: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    padding: SPACING.base,
    marginBottom: SPACING.xs,
  },
  infoEmoji: { fontSize: 22, marginRight: SPACING.md, marginTop: 2 },
  infoContent: { flex: 1 },
  infoLabel: {
    fontSize: FONT_SIZE.base,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  infoDesc: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },

  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.base,
    marginBottom: SPACING.xs,
  },
  actionEmoji: { fontSize: 22, marginRight: SPACING.md },
  actionInfo: { flex: 1 },
  actionLabel: {
    fontSize: FONT_SIZE.base,
    fontWeight: "700",
  },
  actionDesc: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  actionArrow: { fontSize: FONT_SIZE.xl },

  legalSection: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: SPACING["2xl"],
    gap: SPACING.sm,
  },
  legalLink: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.primary,
    fontWeight: "600",
  },
  legalDot: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
  },
});
