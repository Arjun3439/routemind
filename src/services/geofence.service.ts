// ============================================================
// RouteMind Phase 7 — Geofence Service
// ============================================================
// Entry/exit detection, 24h cooldown logic, smart copy
// generation from community data (tips, live reports).
// ============================================================

import type {
  Place,
  LatLng,
  ActiveGeofence,
  WorthStopCategory,
  Tip,
  LiveReport,
} from "@/types";
import { haversineDistance } from "@/services/maps.service";
import {
  GEOFENCE_RADII,
  WORTH_STOP_SCORE_THRESHOLDS,
  CATEGORY_ICONS,
} from "@/constants";

// ============================================================
// Category mapping
// ============================================================

/**
 * Maps a numeric worth_stop_score (0-100) to a WorthStopCategory.
 * must_stop ≥ 75 | worth_it 50-74 | consider < 50
 */
export function getWorthStopCategory(worthStopScore: number): WorthStopCategory {
  if (worthStopScore >= WORTH_STOP_SCORE_THRESHOLDS.must_stop) return "must_stop";
  if (worthStopScore >= WORTH_STOP_SCORE_THRESHOLDS.worth_it) return "worth_it";
  return "consider";
}

/**
 * Returns the geofence radius in km for a given category.
 */
export function getGeofenceRadiusKm(category: WorthStopCategory): number {
  return GEOFENCE_RADII[category].km;
}

// ============================================================
// Geofence state management
// ============================================================

/**
 * Creates initial ActiveGeofence records from a list of places.
 */
export function buildActiveGeofences(places: Place[]): ActiveGeofence[] {
  return places.map((place) => {
    const category = getWorthStopCategory(place.worthStopScore);
    return {
      place,
      category,
      radiusKm: getGeofenceRadiusKm(category),
      enteredAt: null,
      isInside: false,
      lastNotifiedAt: null,
    };
  });
}

/**
 * Checks the current location against all active geofences.
 * Returns geofences where the user has just entered (was outside, now inside).
 */
export function checkGeofenceEntries(
  currentLocation: LatLng,
  geofences: ActiveGeofence[]
): ActiveGeofence[] {
  const justEntered: ActiveGeofence[] = [];

  for (const geofence of geofences) {
    const distKm = haversineDistance(currentLocation, {
      latitude: geofence.place.lat,
      longitude: geofence.place.lng,
    });

    const nowInside = distKm <= geofence.radiusKm;

    if (nowInside && !geofence.isInside) {
      // User just entered this geofence
      justEntered.push(geofence);
    }

    // Mutate the geofence in place
    geofence.isInside = nowInside;
    if (nowInside && !geofence.enteredAt) {
      geofence.enteredAt = new Date().toISOString();
    } else if (!nowInside) {
      geofence.enteredAt = null;
    }
  }

  return justEntered;
}

/**
 * Returns geofences where the user has just exited.
 */
export function checkGeofenceExits(
  currentLocation: LatLng,
  geofences: ActiveGeofence[]
): ActiveGeofence[] {
  const justExited: ActiveGeofence[] = [];

  for (const geofence of geofences) {
    const distKm = haversineDistance(currentLocation, {
      latitude: geofence.place.lat,
      longitude: geofence.place.lng,
    });

    const nowInside = distKm <= geofence.radiusKm;

    if (!nowInside && geofence.isInside) {
      justExited.push(geofence);
    }

    geofence.isInside = nowInside;
    if (!nowInside) {
      geofence.enteredAt = null;
    }
  }

  return justExited;
}

// ============================================================
// Cooldown check (local, in-memory)
// ============================================================

/**
 * Returns true if a notification was recently sent for this place
 * (within cooldownHours), based on in-memory lastNotifiedAt.
 */
export function isInLocalCooldown(
  geofence: ActiveGeofence,
  cooldownHours = 24
): boolean {
  if (!geofence.lastNotifiedAt) return false;
  const cooldownMs = cooldownHours * 60 * 60 * 1000;
  const lastMs = new Date(geofence.lastNotifiedAt).getTime();
  return Date.now() - lastMs < cooldownMs;
}

// ============================================================
// Smart notification copy generation
// ============================================================

/**
 * Builds an engaging, community-data-enriched notification body
 * for a geofence entry event.
 */
export function buildGeofenceNotificationMessage(
  place: Place,
  tips: Tip[] = [],
  liveReports: LiveReport[] = []
): string {
  const parts: string[] = [];

  // Rating line
  if (place.rating > 0) {
    parts.push(`⭐ ${place.rating.toFixed(1)} from ${place.totalRatings.toLocaleString()} travellers`);
  }

  // Highest-upvoted tip
  const topTip = tips.sort((a, b) => b.upvotes - a.upvotes)[0];
  if (topTip) {
    const snippet = topTip.content.length > 80
      ? topTip.content.slice(0, 77) + "..."
      : topTip.content;
    parts.push(`💬 "${snippet}"`);
  }

  // Live reports
  const activeReport = liveReports[0];
  if (activeReport) {
    const reportCopy = getLiveReportCopy(activeReport.reportType);
    if (reportCopy) parts.push(reportCopy);
  }

  // Fallback
  if (parts.length === 0) {
    parts.push(`📍 ${place.address}`);
  }

  return parts.join("\n");
}

/**
 * Builds a proximity alert message for a nearby stop.
 */
export function buildProximityAlertMessage(
  place: Place,
  distanceKm: number,
  etaMinutes: number
): string {
  const emoji = CATEGORY_ICONS[place.category] ?? "📍";

  if (etaMinutes <= 15) {
    return `${emoji} ${place.name} is ${etaMinutes} minute${etaMinutes !== 1 ? "s" : ""} ahead on your route.`;
  }

  return `${emoji} ${place.name} is ${distanceKm.toFixed(1)} km away on your route.`;
}

// ============================================================
// Helpers
// ============================================================
function getLiveReportCopy(reportType: string): string | null {
  const map: Record<string, string> = {
    fresh_batch:         "🔥 Fresh batch reported just now",
    crowded:             "👥 Currently busy",
    less_crowded:        "✅ Not crowded right now",
    parking_available:   "🅿️ Parking available",
    open:                "✅ Reported open",
    closed:              "❌ Reported closed",
    long_queue:          "⏳ Long queue reported",
    heavy_traffic:       "🚦 Heavy traffic nearby",
    road_block:          "🚧 Road block reported",
  };
  return map[reportType] ?? null;
}
