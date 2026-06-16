// ============================================================
// RouteMind Phase 7 — ActiveTripCard Component
// ============================================================
// Bottom-sheet style card showing ETA, distance, progress bar,
// and upcoming stop chip during active navigation.
// ============================================================

import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { COLORS, SPACING, FONT_SIZE, RADIUS, CATEGORY_ICONS } from "@/constants";
import type { TripProgress } from "@/types";

interface ActiveTripCardProps {
  progress: TripProgress;
  destination: string;
  onStopPress?: (placeId: string) => void;
}

export function ActiveTripCard({ progress, destination, onStopPress }: ActiveTripCardProps) {
  const router = useRouter();
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Animate progress bar
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress.progressPercent / 100,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [progress.progressPercent]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const { nextStop } = progress;

  return (
    <View style={styles.card}>
      {/* Glass background */}
      <LinearGradient
        colors={["rgba(15,23,42,0.97)", "rgba(9,15,31,0.99)"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Top handle */}
      <View style={styles.handle} />

      {/* Header row */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.destinationLabel}>DESTINATION</Text>
          <Text style={styles.destinationText} numberOfLines={1}>
            {destination}
          </Text>
        </View>
        <View style={styles.etaBox}>
          <Text style={styles.etaValue}>{progress.etaMinutes}</Text>
          <Text style={styles.etaUnit}>min</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width: progressWidth }]}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <View style={[styles.progressDot, { left: `${progress.progressPercent}%` as any }]} />
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{progress.distanceTraveledKm.toFixed(1)}</Text>
          <Text style={styles.statLabel}>km driven</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{progress.progressPercent}%</Text>
          <Text style={styles.statLabel}>complete</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{progress.distanceRemainingKm.toFixed(1)}</Text>
          <Text style={styles.statLabel}>km left</Text>
        </View>
        {progress.currentSpeedKmh > 0 && (
          <>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{Math.round(progress.currentSpeedKmh)}</Text>
              <Text style={styles.statLabel}>km/h</Text>
            </View>
          </>
        )}
      </View>

      {/* Next stop chip */}
      {nextStop && (
        <TouchableOpacity
          style={styles.nextStopChip}
          onPress={() => {
            if (onStopPress) {
              onStopPress(nextStop.place.id);
            } else {
              router.push(`/place/${nextStop.place.id}`);
            }
          }}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={["rgba(37,99,235,0.15)", "rgba(6,182,212,0.1)"]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.nextStopLeft}>
            <Text style={styles.nextStopEmoji}>
              {CATEGORY_ICONS[nextStop.place.category] ?? "📍"}
            </Text>
            <View>
              <Text style={styles.nextStopLabel}>NEXT STOP</Text>
              <Text style={styles.nextStopName} numberOfLines={1}>
                {nextStop.place.name}
              </Text>
            </View>
          </View>
          <View style={styles.nextStopRight}>
            <Text style={styles.nextStopEta}>{nextStop.etaMinutes} min</Text>
            <Text style={styles.nextStopDist}>{nextStop.distanceKm.toFixed(1)} km</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Off-route warning */}
      {progress.isOffRoute && (
        <View style={styles.offRouteBar}>
          <Text style={styles.offRouteText}>
            🛣 Off route by{" "}
            {progress.offRouteMeters >= 1000
              ? `${(progress.offRouteMeters / 1000).toFixed(1)} km`
              : `${Math.round(progress.offRouteMeters)} m`}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS["2xl"],
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: SPACING.xl,
    paddingTop: SPACING.sm,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "center",
    marginBottom: SPACING.md,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING.md,
  },
  destinationLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "700",
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginBottom: 2,
  },
  destinationText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
    color: COLORS.textPrimary,
    maxWidth: 220,
  },
  etaBox: {
    alignItems: "center",
    backgroundColor: "rgba(37,99,235,0.15)",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.3)",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  etaValue: {
    fontSize: FONT_SIZE["2xl"],
    fontWeight: "800",
    color: COLORS.primary,
  },
  etaUnit: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginTop: -2,
  },
  // Progress
  progressTrack: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 3,
    marginBottom: SPACING.base,
    overflow: "visible",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressDot: {
    position: "absolute",
    top: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.secondary,
    borderWidth: 2,
    borderColor: "#0F172A",
    transform: [{ translateX: -7 }],
  },
  // Stats
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.base,
  },
  statItem: { alignItems: "center", flex: 1 },
  statValue: {
    fontSize: FONT_SIZE.md,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  // Next stop
  nextStopChip: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.25)",
    padding: SPACING.md,
    overflow: "hidden",
  },
  nextStopLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    flex: 1,
  },
  nextStopEmoji: { fontSize: 24 },
  nextStopLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "700",
    color: COLORS.textMuted,
    letterSpacing: 0.8,
  },
  nextStopName: {
    fontSize: FONT_SIZE.base,
    fontWeight: "600",
    color: COLORS.textPrimary,
    maxWidth: 170,
  },
  nextStopRight: { alignItems: "flex-end" },
  nextStopEta: {
    fontSize: FONT_SIZE.md,
    fontWeight: "700",
    color: COLORS.secondary,
  },
  nextStopDist: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  // Off route
  offRouteBar: {
    marginTop: SPACING.sm,
    backgroundColor: "rgba(239,68,68,0.15)",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
    padding: SPACING.sm,
    alignItems: "center",
  },
  offRouteText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: COLORS.error,
  },
});
