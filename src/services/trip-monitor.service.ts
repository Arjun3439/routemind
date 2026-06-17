// ============================================================
// RouteMind Phase 7 — Trip Monitor Service
// ============================================================
// Handles route progress, ETA calculation, next stop detection,
// proximity threshold alerts, and route deviation detection.
// ============================================================

import type {
  LatLng,
  Place,
  Trip,
  TripProgress,
  NearbyStop,
  ProximityThresholdKm,
  WorthStopCategory,
} from "@/types";
import { haversineDistance, decodePolyline } from "@/services/maps.service";
import {
  PROXIMITY_THRESHOLDS_KM,
  ROUTE_DEVIATION_THRESHOLD_METERS,
  DEFAULT_SPEED_KMH,
  MIN_DRIVING_SPEED_KMH,
} from "@/constants";
import { getWorthStopCategory, getGeofenceRadiusKm } from "@/services/geofence.service";

// ============================================================
// Route progress
// ============================================================

/**
 * Calculates full trip progress given current GPS position.
 */
export function calculateTripProgress(
  currentLocation: LatLng,
  trip: Trip,
  polylinePoints: LatLng[],
  speedKmh: number,
  places: Place[],
  triggeredThresholds: Map<string, Set<ProximityThresholdKm>>
): TripProgress {
  if (polylinePoints.length < 2) {
    return emptyProgress(speedKmh);
  }

  const destination: LatLng = {
    latitude: trip.destinationLat,
    longitude: trip.destinationLng,
  };

  // Find closest point on polyline to current location
  const closestIdx = findClosestPolylineIndex(currentLocation, polylinePoints);

  // Distance remaining = sum of polyline segments from closest point to destination
  const distanceRemainingKm = sumPolylineDistance(polylinePoints, closestIdx);

  // Total route distance
  const totalDistanceKm = sumPolylineDistance(polylinePoints, 0);

  // Distance traveled
  const distanceTraveledKm = Math.max(0, totalDistanceKm - distanceRemainingKm);

  // Progress percent
  const progressPercent = totalDistanceKm > 0
    ? Math.min(100, Math.round((distanceTraveledKm / totalDistanceKm) * 100))
    : 0;

  // ETA
  const effectiveSpeed = speedKmh >= MIN_DRIVING_SPEED_KMH ? speedKmh : DEFAULT_SPEED_KMH;
  const etaMinutes = distanceRemainingKm > 0
    ? Math.ceil((distanceRemainingKm / effectiveSpeed) * 60)
    : 0;

  // Route deviation
  const { isDeviated, offRouteMeters } = detectRouteDeviation(currentLocation, polylinePoints);

  // Next stop
  const nearbyStops = calculateNearbyStops(
    currentLocation,
    places,
    speedKmh,
    triggeredThresholds
  );
  const nextStop = nearbyStops.length > 0 ? nearbyStops[0] : null;

  return {
    distanceRemainingKm: Math.round(distanceRemainingKm * 10) / 10,
    distanceTraveledKm: Math.round(distanceTraveledKm * 10) / 10,
    totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
    progressPercent,
    etaMinutes,
    nextStop,
    isOffRoute: isDeviated,
    offRouteMeters: Math.round(offRouteMeters),
    currentSpeedKmh: Math.round(speedKmh),
  };
}

// ============================================================
// Route deviation detection
// ============================================================

export function detectRouteDeviation(
  currentLocation: LatLng,
  polylinePoints: LatLng[]
): { isDeviated: boolean; offRouteMeters: number } {
  if (polylinePoints.length === 0) {
    return { isDeviated: false, offRouteMeters: 0 };
  }

  const closestIdx = findClosestPolylineIndex(currentLocation, polylinePoints);
  const closestPoint = polylinePoints[closestIdx];
  const distKm = haversineDistance(currentLocation, closestPoint);
  const offRouteMeters = distKm * 1000;

  return {
    isDeviated: offRouteMeters > ROUTE_DEVIATION_THRESHOLD_METERS,
    offRouteMeters,
  };
}

// ============================================================
// Nearby stops & proximity thresholds
// ============================================================

/**
 * Returns all places sorted by distance from current location,
 * enriched with ETA, category, and triggered thresholds.
 */
