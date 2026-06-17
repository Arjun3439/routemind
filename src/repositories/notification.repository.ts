// ============================================================
// RouteMind Phase 7 — Notification Repository
// ============================================================
// Supabase CRUD layer for the notifications table.
// ============================================================

import { supabase } from "@/services/supabase.client";
import type { LiveNotification, CreateNotificationParams, NotificationType } from "@/types";
import { NOTIFICATION_COOLDOWN_HOURS } from "@/constants";

// ============================================================
// Row shape from Supabase (snake_case → camelCase)
// ============================================================
interface NotificationRow {
  id: string;
  user_id: string;
  place_id: string | null;
  trip_id: string | null;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  sent_at: string;
  read_at: string | null;
}

function rowToLiveNotification(row: NotificationRow): LiveNotification {
  const data = row.data ?? {};
  return {
    id: row.id,
    userId: row.user_id,
    placeId: row.place_id ?? "",
    tripId: row.trip_id ?? undefined,
    title: row.title,
    body: row.body,
    data,
    sentAt: row.sent_at,
    readAt: row.read_at ?? undefined,
    notificationType: (data.notificationType as NotificationType) ?? "geofence_entry",
    isRead: row.read_at !== null,
  };
}

// ============================================================
// createNotification
// ============================================================
export async function createNotification(
  params: CreateNotificationParams
): Promise<LiveNotification | null> {
  const { data, error } = await supabase
    .from("notifications")
    .insert({
      user_id: params.userId,
      place_id: params.placeId ?? null,
      trip_id: params.tripId ?? null,
      title: params.title,
      body: params.body,
      data: {
        ...(params.data ?? {}),
        notificationType: params.notificationType,
      },
    })
    .select()
    .single<NotificationRow>();

  if (error) {
    console.error("[NotificationRepo] createNotification error:", error.message);
    return null;
  }

  return rowToLiveNotification(data);
}

// ============================================================
// markNotificationRead
// ============================================================
export async function markNotificationRead(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[NotificationRepo] markNotificationRead error:", error.message);
    return false;
  }
  return true;
}

// ============================================================
// getNotificationHistory
// ============================================================
export async function getNotificationHistory(
  userId: string,
  limit = 50
): Promise<LiveNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("sent_at", { ascending: false })
    .limit(limit)
    .returns<NotificationRow[]>();

  if (error) {
    console.error("[NotificationRepo] getNotificationHistory error:", error.message);
    return [];
  }

  return (data ?? []).map(rowToLiveNotification);
}

// ============================================================
// getUnreadCount
// ============================================================
export async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) {
    console.error("[NotificationRepo] getUnreadCount error:", error.message);
    return 0;
  }

  return count ?? 0;
}

// ============================================================
// isInCooldown — checks if a notification was sent for this
// place within NOTIFICATION_COOLDOWN_HOURS
// ============================================================
export async function isInCooldown(
  userId: string,
  placeId: string,
  cooldownHours = NOTIFICATION_COOLDOWN_HOURS
): Promise<boolean> {
  const since = new Date(
    Date.now() - cooldownHours * 60 * 60 * 1000
  ).toISOString();

  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("place_id", placeId)
    .gte("sent_at", since);

  if (error) {
    console.error("[NotificationRepo] isInCooldown error:", error.message);
    return false; // fail-open: allow notification if DB check fails
  }

  return (count ?? 0) > 0;
}

// ============================================================
// markAllRead
// ============================================================
export async function markAllRead(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) {
    console.error("[NotificationRepo] markAllRead error:", error.message);
    return false;
  }
  return true;
}
