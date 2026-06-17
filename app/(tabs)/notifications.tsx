// ============================================================
// RouteMind Phase 7 — Notifications Screen
// ============================================================
// app/(tabs)/notifications.tsx
// Full notification history with read/unread states,
// date grouping, and deep links to places.
// ============================================================

import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useNotificationHistory } from "@/hooks/useNotificationHistory";
import { NotificationItem } from "@/components/trip/NotificationItem";
import { COLORS, SPACING, FONT_SIZE, RADIUS } from "@/constants";
import type { LiveNotification } from "@/types";

// ── Date grouping ────────────────────────────────────────────
function getDateLabel(sentAt: string): string {
  const date = new Date(sentAt);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays <= 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-IN", { month: "long", day: "numeric" });
}

interface SectionData {
  title: string;
  data: LiveNotification[];
}

function groupNotificationsByDate(notifications: LiveNotification[]): SectionData[] {
  const groups = new Map<string, LiveNotification[]>();

  for (const n of notifications) {
    const label = getDateLabel(n.sentAt);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(n);
  }

  return Array.from(groups.entries()).map(([title, data]) => ({ title, data }));
}

// ── Screen component ─────────────────────────────────────────
export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const {
    notifications,
    unreadCount,
    isLoading,
    isError,
    markRead,
    markAllAsRead,
    refetch,
  } = useNotificationHistory();

  const sections = useMemo(
    () => groupNotificationsByDate(notifications),
    [notifications]
  );

  const renderItem = useCallback(
    ({ item }: { item: LiveNotification }) => (
      <NotificationItem notification={item} onMarkRead={markRead} />
    ),
    [markRead]
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionData }) => (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>{section.title}</Text>
        <View style={styles.sectionDivider} />
      </View>
    ),
    []
  );

  const ListEmpty = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🔔</Text>
      <Text style={styles.emptyTitle}>No Notifications Yet</Text>
      <Text style={styles.emptyBody}>
        Start a trip to get smart alerts about nearby stops, geofences, and route updates.
      </Text>
    </View>
  );

  const ListError = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>⚠️</Text>
      <Text style={styles.emptyTitle}>Could Not Load Notifications</Text>
      <TouchableOpacity style={styles.retryButton} onPress={refetch}>
        <Text style={styles.retryText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Background */}
      <LinearGradient
        colors={["#020617", "#0A1628", "#0F172A"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative blob */}
      <View style={styles.blob} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={styles.headerSubtitle}>{unreadCount} unread alerts</Text>
          )}
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllBtn} onPress={markAllAsRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}

        {unreadCount === 0 && notifications.length > 0 && (
          <View style={styles.allReadBadge}>
            <Text style={styles.allReadText}>✓ All read</Text>
          </View>
        )}
      </View>

      {/* Unread count badge strip */}
      {unreadCount > 0 && (
        <View style={styles.unreadStrip}>
          <View style={styles.unreadDot} />
          <Text style={styles.unreadStripText}>
            {unreadCount} new alert{unreadCount !== 1 ? "s" : ""} since your last visit
          </Text>
        </View>
      )}

      {/* Loading state */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      )}

      {/* Error state */}
      {isError && !isLoading && <ListError />}

      {/* Notification list */}
      {!isLoading && !isError && (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          ListEmptyComponent={ListEmpty}
          contentContainerStyle={[
            styles.listContent,
            sections.length === 0 && styles.listContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refetch}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  blob: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(37,99,235,0.08)",
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.base,
    paddingBottom: SPACING.md,
  },
  headerTitle: {
    fontSize: FONT_SIZE["3xl"],
    fontWeight: "800",
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.primary,
    fontWeight: "600",
    marginTop: 2,
  },
  markAllBtn: {
    backgroundColor: "rgba(37,99,235,0.15)",
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.3)",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  markAllText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: COLORS.primary,
  },
  allReadBadge: {
    backgroundColor: "rgba(16,185,129,0.12)",
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.25)",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  allReadText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: COLORS.success,
  },
  // Unread strip
  unreadStrip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(37,99,235,0.08)",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(37,99,235,0.15)",
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.xs,
    gap: SPACING.xs,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  unreadStripText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.primary,
    fontWeight: "500",
  },
  // Section
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.sm,
    marginTop: SPACING.base,
    gap: SPACING.sm,
  },
  sectionHeaderText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "700",
    color: COLORS.textMuted,
    letterSpacing: 1,
    textTransform: "uppercase",
    flexShrink: 0,
  },
  sectionDivider: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  // List
  listContent: {
    paddingHorizontal: SPACING.base,
    paddingBottom: 100,
  },
  listContentEmpty: {
    flex: 1,
    justifyContent: "center",
  },
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: FONT_SIZE.base,
    color: COLORS.textSecondary,
  },
  // Empty
  emptyState: {
    alignItems: "center",
    paddingHorizontal: SPACING["2xl"],
    paddingTop: SPACING["5xl"],
    gap: SPACING.md,
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  emptyBody: {
    fontSize: FONT_SIZE.base,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  retryButton: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  retryText: {
    fontSize: FONT_SIZE.base,
    fontWeight: "700",
    color: "#fff",
  },
});
