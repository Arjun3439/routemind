// ============================================================
// RouteMind — Notification Service
// ============================================================
// Real push notifications and background geofencing using:
//   - expo-notifications  (local + push token registration)
//   - expo-location       (background location updates)
//   - expo-task-manager   (background task execution)
//
// IMPORTANT — NATIVE REBUILD REQUIRED:
//   These APIs use native modules that are NOT available in Expo Go.
//   After adding this service you must run:
//     npx expo run:ios   (or run:android)
//   to generate a native build. The app will silently skip geofencing
//   inside Expo Go (guarded by Constants.appOwnership checks).
//
// Permissions required (already added to app.json):
//   iOS:  NSLocationWhenInUseUsageDescription
//         NSLocationAlwaysAndWhenInUseUsageDescription
//         UIBackgroundModes: location, fetch
//   Android: ACCESS_FINE_LOCATION, FOREGROUND_SERVICE, POST_NOTIFICATIONS
// ============================================================

import * as Notifications from "expo-notifications";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { supabase } from "./supabase.client";
import type { Place } from "@/types";

// ─── Constants ────────────────────────────────────────────────

const GEOFENCE_TASK_NAME = "ROUTEMIND_GEOFENCE_TASK";
const APPROACH_THRESHOLD_METERS = 2000; // 2 km
const LOCATION_INTERVAL_MS = 30_000;    // poll every 30 seconds in background

// In-memory store for active trip places during background monitoring
let _monitoredPlaces: Place[] = [];

// ─── Background Task Definition ───────────────────────────────
// Must be defined at module scope (top-level), not inside any function.

TaskManager.defineTask(GEOFENCE_TASK_NAME, async ({ data, error }: any) => {
  if (error) {
    console.error("[Geofence Task] error:", error.message);
    return;
  }

  if (!data?.locations || _monitoredPlaces.length === 0) return;

  const [location] = data.locations as Location.LocationObject[];
  const { latitude, longitude } = location.coords;

  for (const place of _monitoredPlaces) {
    const distanceMeters = haversineMeters(latitude, longitude, place.lat, place.lng);

    if (distanceMeters <= APPROACH_THRESHOLD_METERS) {
      // Check if already notified for this place (dedup via Supabase trip_places)
      const alreadyNotified = await checkAlreadyNotified(place.id);
      if (alreadyNotified) continue;

      await scheduleApproachNotification(place);
      await markPlaceNotified(place.id);
    }
  }
});

// ─── Permissions ──────────────────────────────────────────────

/**
 * Request notification permissions and set up Android notification channel.
 * Returns true if granted, false otherwise.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  // Create Android channel first
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("routemind-alerts", {
      name: "RouteMind Alerts",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#2563EB",
      sound: "default",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    finalStatus = status;
  }

  if (finalStatus !== "granted") return false;

  // Register push token on permission grant
  await registerPushToken();
  return true;
}

// ─── Push Token Registration ──────────────────────────────────

/**
 * Get the Expo push token and upsert it into `push_tokens` for the
 * current authenticated user. Safe to call multiple times (idempotent).
 */
async function registerPushToken(): Promise<void> {
  // Skip in Expo Go — push tokens only work in standalone/development builds
  if (Constants.appOwnership === "expo") return;

  try {
    const { data: tokenData } = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });

    if (!tokenData) return;

    // Get current user
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;
    if (!userId) return;

    const deviceType = Platform.OS === "ios" ? "ios" : "android";

    await supabase.from("push_tokens").upsert(
      {
        user_id: userId,
        expo_push_token: tokenData,
        device_type: deviceType,
        is_active: true,
      },
      { onConflict: "user_id,expo_push_token" }
    );
  } catch (err) {
    console.error("[Push Token] registration failed:", (err as Error).message);
  }
}

// ─── Local Notifications ──────────────────────────────────────

// Set default notification handler behaviour (show alert + play sound)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Schedule a local approach notification for a place.
 * Shows immediately (triggerInSeconds = 0) or after a delay.
 * Returns the notification identifier, or null on failure.
 */
