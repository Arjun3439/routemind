// ============================================================
// RouteMind Phase 7 — useLiveLocation
// ============================================================
// Starts foreground GPS tracking, feeds updates into
// TripMonitorStore, and returns current location + speed.
// ============================================================

import { useEffect, useRef, useCallback } from "react";
import type { LocationSubscription } from "expo-location";
import { useTripMonitorStore } from "@/store";
import {
  startForegroundTracking,
  stopForegroundTracking,
} from "@/services/location-tracking.service";
import type { LocationUpdate } from "@/types";

interface UseLiveLocationResult {
  currentLocation: { latitude: number; longitude: number } | null;
  currentSpeed: number;
  isTracking: boolean;
  startTracking: () => Promise<void>;
  stopTracking: () => void;
}

export function useLiveLocation(autoStart = false): UseLiveLocationResult {
  const subscriptionRef = useRef<LocationSubscription | null>(null);

  const {
    currentLocation,
    currentSpeed,
    isTracking,
    setLocation,
    startTracking: storeStartTracking,
    stopTracking: storeStopTracking,
  } = useTripMonitorStore();

  const handleLocationUpdate = useCallback(
    (update: LocationUpdate) => {
      setLocation(update);
    },
    [setLocation]
  );

  const startTracking = useCallback(async () => {
    if (subscriptionRef.current) return; // already tracking

    const sub = await startForegroundTracking(handleLocationUpdate);
    if (sub) {
      subscriptionRef.current = sub;
      storeStartTracking();
    }
  }, [handleLocationUpdate, storeStartTracking]);

  const stopTracking = useCallback(() => {
    stopForegroundTracking(subscriptionRef.current);
    subscriptionRef.current = null;
    storeStopTracking();
  }, [storeStopTracking]);

  // Auto-start on mount if requested
  useEffect(() => {
    if (autoStart) {
      startTracking();
    }

    return () => {
      // Cleanup on unmount
      if (subscriptionRef.current) {
        stopForegroundTracking(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [autoStart]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    currentLocation,
    currentSpeed,
    isTracking,
    startTracking,
    stopTracking,
  };
}
