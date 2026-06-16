// ============================================================
// RouteMind Phase 7 — Notification Service
// ============================================================
// Local notifications work in both Expo Go and development builds.
// Remote push + setNotificationHandler are guarded for Expo Go.
// ============================================================

import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { router } from "expo-router";
import type { Place } from "@/types";

/** True when running inside Expo Go (SDK 53+ removed remote push) */
const IS_EXPO_GO = Constants.appOwnership === "expo";


// ============================================================
// Foreground handler — show notifications even when app is open
// No-op in Expo Go to avoid SDK 53+ push-registration conflict.
// ============================================================
export function configureForegroundNotificationHandler(): void {
  if (IS_EXPO_GO) return; // silently skip in Expo Go

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// ============================================================
// Permission request
// ============================================================
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();

  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });

  if (status !== "granted") {
    console.warn("[NotificationService] Permission not granted:", status);
    return false;
  }

  // Android 13+ notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("routemind", {
      name: "RouteMind Alerts",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#2563EB",
      sound: "default",
    });

    await Notifications.setNotificationChannelAsync("routemind-proximity", {
      name: "Nearby Stops",
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: "default",
    });

    await Notifications.setNotificationChannelAsync("routemind-deviation", {
      name: "Route Alerts",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 500, 200, 500],
      lightColor: "#EF4444",
      sound: "default",
    });
  }

  return true;
}

// ============================================================
// Schedule a local notification immediately
// ============================================================
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data: Record<string, unknown> = {},
  channelId = "routemind"
): Promise<string | null> {
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: "default",
        ...(Platform.OS === "android" ? { channelId } : {}),
      },
      trigger: null, // fire immediately
    });
    return id;
  } catch (err) {
    console.error("[NotificationService] scheduleLocalNotification error:", err);
    return null;
  }
}

// ============================================================
// Schedule a proximity (approach) notification
// ============================================================
export async function scheduleApproachNotification(
  place: Place,
  triggerInSeconds = 0
): Promise<string | null> {
  const emoji = getCategoryEmoji(place.category);
  const title = `${emoji} ${place.name}`;
  const body = buildApproachBody(place);

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: {
          type: "proximity_alert",
          placeId: place.id,
          placeName: place.name,
          placeCategory: place.category,
        },
        sound: "default",
        ...(Platform.OS === "android" ? { channelId: "routemind-proximity" } : {}),
      },
      trigger:
        triggerInSeconds > 0
          ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: triggerInSeconds, repeats: false }
          : null,
    });
    return id;
  } catch (err) {
    console.error("[NotificationService] scheduleApproachNotification error:", err);
    return null;
  }
}

// ============================================================
// Schedule a geofence entry notification
// ============================================================
export async function scheduleGeofenceNotification(
  place: Place,
  communityTip?: string
): Promise<string | null> {
  const emoji = getCategoryEmoji(place.category);
  const title = `${emoji} You're near ${place.name}!`;

  let body = `${formatRating(place.rating, place.totalRatings)} · ${place.address}`;
  if (communityTip) {
    body += `\n💬 "${communityTip}"`;
  }

  return scheduleLocalNotification(title, body, {
    type: "geofence_entry",
    placeId: place.id,
    placeName: place.name,
  });
}

// ============================================================
// Schedule route deviation notification
// ============================================================
export async function scheduleDeviationNotification(
  offRouteMeters: number
): Promise<string | null> {
  const distanceText =
    offRouteMeters >= 1000
      ? `${(offRouteMeters / 1000).toFixed(1)} km`
      : `${Math.round(offRouteMeters)} m`;

  return scheduleLocalNotification(
    "🛣 Off Route",
    `You appear to be ${distanceText} from your planned route. Recalculate?`,
    { type: "route_deviation", offRouteMeters },
    "routemind-deviation"
  );
}

// ============================================================
// Schedule a smart recommendation notification
// ============================================================
export async function scheduleSmartRecommendationNotification(
  place: Place,
  insight: string
): Promise<string | null> {
  const emoji = getCategoryEmoji(place.category);
  return scheduleLocalNotification(
    `${emoji} ${place.name}`,
    insight,
    {
      type: "smart_recommendation",
      placeId: place.id,
      placeName: place.name,
    }
  );
}

// ============================================================
// Dismiss all pending notifications
// ============================================================
export async function dismissAllNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ============================================================
// Handle notification tap — deep-link to place
// ============================================================
export function handleNotificationResponse(
  response: Notifications.NotificationResponse
): void {
  const data = response.notification.request.content.data as Record<string, unknown>;
  const placeId = data?.placeId as string | undefined;

  if (placeId) {
    router.push(`/place/${placeId}`);
  }
}

// ============================================================
// Set badge count
// ============================================================
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

// ============================================================
// Helpers
// ============================================================
function getCategoryEmoji(category: string): string {
  const map: Record<string, string> = {
    restaurant: "🍽",
    cafe: "☕",
    attraction: "🏛",
    hidden_gem: "💎",
    viewpoint: "🌄",
    shopping: "🛍",
    gas_station: "⛽",
    hotel: "🏨",
    other: "📍",
  };
  return map[category] ?? "📍";
}

function formatRating(rating: number, totalRatings: number): string {
  if (!rating) return "No ratings yet";
  return `⭐ ${rating.toFixed(1)} (${totalRatings.toLocaleString()} reviews)`;
}

function buildApproachBody(place: Place): string {
  const parts: string[] = [];

  if (place.detourKm <= 1) {
    parts.push(`Only ${place.detourKm.toFixed(1)} km off route`);
  } else {
    parts.push(`${place.detourKm.toFixed(1)} km detour`);
  }

  if (place.rating >= 4.5) {
    parts.push(`⭐ ${place.rating} rated`);
  }

  if (place.worthStopScore >= 75) {
    parts.push("Highly recommended!");
  }

  return parts.join(" · ");
}
