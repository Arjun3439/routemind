import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, SPACING, FONT_SIZE, RADIUS } from "@/constants";

interface NotifSetting {
  key: string;
  emoji: string;
  label: string;
  description: string;
  enabled: boolean;
}

export default function NotificationsScreen() {
  const router = useRouter();

  const [settings, setSettings] = useState<NotifSetting[]>([
    {
      key: "trip_updates",
      emoji: "🗺",
      label: "Trip Updates",
      description: "Get notified when your trip route is ready",
      enabled: true,
    },
    {
      key: "nearby_stops",
      emoji: "📍",
      label: "Nearby Stops",
      description: "Alerts when you're near a recommended stop",
      enabled: true,
    },
    {
      key: "community_tips",
      emoji: "💬",
      label: "Community Tips",
      description: "When someone adds a tip to your saved places",
      enabled: false,
    },
    {
      key: "weekly_digest",
      emoji: "📊",
      label: "Weekly Digest",
      description: "Weekly summary of trending routes & places",
      enabled: false,
    },
    {
      key: "promotions",
      emoji: "🎁",
      label: "Promotions",
      description: "Special offers and new feature announcements",
      enabled: false,
    },
  ]);

  const toggleSetting = (key: string) => {
    setSettings((prev) =>
      prev.map((s) => (s.key === key ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const enabledCount = settings.filter((s) => s.enabled).length;

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
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>
            {enabledCount} of {settings.length} enabled
          </Text>
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryEmoji}>🔔</Text>
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryTitle}>Push Notifications</Text>
            <Text style={styles.summaryText}>
              Manage what notifications you receive from RouteMind
            </Text>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          {settings.map((setting) => (
            <View key={setting.key} style={styles.settingItem}>
              <Text style={styles.settingEmoji}>{setting.emoji}</Text>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>{setting.label}</Text>
                <Text style={styles.settingDesc}>{setting.description}</Text>
              </View>
              <Switch
                value={setting.enabled}
                onValueChange={() => toggleSetting(setting.key)}
                trackColor={{
                  false: "rgba(255,255,255,0.1)",
                  true: `${COLORS.primary}80`,
                }}
                thumbColor={setting.enabled ? COLORS.primary : "#555"}
                ios_backgroundColor="rgba(255,255,255,0.1)"
              />
            </View>
          ))}
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            You can also manage notification preferences from your device's
            Settings app under RouteMind.
          </Text>
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

  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    margin: SPACING.base,
    padding: SPACING.base,
    backgroundColor: "rgba(37,99,235,0.08)",
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.2)",
  },
  summaryEmoji: { fontSize: 32, marginRight: SPACING.md },
  summaryInfo: { flex: 1 },
  summaryTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  summaryText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 20,
  },

  section: {
    paddingHorizontal: SPACING.base,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    padding: SPACING.base,
    marginBottom: SPACING.xs,
  },
  settingEmoji: { fontSize: 22, marginRight: SPACING.md },
  settingInfo: { flex: 1, marginRight: SPACING.sm },
  settingLabel: {
    fontSize: FONT_SIZE.base,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  settingDesc: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },

  infoCard: {
    margin: SPACING.base,
    marginTop: SPACING.xl,
    padding: SPACING.base,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  infoText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    lineHeight: 20,
    textAlign: "center",
  },
});