export function calculateNearbyStops(
  currentLocation: LatLng,
  places: Place[],
  speedKmh: number,
  triggeredThresholds: Map<string, Set<ProximityThresholdKm>>
): NearbyStop[] {
  const effectiveSpeed = speedKmh >= MIN_DRIVING_SPEED_KMH ? speedKmh : DEFAULT_SPEED_KMH;

  return places
    .map((place): NearbyStop => {
      const distanceKm = haversineDistance(currentLocation, {
        latitude: place.lat,
        longitude: place.lng,
      });
      const etaMinutes = Math.ceil((distanceKm / effectiveSpeed) * 60);
      const worthStopCategory = getWorthStopCategory(place.worthStopScore);
      const triggered = triggeredThresholds.get(place.id) ?? new Set();

      return {
        place,
        distanceKm,
        etaMinutes,
        detourMinutes: place.detourMinutes,
        worthStopCategory,
        triggeredThresholds: Array.from(triggered) as ProximityThresholdKm[],
      };
    })
    .filter((s) => s.distanceKm <= 30) // only consider stops within 30km
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * Returns proximity thresholds that should fire for each stop
 * (distance crossed but not yet triggered).
 */
export function getNewProximityAlerts(
  nearbyStops: NearbyStop[],
  triggeredThresholds: Map<string, Set<ProximityThresholdKm>>
): Array<{ stop: NearbyStop; threshold: ProximityThresholdKm }> {
  const alerts: Array<{ stop: NearbyStop; threshold: ProximityThresholdKm }> = [];

  for (const stop of nearbyStops) {
    const triggered = triggeredThresholds.get(stop.place.id) ?? new Set<ProximityThresholdKm>();

    for (const threshold of PROXIMITY_THRESHOLDS_KM) {
      if (stop.distanceKm <= threshold && !triggered.has(threshold)) {
        alerts.push({ stop, threshold });
        break; // only fire the smallest un-triggered threshold
      }
    }
  }

  return alerts;
}

// ============================================================
// Speed estimation from location history
// ============================================================

/**
 * Estimates speed in km/h from the last N location updates.
 * Falls back to DEFAULT_SPEED_KMH if history is insufficient.
 */
export function estimateSpeedFromHistory(
  history: Array<{ latitude: number; longitude: number; timestamp: number }>
): number {
  if (history.length < 2) return DEFAULT_SPEED_KMH;

  const recent = history.slice(-5); // last 5 positions
  let totalDistKm = 0;
  let totalTimeMs = 0;

  for (let i = 1; i < recent.length; i++) {
    const prev = recent[i - 1];
    const curr = recent[i];
    totalDistKm += haversineDistance(
      { latitude: prev.latitude, longitude: prev.longitude },
      { latitude: curr.latitude, longitude: curr.longitude }
    );
    totalTimeMs += curr.timestamp - prev.timestamp;
  }

  if (totalTimeMs === 0) return DEFAULT_SPEED_KMH;

  const speedMs = (totalDistKm * 1000) / (totalTimeMs / 1000);
  const speedKmh = speedMs * 3.6;

  // Clamp to reasonable driving speeds
  return Math.min(Math.max(speedKmh, 0), 200);
}

// ============================================================
// Polyline helpers
// ============================================================

export function decodeAndCachePolyline(encodedPolyline: string): LatLng[] {
  return decodePolyline(encodedPolyline);
}

function findClosestPolylineIndex(point: LatLng, polylinePoints: LatLng[]): number {
  let minDist = Infinity;
  let minIdx = 0;

  for (let i = 0; i < polylinePoints.length; i++) {
    const d = haversineDistance(point, polylinePoints[i]);
    if (d < minDist) {
      minDist = d;
      minIdx = i;
    }
  }

  return minIdx;
}

function sumPolylineDistance(polylinePoints: LatLng[], fromIndex: number): number {
  let total = 0;
  for (let i = fromIndex; i < polylinePoints.length - 1; i++) {
    total += haversineDistance(polylinePoints[i], polylinePoints[i + 1]);
  }
  return total;
}

function emptyProgress(speedKmh: number): TripProgress {
  return {
    distanceRemainingKm: 0,
    distanceTraveledKm: 0,
    totalDistanceKm: 0,
    progressPercent: 0,
    etaMinutes: 0,
    nextStop: null,
    isOffRoute: false,
    offRouteMeters: 0,
    currentSpeedKmh: speedKmh,
  };
}
