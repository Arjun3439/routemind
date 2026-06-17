// ============================================================
// RouteMind Phase 7 — LiveTravelBanner Component
// ============================================================
// Animated scrolling banner showing next stop info or alerts.
// Appears at the top of active trip screens.
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
import type { NearbyStop, TripProgress } from "@/types";

type BannerPriority = "info" | "warning" | "alert";

interface LiveTravelBannerProps {
  nextStop?: NearbyStop | null;
  progress?: TripProgress | null;
  customMessage?: string;
  priority?: BannerPriority;
}

const PRIORITY_COLORS: Record<BannerPriority, [string, string]> = {
  info:    ["rgba(37,99,235,0.85)", "rgba(6,182,212,0.75)"],
  warning: ["rgba(245,158,11,0.85)", "rgba(251,191,36,0.75)"],
  alert:   ["rgba(239,68,68,0.85)", "rgba(220,38,38,0.75)"],
};

function buildBannerText(
  nextStop: NearbyStop | null | undefined,
  progress: TripProgress | null | undefined
): { text: string; icon: string; priority: BannerPriority } {
  // Off-route takes highest priority
  if (progress?.isOffRoute) {
    const dist = progress.offRouteMeters >= 1000
      ? `${(progress.offRouteMeters / 1000).toFixed(1)} km`
      : `${Math.round(progress.offRouteMeters)} m`;
    return {
      text: `Off your planned route by ${dist}`,
      icon: "🛣",
      priority: "alert",
    };
  }

  // Next stop
  if (nextStop) {
    const emoji = CATEGORY_ICONS[nextStop.place.category] ?? "📍";
    if (nextStop.distanceKm <= 5) {
      return {
        text: `${nextStop.place.name} is only ${nextStop.distanceKm.toFixed(1)} km away`,
        icon: emoji,
        priority: "warning",
      };
    }
    return {
      text: `Next Stop: ${nextStop.place.name} (${nextStop.etaMinutes} min)`,
      icon: emoji,
      priority: "info",
    };
  }

  return {
    text: "Tracking your route",
    icon: "🗺",
    priority: "info",
  };
}

export function LiveTravelBanner({
  nextStop,
  progress,
  customMessage,
  priority: overridePriority,
}: LiveTravelBannerProps) {
  const router = useRouter();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(-60)).current;

  const { text, icon, priority } = customMessage
    ? { text: customMessage, icon: "🔔", priority: overridePriority ?? "info" }
    : buildBannerText(nextStop, progress);

  const finalPriority = overridePriority ?? priority;
  const gradientColors = PRIORITY_COLORS[finalPriority];

  // Entrance animation
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 80,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, []);

  // Pulse on alert
  useEffect(() => {
    if (finalPriority === "alert") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.02, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [finalPriority]);

  const handlePress = () => {
    if (nextStop?.place.id) {
      router.push(`/place/${nextStop.place.id}`);
    }
  };

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { transform: [{ translateY: slideAnim }, { scale: pulseAnim }] },
      ]}
    >
      <TouchableOpacity onPress={handlePress} activeOpacity={nextStop ? 0.8 : 1}>
        <LinearGradient colors={gradientColors} style={styles.banner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          {/* Animated activity indicator dot */}
          <View style={styles.liveDot}>
            <View style={styles.liveDotInner} />
          </View>

          <Text style={styles.icon}>{icon}</Text>
          <Text style={styles.text} numberOfLines={1}>
            {text}
          </Text>

          {nextStop && (
            <View style={styles.arrowBadge}>
              <Text style={styles.arrowText}>→</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: SPACING.base,
    marginTop: SPACING.xs,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.base,
    gap: SPACING.xs,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.4)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 2,
  },
  liveDotInner: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#fff",
  },
  icon: {
    fontSize: 16,
  },
  text: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.2,
  },
  arrowBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: RADIUS.full,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  arrowText: {
    color: "#fff",
    fontSize: FONT_SIZE.sm,
    fontWeight: "700",
  },
});
