// ============================================================
// RouteMind Phase 7 — useNotificationHistory
// ============================================================
// Fetches notification history from Supabase, merges with
// in-memory store notifications, and provides markRead actions.
// ============================================================

import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/clerk-expo";
import { useAuthStore } from "@/store";
import { useTripMonitorStore, selectUnreadCount } from "@/store/trip-monitor.store";
import {
  getNotificationHistory,
  markNotificationRead,
  markAllRead,
} from "@/repositories/notification.repository";
import type { LiveNotification } from "@/types";

const NOTIFICATION_HISTORY_KEY = "notification-history";

interface UseNotificationHistoryResult {
  notifications: LiveNotification[];
  unreadCount: number;
  isLoading: boolean;
  isError: boolean;
  markRead: (id: string) => void;
  markAllAsRead: () => void;
  refetch: () => void;
}

export function useNotificationHistory(): UseNotificationHistoryResult {
  const { user: clerkUser } = useUser();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const {
    notifications: storeNotifications,
    markNotificationRead: storeMarkRead,
    markAllNotificationsRead,
  } = useTripMonitorStore();

  const unreadCount = useTripMonitorStore(selectUnreadCount);

  // ── Fetch from Supabase ──────────────────────────────────────
  const { data: dbNotifications = [], isLoading, isError, refetch } = useQuery({
    queryKey: [NOTIFICATION_HISTORY_KEY, user?.id],
    queryFn: () => getNotificationHistory(user!.id, 50),
    enabled: !!user?.id,
    staleTime: 30_000, // 30 seconds
    gcTime: 5 * 60_000, // 5 minutes
  });

  // ── Merge store + DB notifications (deduplicate by id) ──────
  const mergedNotifications = useCallback((): LiveNotification[] => {
    const seen = new Set<string>();
    const all: LiveNotification[] = [];

    // Store notifications (most recent, not persisted to DB yet)
    for (const n of storeNotifications) {
      if (!seen.has(n.id)) {
        seen.add(n.id);
        all.push(n);
      }
    }

    // DB notifications
    for (const n of dbNotifications) {
      if (!seen.has(n.id)) {
        seen.add(n.id);
        all.push(n);
      }
    }

    // Sort by sentAt desc
    return all.sort(
      (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
    );
  }, [storeNotifications, dbNotifications]);

  // ── Mark single read ─────────────────────────────────────────
  const markReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onMutate: (id) => {
      // Optimistic update in store
      storeMarkRead(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATION_HISTORY_KEY, user?.id] });
    },
  });

  // ── Mark all read ────────────────────────────────────────────
  const markAllReadMutation = useMutation({
    mutationFn: () => markAllRead(user!.id),
    onMutate: () => {
      markAllNotificationsRead();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATION_HISTORY_KEY, user?.id] });
    },
  });

  return {
    notifications: mergedNotifications(),
    unreadCount,
    isLoading,
    isError,
    markRead: (id: string) => markReadMutation.mutate(id),
    markAllAsRead: () => user && markAllReadMutation.mutate(),
    refetch,
  };
}
