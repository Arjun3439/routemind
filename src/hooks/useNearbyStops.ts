// ============================================================
// RouteMind Phase 7 — useNearbyStops
// ============================================================
// Returns nearby stops sorted by distance, with live updates
// from the TripMonitorStore.
// ============================================================

import { useMemo } from "react";
import { useTripMonitorStore } from "@/store/trip-monitor.store";
import type { NearbyStop } from "@/types";

interface UseNearbyStopsResult {
  nearbyStops: NearbyStop[];
  nextStop: NearbyStop | null;
  stopsWithinRadius: (radiusKm: number) => NearbyStop[];
}

export function useNearbyStops(): UseNearbyStopsResult {
  const { nearbyStops, tripProgress } = useTripMonitorStore();

  const nextStop = useMemo(
    () => tripProgress?.nextStop ?? nearbyStops[0] ?? null,
    [tripProgress, nearbyStops]
  );

  const stopsWithinRadius = useMemo(
    () => (radiusKm: number) => nearbyStops.filter((s) => s.distanceKm <= radiusKm),
    [nearbyStops]
  );

  return {
    nearbyStops,
    nextStop,
    stopsWithinRadius,
  };
}
