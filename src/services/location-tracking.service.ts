// ============================================================
// RouteMind Phase 7 — Location Tracking Service
// ============================================================
// Manages foreground and background GPS tracking.
// Background tracking requires a physical device.
// ============================================================

import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import type { LocationUpdate } from "@/types";
import {
  LOCATION_TASK_NAME,
  BG_LOCATION_ACCURACY,
  BG_LOCATION_INTERVAL_MS,
  BG_LOCATION_DISTANCE_M,
  FG_LOCATION_INTERVAL_MS,
  FG_LOCATION_DISTANCE_M,
} from "@/constants";

// ============================================================
// Task definition — must be called at top-level (module scope).
// Imported by _layout.tsx before the app renders.
// ============================================================
export function defineBackgroundLocationTask(
  onLocation: (update: LocationUpdate) => void
): void {
  TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
      console.error("[LocationTask] error:", error.message);
      return;
    }

    const payload = data as { locations: Location.LocationObject[] };
    const locations = payload?.locations ?? [];

    for (const loc of locations) {
      onLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        speed: loc.coords.speed,
        heading: loc.coords.heading,
        accuracy: loc.coords.accuracy,
        timestamp: loc.timestamp,
      });
    }
  });
}

// ============================================================
// Permission helpers
// ============================================================
export async function requestForegroundPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === "granted";
}

export async function requestBackgroundPermission(): Promise<boolean> {
  // Background permission can only be requested after foreground is granted
  const fg = await requestForegroundPermission();
  if (!fg) return false;

  const { status } = await Location.requestBackgroundPermissionsAsync();
  return status === "granted";
}

export async function getForegroundPermissionStatus(): Promise<string> {
  const { status } = await Location.getForegroundPermissionsAsync();
  return status;
}

export async function getBackgroundPermissionStatus(): Promise<string> {
  const { status } = await Location.getBackgroundPermissionsAsync();
  return status;
}

// ============================================================
// Foreground tracking
// ============================================================
export async function startForegroundTracking(
  callback: (update: LocationUpdate) => void
): Promise<Location.LocationSubscription | null> {
  const granted = await requestForegroundPermission();
  if (!granted) {
    console.warn("[LocationTracking] Foreground permission denied");
    return null;
  }

  try {
    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: FG_LOCATION_INTERVAL_MS,
        distanceInterval: FG_LOCATION_DISTANCE_M,
      },
      (loc) => {
        callback({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          speed: loc.coords.speed,
          heading: loc.coords.heading,
          accuracy: loc.coords.accuracy,
          timestamp: loc.timestamp,
        });
      }
    );
    return subscription;
  } catch (err) {
    console.error("[LocationTracking] startForegroundTracking error:", err);
    return null;
  }
}

export function stopForegroundTracking(
  subscription: Location.LocationSubscription | null
): void {
  subscription?.remove();
}

// ============================================================
// Background tracking
// ============================================================
export async function startBackgroundTracking(): Promise<boolean> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if (!isRegistered) {
      console.warn("[LocationTracking] Background task not registered");
      return false;
    }

    const alreadyRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (alreadyRunning) return true;

    const granted = await requestBackgroundPermission();
    if (!granted) {
      console.warn("[LocationTracking] Background permission denied");
      return false;
    }

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: BG_LOCATION_ACCURACY as Location.Accuracy,
      timeInterval: BG_LOCATION_INTERVAL_MS,
      distanceInterval: BG_LOCATION_DISTANCE_M,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "RouteMind is tracking your trip",
        notificationBody: "Monitoring nearby stops and geofences",
        notificationColor: "#2563EB",
      },
      pausesUpdatesAutomatically: false,
    });

    return true;
  } catch (err) {
    console.error("[LocationTracking] startBackgroundTracking error:", err);
    return false;
  }
}

export async function stopBackgroundTracking(): Promise<void> {
  try {
    const running = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (running) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
  } catch (err) {
    console.error("[LocationTracking] stopBackgroundTracking error:", err);
  }
}

export async function isBackgroundTrackingActive(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  } catch {
    return false;
  }
}

// ============================================================
// One-shot current location
// ============================================================
export async function getCurrentLocation(): Promise<LocationUpdate | null> {
  try {
    const granted = await requestForegroundPermission();
    if (!granted) return null;

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      speed: loc.coords.speed,
      heading: loc.coords.heading,
      accuracy: loc.coords.accuracy,
      timestamp: loc.timestamp,
    };
  } catch (err) {
    console.error("[LocationTracking] getCurrentLocation error:", err);
    return null;
  }
}
