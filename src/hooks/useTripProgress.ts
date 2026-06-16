// ============================================================
// RouteMind Phase 7 — useTripProgress
// ============================================================
// Polls trip progress every 5 seconds while tracking is active.
// Integrates TripMonitorService, GeofenceService, and
// NotificationService to fire alerts automatically.
// ============================================================

import { useEffect, useRef, useCallback } from "react";
import { useTripStore } from "@/store";
import { useTripMonitorStore, selectTriggeredThresholdsForPlace } from "@/store/trip-monitor.store";
import {
  calculateTripProgress,
  calculateNearbyStops,
  getNewProximityAlerts,
  estimateSpeedFromHistory,
  decodeAndCachePolyline,
} from "@/services/trip-monitor.service";
import {
  checkGeofenceEntries,
  isInLocalCooldown,
  buildGeofenceNotificationMessage,
  buildProximityAlertMessage,
} from "@/services/geofence.service";
import {
  scheduleGeofenceNotification,
  scheduleApproachNotification,
  scheduleDeviationNotification,
  scheduleSmartRecommendationNotification,
} from "@/services/notification.service";
import { createNotification, isInCooldown } from "@/repositories/notification.repository";
import type { LatLng, TripProgress, ProximityThresholdKm } from "@/types";
import { useAuthStore } from "@/store";

const POLL_INTERVAL_MS = 5000;

interface UseTripProgressResult {
  tripProgress: TripProgress | null;
  isActive: boolean;
}

export function useTripProgress(): UseTripProgressResult {
  const { currentTrip, discoveredPlaces } = useTripStore();
  const { user } = useAuthStore();

  const {
    currentLocation,
    currentSpeed,
    locationHistory,
    isTracking,
    tripProgress,
    activeGeofences,
    updateTripProgress,
    setNearbyStops,
    updateGeofence,
    addNotification,
    markThresholdTriggered,
    isThresholdTriggered,
    setDeviationAlertShown,
    deviationAlertShown,
    lastDeviationNotifiedAt,
    setLastDeviationNotifiedAt,
  } = useTripMonitorStore();

  const polylinePointsRef = useRef<LatLng[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Decode polyline once when trip changes
  useEffect(() => {
    if (currentTrip?.polyline) {
      polylinePointsRef.current = decodeAndCachePolyline(currentTrip.polyline);
    } else {
      polylinePointsRef.current = [];
    }
  }, [currentTrip?.polyline]);

  const runMonitorCycle = useCallback(async () => {
    if (!currentLocation || !currentTrip || !isTracking) return;

    const polylinePoints = polylinePointsRef.current;
    if (polylinePoints.length === 0) return;

    // ── Estimate speed ───────────────────────────────────────────
    const speedKmh = currentSpeed > 0
      ? currentSpeed
      : estimateSpeedFromHistory(locationHistory);

    // ── Build threshold map for service ─────────────────────────
    const thresholdMap = new Map<string, Set<ProximityThresholdKm>>(
      discoveredPlaces.map((p) => [
        p.id,
        new Set((useTripMonitorStore.getState().triggeredThresholds[p.id] ?? []) as ProximityThresholdKm[]),
      ])
    );

    // ── Calculate progress ───────────────────────────────────────
    const progress = calculateTripProgress(
      currentLocation,
      currentTrip,
      polylinePoints,
      speedKmh,
      discoveredPlaces,
      thresholdMap
    );
    updateTripProgress(progress);

    // ── Calculate nearby stops ───────────────────────────────────
    const nearby = calculateNearbyStops(
      currentLocation,
      discoveredPlaces,
      speedKmh,
      thresholdMap
    );
    setNearbyStops(nearby);

    // ── Proximity threshold alerts ───────────────────────────────
    const newAlerts = getNewProximityAlerts(nearby, thresholdMap);

    for (const { stop, threshold } of newAlerts) {
      if (!isThresholdTriggered(stop.place.id, threshold)) {
        const message = buildProximityAlertMessage(stop.place, stop.distanceKm, stop.etaMinutes);
        const notifId = await scheduleApproachNotification(stop.place);

        markThresholdTriggered(stop.place.id, threshold);

        if (notifId && user) {
          const saved = await createNotification({
            userId: user.id,
            placeId: stop.place.id,
            tripId: currentTrip.id,
            title: stop.place.name,
            body: message,
            data: { threshold, notifId },
            notificationType: "proximity_alert",
          });
          if (saved) addNotification(saved);
        }
      }
    }

    // ── Geofence entry checks ────────────────────────────────────
    const justEntered = checkGeofenceEntries(currentLocation, activeGeofences);

    for (const geofence of justEntered) {
      if (isInLocalCooldown(geofence)) continue;

      // Check DB-level cooldown too
      if (user) {
        const inCooldown = await isInCooldown(user.id, geofence.place.id);
        if (inCooldown) continue;
      }

      const body = buildGeofenceNotificationMessage(geofence.place);
      await scheduleGeofenceNotification(geofence.place);

      // Mark cooldown
      updateGeofence(geofence.place.id, {
        lastNotifiedAt: new Date().toISOString(),
      });

      if (user) {
        const saved = await createNotification({
          userId: user.id,
          placeId: geofence.place.id,
          tripId: currentTrip.id,
          title: `You're near ${geofence.place.name}!`,
          body,
          notificationType: "geofence_entry",
        });
        if (saved) addNotification(saved);
      }
    }

    // ── Route deviation alert ────────────────────────────────────
    if (progress.isOffRoute && !deviationAlertShown) {
      const cooldownMs = 10 * 60 * 1000; // re-alert at most every 10 min
      const lastNotified = lastDeviationNotifiedAt
        ? new Date(lastDeviationNotifiedAt).getTime()
        : 0;

      if (Date.now() - lastNotified > cooldownMs) {
        await scheduleDeviationNotification(progress.offRouteMeters);
        setDeviationAlertShown(true);
        setLastDeviationNotifiedAt(new Date().toISOString());

        if (user) {
          const distText = progress.offRouteMeters >= 1000
            ? `${(progress.offRouteMeters / 1000).toFixed(1)} km`
            : `${Math.round(progress.offRouteMeters)} m`;
          const saved = await createNotification({
            userId: user.id,
            tripId: currentTrip.id,
            title: "🛣 Off Route",
            body: `You appear to be ${distText} from your planned route.`,
            data: { offRouteMeters: progress.offRouteMeters },
            notificationType: "route_deviation",
          });
          if (saved) addNotification(saved);
        }
      }
    }

    // Re-arm deviation alert when back on route
    if (!progress.isOffRoute && deviationAlertShown) {
      setDeviationAlertShown(false);
    }
  }, [
    currentLocation,
    currentTrip,
    isTracking,
    currentSpeed,
    locationHistory,
    discoveredPlaces,
    activeGeofences,
    deviationAlertShown,
    lastDeviationNotifiedAt,
    user,
  ]);

  // Poll every 5 seconds while tracking
  useEffect(() => {
    if (isTracking && currentTrip) {
      intervalRef.current = setInterval(runMonitorCycle, POLL_INTERVAL_MS);
      // Run once immediately
      runMonitorCycle();
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isTracking, currentTrip, runMonitorCycle]);

  return {
    tripProgress,
    isActive: isTracking,
  };
}
