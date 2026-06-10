import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, SPACING, FONT_SIZE, RADIUS } from "@/constants";

export default function AboutScreen() {
  const router = useRouter();

  const features = [
    { emoji: "🤖", label: "AI-Powered", desc: "Gemini AI recommends the best stops" },
    { emoji: "🗺", label: "Smart Routes", desc: "Google Maps integration for real routes" },
    { emoji: "📍", label: "Place Discovery", desc: "Find hidden gems along any route" },
    { emoji: "💬", label: "Community Tips", desc: "Real traveler recommendations" },
    { emoji: "📊", label: "Worth-Stop Score", desc: "Data-driven stop ratings" },
    { emoji: "🔔", label: "Geofence Alerts", desc: "Get notified near great stops" },
  ];

  const links = [
    { label: "Website", url: "https://routemind.app" },
    { label: "Privacy Policy", url: "https://routemind.app/privacy" },
    { label: "Terms of Service", url: "https://routemind.app/terms" },
    { label: "Contact Support", url: "mailto:support@routemind.app" },
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
        </View>

        {/* Logo & Version */}
        <View style={styles.logoSection}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.secondary]}
            style={styles.logoBg}
          >
            <Text style={styles.logoText}>RM</Text>
          </LinearGradient>
          <Text style={styles.appName}>RouteMind</Text>
          <Text style={styles.tagline}>AI-powered route discovery</Text>
          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>v1.0.0</Text>
          </View>
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Features</Text>
          <View style={styles.featureGrid}>
            {features.map((f) => (
              <View key={f.label} style={styles.featureCard}>
                <Text style={styles.featureEmoji}>{f.emoji}</Text>
                <Text style={styles.featureLabel}>{f.label}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Built With */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Built With</Text>
          <View style={styles.techRow}>
            {["React Native", "Expo", "Clerk", "Supabase", "Gemini AI", "Google Maps"].map(
              (tech) => (
                <View key={tech} style={styles.techChip}>
                  <Text style={styles.techText}>{tech}</Text>
                </View>
              )
            )}
          </View>
        </View>

        {/* Links */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Links</Text>
          {links.map((link) => (
            <TouchableOpacity
              key={link.label}
              style={styles.linkItem}
              onPress={() => Linking.openURL(link.url)}
            >
              <Text style={styles.linkLabel}>{link.label}</Text>
              <Text style={styles.linkArrow}>→</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Made with ❤️ for travelers</Text>
          <Text style={styles.footerCopy}>© 2026 RouteMind. All rights reserved.</Text>
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
  },
  backBtn: { marginBottom: SPACING.sm },
  backText: { fontSize: FONT_SIZE.md, color: COLORS.primary, fontWeight: "600" },

  logoSection: {
    alignItems: "center",
    paddingVertical: SPACING["2xl"],
  },
  logoBg: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.base,
  },
  logoText: { fontSize: FONT_SIZE["3xl"], fontWeight: "900", color: "#fff" },
  appName: {
    fontSize: FONT_SIZE["3xl"],
    fontWeight: "800",
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: FONT_SIZE.base,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  versionBadge: {
    marginTop: SPACING.sm,
    backgroundColor: "rgba(37,99,235,0.12)",
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  versionText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "700",
    color: COLORS.primary,
  },

  section: {
    paddingHorizontal: SPACING.base,
    marginTop: SPACING.xl,
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

  featureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.xs,
  },
  featureCard: {
    width: "48%",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    padding: SPACING.md,
  },
  featureEmoji: { fontSize: 24, marginBottom: SPACING.xs },
  featureLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  featureDesc: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },

  techRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.xs,
  },
  techChip: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  techText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },

  linkItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    padding: SPACING.base,
    marginBottom: SPACING.xs,
  },
  linkLabel: {
    fontSize: FONT_SIZE.base,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  linkArrow: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
  },

  footer: {
    alignItems: "center",
    marginTop: SPACING["3xl"],
    paddingHorizontal: SPACING.base,
  },
  footerText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  footerCopy: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginTop: 4,
  },
});
