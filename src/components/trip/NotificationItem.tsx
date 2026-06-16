// ============================================================
// RouteMind Phase 7 — NotificationItem Component
// ============================================================

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import type { LiveNotification, NotificationType } from "@/types";
import { COLORS, SPACING, FONT_SIZE, RADIUS } from "@/constants";

interface NotificationItemProps {
  notification: LiveNotification;
  onMarkRead: (id: string) => void;
}

// ── Icon & colour by notification type ──────────────────────
const TYPE_CONFIG: Record<
  NotificationType,
  { icon: string; color: string; label: string }
> = {
  geofence_entry:       { icon: "📍", color: "#2563EB", label: "Nearby Stop" },
  geofence_exit:        { icon: "👋", color: "#64748B", label: "Left Area" },
  proximity_alert:      { icon: "🔔", color: "#06B6D4", label: "Approaching" },
  route_deviation:      { icon: "🛣", color: "#EF4444", label: "Off Route" },
  smart_recommendation: { icon: "⭐", color: "#F59E0B", label: "Recommendation" },
};

function getRelativeTime(sentAt: string): string {
  const diff = Date.now() - new Date(sentAt).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export function NotificationItem({ notification, onMarkRead }: NotificationItemProps) {
  const router = useRouter();
  const config = TYPE_CONFIG[notification.notificationType] ?? TYPE_CONFIG.geofence_entry;
  const isUnread = !notification.isRead;

  const handlePress = () => {
    if (isUnread) onMarkRead(notification.id);
    if (notification.placeId) {
      router.push(`/place/${notification.placeId}`);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, isUnread && styles.containerUnread]}
      onPress={handlePress}
      activeOpacity={0.75}
    >
      {/* Unread indicator strip */}
      {isUnread && (
        <View style={[styles.unreadStrip, { backgroundColor: config.color }]} />
      )}

      {/* Icon badge */}
      <View style={[styles.iconBadge, { backgroundColor: config.color + "22" }]}>
        <Text style={styles.iconText}>{config.icon}</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View style={[styles.typePill, { backgroundColor: config.color + "33" }]}>
            <Text style={[styles.typeLabel, { color: config.color }]}>
              {config.label}
            </Text>
          </View>
          <Text style={styles.timestamp}>{getRelativeTime(notification.sentAt)}</Text>
        </View>

        <Text style={[styles.title, isUnread && styles.titleUnread]} numberOfLines={1}>
          {notification.title}
        </Text>
        <Text style={styles.body} numberOfLines={2}>
          {notification.body}
        </Text>
      </View>

      {/* Unread dot */}
      {isUnread && <View style={[styles.unreadDot, { backgroundColor: config.color }]} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    padding: SPACING.md,
    marginBottom: SPACING.xs,
    overflow: "hidden",
  },
  containerUnread: {
    backgroundColor: "rgba(37,99,235,0.06)",
    borderColor: "rgba(37,99,235,0.2)",
  },
  unreadStrip: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: RADIUS.lg,
    borderBottomLeftRadius: RADIUS.lg,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.md,
    flexShrink: 0,
  },
  iconText: {
    fontSize: 20,
  },
  content: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.xs,
    gap: SPACING.xs,
  },
  typePill: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  typeLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  timestamp: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginLeft: "auto",
  },
  title: {
    fontSize: FONT_SIZE.base,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  titleUnread: {
    color: COLORS.textPrimary,
  },
  body: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: SPACING.sm,
    flexShrink: 0,
  },
});
