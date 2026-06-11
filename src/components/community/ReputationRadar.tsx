import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, FONT_SIZE, SPACING, RADIUS } from "@/constants";
import type { RouteReputationScores } from "@/types";

interface ReputationRadarProps {
  scores: RouteReputationScores;
}

/**
 * A simplified bar-chart visualization of reputation scores.
 * (A true radar chart requires react-native-svg-charts which we might not have installed, 
 * so we use a clean bar chart visualization that fits the "radar" concept conceptually).
 */
export default function ReputationRadar({ scores }: ReputationRadarProps) {
  const data = [
    { label: "Food", value: scores.foodScore, icon: "🍔" },
    { label: "Coffee", value: scores.coffeeScore, icon: "☕" },
    { label: "Roads", value: scores.roadQualityScore, icon: "🛣️" },
    { label: "Photos", value: scores.photographyScore, icon: "📸" },
    { label: "Safety", value: scores.safetyScore, icon: "🛡️" },
    { label: "Night", value: scores.nightDrivingScore, icon: "🌙" },
    { label: "Fuel", value: scores.fuelAvailabilityScore, icon: "⛽" },
  ];

  const getBarColor = (val: number) => {
    if (val >= 80) return COLORS.success;
    if (val >= 50) return COLORS.primary;
    if (val >= 30) return "#F59E0B"; // Amber
    return COLORS.error;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Route Reputation</Text>
      <View style={styles.overallContainer}>
        <Text style={styles.overallScore}>{scores.overallScore}</Text>
        <Text style={styles.overallLabel}>/ 100 Overall</Text>
      </View>

      <View style={styles.chart}>
        {data.map((item) => (
          <View key={item.label} style={styles.row}>
            <Text style={styles.icon}>{item.icon}</Text>
            <Text style={styles.label}>{item.label}</Text>
            
            <View style={styles.barContainer}>
              <View 
                style={[
                  styles.bar, 
                  { width: `${Math.max(5, item.value)}%`, backgroundColor: getBarColor(item.value) }
                ]} 
              />
            </View>
            <Text style={styles.value}>{item.value}</Text>
          </View>
        ))}
      </View>
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
  title: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  overallContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: SPACING.md,
    gap: 4,
  },
  overallScore: {
    fontSize: 32,
    fontWeight: "800",
    color: COLORS.primary,
  },
  overallLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  chart: {
    gap: SPACING.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    fontSize: 16,
    width: 24,
  },
  label: {
    width: 60,
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 4,
    marginHorizontal: SPACING.sm,
    overflow: "hidden",
  },
  bar: {
    height: "100%",
    borderRadius: 4,
  },
  value: {
    width: 24,
    textAlign: "right",
    fontSize: FONT_SIZE.xs,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
});
