import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZE, SPACING, RADIUS } from "@/constants";
import { liveReportService } from "@/services/live-report.service";
import { useAuthStore } from "@/store";
import type { LiveReportType } from "@/types";

interface LiveReportComposerProps {
  placeId?: string;
  routeCommunityId?: string;
  onReportCreated: () => void;
  onCancel: () => void;
}

const REPORT_OPTIONS: { type: LiveReportType; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { type: "crowded", label: "Crowded", icon: "people", color: COLORS.error },
  { type: "less_crowded", label: "Quiet", icon: "person", color: COLORS.success },
  { type: "closed", label: "Closed", icon: "lock-closed", color: COLORS.error },
  { type: "open", label: "Open", icon: "lock-open", color: COLORS.success },
  { type: "fresh_batch", label: "Fresh Food", icon: "restaurant", color: COLORS.primary },
  { type: "parking_available", label: "Parking", icon: "car", color: COLORS.success },
  { type: "heavy_traffic", label: "Traffic", icon: "warning", color: COLORS.error },
  { type: "road_block", label: "Road Block", icon: "stop-circle", color: COLORS.error },
];

export default function LiveReportComposer({ placeId, routeCommunityId, onReportCreated, onCancel }: LiveReportComposerProps) {
  const user = useAuthStore(s => s.user);
  const [loading, setLoading] = useState(false);

  const handleReport = async (type: LiveReportType) => {
    if (!user) return; // Should prompt login in real app
    
    setLoading(true);
    try {
      await liveReportService.createReport(user.id, type, placeId, routeCommunityId);
      onReportCreated();
    } catch (e) {
      console.error("Failed to create live report:", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Broadcasting live report...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Live Update</Text>
        <TouchableOpacity onPress={onCancel}>
          <Ionicons name="close" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>
      
      <Text style={styles.subtitle}>Help others right now. Reports expire automatically.</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.grid}>
        {REPORT_OPTIONS.map((opt) => (
          <TouchableOpacity 
            key={opt.type} 
            style={[styles.card, { borderColor: `${opt.color}40` }]}
            onPress={() => handleReport(opt.type)}
          >
            <View style={[styles.iconWrapper, { backgroundColor: `${opt.color}20` }]}>
              <Ionicons name={opt.icon} size={24} color={opt.color} />
            </View>
            <Text style={styles.cardLabel}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  title: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  grid: {
    gap: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  card: {
    alignItems: "center",
    justifyContent: "center",
    width: 80,
    height: 80,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    backgroundColor: COLORS.surfaceLight,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  loadingContainer: {
    padding: SPACING.xl,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
});