export async function scheduleApproachNotification(
  place: Place,
  triggerInSeconds = 0
): Promise<string | null> {
  try {
    const notifId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `📍 ${place.name} is nearby!`,
        body: `Worth Stop Score: ${place.worthStopScore}/100 · ${place.detourMinutes} min detour`,
        data: {
          placeId: place.id,
          googlePlaceId: place.googlePlaceId,
          lat: place.lat,
          lng: place.lng,
        },
        sound: "default",
      },
      trigger:
        triggerInSeconds > 0
          ? { seconds: triggerInSeconds, type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL }
          : null,
    });

    // Log notification to Supabase for audit / read-receipts
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;

    if (userId) {
      await supabase.from("notifications").insert({
        user_id: userId,
        place_id: place.id,
        type: "approach",
        title: `📍 ${place.name} is nearby!`,
        body: `Worth Stop Score: ${place.worthStopScore}/100 · ${place.detourMinutes} min detour`,
        status: "sent",
      });
    }

    return notifId;
  } catch (err) {
    console.error("[Notifications] scheduleApproachNotification failed:", (err as Error).message);
    return null;
  }
}

// ─── Geofence Monitoring ──────────────────────────────────────

/**
 * Start background location monitoring for a list of places.
 * Triggers a local notification when the device enters the 2km radius
 * of any place in the list.
 *
 * NOTE: Requires native build (not supported in Expo Go).
 * The function guards against Expo Go via Constants.appOwnership.
 */
export async function startGeofenceMonitoring(places: Place[]): Promise<void> {
  if (places.length === 0) return;

  // Expo Go guard — silently skip background tasks in sandboxed environment
  if (Constants.appOwnership === "expo") return;

  _monitoredPlaces = places;

  try {
    // Request background location permission
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== "granted") return;

    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    if (bgStatus !== "granted") return;

    // Stop any existing task before starting fresh
    const isRegistered = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK_NAME);
    if (isRegistered) {
      await Location.stopLocationUpdatesAsync(GEOFENCE_TASK_NAME);
    }

    await Location.startLocationUpdatesAsync(GEOFENCE_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: LOCATION_INTERVAL_MS,
      distanceInterval: 200, // minimum 200m movement before triggering
      deferredUpdatesInterval: LOCATION_INTERVAL_MS,
      showsBackgroundLocationIndicator: true, // iOS blue bar
      foregroundService: {
        notificationTitle: "RouteMind is watching for stops",
        notificationBody: `Monitoring ${places.length} places on your route`,
        notificationColor: "#2563EB",
      },
    });
  } catch (err) {
    console.error("[Geofence] startGeofenceMonitoring failed:", (err as Error).message);
  }
}

/**
 * Stop background geofence monitoring and clear monitored places.
 */
export async function stopGeofenceMonitoring(): Promise<void> {
  _monitoredPlaces = [];

  if (Constants.appOwnership === "expo") return;

  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK_NAME);
    if (isRegistered) {
      await Location.stopLocationUpdatesAsync(GEOFENCE_TASK_NAME);
    }
  } catch (err) {
    console.error("[Geofence] stopGeofenceMonitoring failed:", (err as Error).message);
  }
}

// ─── Dismiss Notifications ────────────────────────────────────

/**
 * Dismiss all delivered notifications from the notification center
 * and mark relevant DB rows as dismissed.
 */
export async function dismissAllNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();

  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;
  if (!userId) return;

  await supabase
    .from("notifications")
    .update({ status: "dismissed", read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .in("status", ["pending", "sent"]);
}

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Haversine formula — great-circle distance in metres between two coords.
 */
function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Check whether the user was already notified about this place
 * by looking for a non-null `notified_at` in `trip_places`.
 */
async function checkAlreadyNotified(placeId: string): Promise<boolean> {
  const { data } = await supabase
    .from("trip_places")
    .select("notified_at")
    .eq("place_id", placeId)
    .not("notified_at", "is", null)
    .maybeSingle();

  return !!data;
}

/**
 * Write `notified_at = now()` to trip_places for this place
 * so we don't re-notify on subsequent location updates.
 */
async function markPlaceNotified(placeId: string): Promise<void> {
  await supabase
    .from("trip_places")
    .update({ notified_at: new Date().toISOString() })
    .eq("place_id", placeId)
    .is("notified_at", null); // only update if not already marked
}
