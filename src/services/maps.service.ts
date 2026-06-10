import axios from "axios";
import type { RouteResult, GooglePlace, Place, AIFilters, LatLng } from "@/types";
import { MAX_DETOUR_KM } from "@/constants";

const MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY!;
const PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY!;

const DIRECTIONS_BASE = "https://maps.googleapis.com/maps/api/directions/json";
const PLACES_BASE = "https://maps.googleapis.com/maps/api/place";
const GEOCODING_BASE = "https://maps.googleapis.com/maps/api/geocode/json";

// ============================================================
// Places Autocomplete
// ============================================================
export interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

export async function getPlaceAutocomplete(
  input: string,
  sessionToken?: string
): Promise<PlacePrediction[]> {
  if (input.length < 3) return [];

  try {
    const response = await axios.get(`${PLACES_BASE}/autocomplete/json`, {
      params: {
        input,
        key: PLACES_API_KEY,
        types: "(cities)",
        ...(sessionToken ? { sessiontoken: sessionToken } : {}),
      },
      timeout: 8000,
    });

    return response.data?.predictions || [];
  } catch (error) {
    console.warn("Autocomplete failed:", error);
    return [];
  }
}

// ============================================================
// Geocoding
// ============================================================
export async function geocodeAddress(address: string): Promise<LatLng> {
  const response = await axios.get(GEOCODING_BASE, {
    params: { address, key: MAPS_API_KEY },
    timeout: 10000,
  });

  const results = response.data?.results;
  if (!results?.length) throw new Error(`Could not geocode: ${address}`);

  const { lat, lng } = results[0].geometry.location;
  return { latitude: lat, longitude: lng };
}

// ============================================================
// Directions API
// ============================================================
export async function getDirections(
  origin: string | LatLng,
  destination: string | LatLng
): Promise<RouteResult> {
  const originParam =
    typeof origin === "string" ? origin : `${origin.latitude},${origin.longitude}`;
  const destinationParam =
    typeof destination === "string"
      ? destination
      : `${destination.latitude},${destination.longitude}`;

  const response = await axios.get(DIRECTIONS_BASE, {
    params: {
      origin: originParam,
      destination: destinationParam,
      key: MAPS_API_KEY,
      mode: "driving",
      alternatives: false,
    },
    timeout: 15000,
  });

  const routes = response.data?.routes;
  if (!routes?.length) throw new Error("No route found between these locations");

  const route = routes[0];
  const leg = route.legs[0];

  return {
    polyline: route.overview_polyline.points,
    distance: leg.distance.text,
    duration: leg.duration.text,
    bounds: {
      northeast: {
        latitude: route.bounds.northeast.lat,
        longitude: route.bounds.northeast.lng,
      },
      southwest: {
        latitude: route.bounds.southwest.lat,
        longitude: route.bounds.southwest.lng,
      },
    },
    steps: leg.steps.map((step: any) => ({
      instruction: step.html_instructions.replace(/<[^>]*>/g, ""),
      distance: step.distance.text,
      duration: step.duration.text,
      startLocation: {
        latitude: step.start_location.lat,
        longitude: step.start_location.lng,
      },
      endLocation: {
        latitude: step.end_location.lat,
        longitude: step.end_location.lng,
      },
    })),
  };
}

// ============================================================
// Decode Google Polyline
// ============================================================
export function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }

  return points;
}

// ============================================================
// Places API — Nearby Search along route corridor
// ============================================================
export async function findPlacesAlongRoute(
  polylinePoints: LatLng[],
  filters: AIFilters
): Promise<GooglePlace[]> {
  // Sample waypoints along route (every ~20th point to cover whole route)
  const waypoints = sampleWaypoints(polylinePoints, 12);
  const allPlaces = new Map<string, GooglePlace>();

  // Map our categories to Google Places types
  const googleTypes = mapCategoriesToGoogleTypes(filters.categories);

  for (const type of googleTypes) {
    for (const waypoint of waypoints) {
      try {
        const nearby = await searchNearbyPlaces(waypoint, type, filters);
        for (const place of nearby) {
          if (!allPlaces.has(place.place_id)) {
            allPlaces.set(place.place_id, place);
          }
        }
        // Small delay to avoid rate limiting
        await delay(100);
      } catch (e) {
        console.warn(`Places search failed for ${type}:`, e);
      }
    }
  }

  return Array.from(allPlaces.values());
}

async function searchNearbyPlaces(
  location: LatLng,
  type: string,
  filters: AIFilters
): Promise<GooglePlace[]> {
  const response = await axios.get(`${PLACES_BASE}/nearbysearch/json`, {
    params: {
      location: `${location.latitude},${location.longitude}`,
      radius: Math.min(filters.maxDetourKm * 1000, 10000),
      type,
      keyword: filters.keywords?.length ? filters.keywords.join(" ") : undefined,
      minprice: filters.priceLevel?.[0] ?? undefined,
      maxprice: filters.priceLevel?.[filters.priceLevel.length - 1] ?? undefined,
      key: PLACES_API_KEY,
    },
    timeout: 15000,
  });

  const results: GooglePlace[] = response.data?.results || [];
  return results.filter(
    (p) =>
      (p.rating || 0) >= filters.minRating &&
      (p.user_ratings_total || 0) >= filters.minReviews
  );
}

// ============================================================
// Detour Calculation
// ============================================================
export async function calculateDetour(
  placeLocation: LatLng,
  routePolylinePoints: LatLng[]
): Promise<{ detourKm: number; detourMinutes: number }> {
  // Find closest point on route
  const closestPoint = findClosestPointOnRoute(placeLocation, routePolylinePoints);
  const distToRoute = haversineDistance(placeLocation, closestPoint);

  // Estimate detour: 2x the straight-line distance (out and back) + avg speed assumption
  const detourKm = distToRoute * 2;
  const detourMinutes = (detourKm / 30) * 60; // 30 km/h average city speed for detour

  return {
    detourKm: Math.round(detourKm * 10) / 10,
    detourMinutes: Math.round(detourMinutes),
  };
}

// ============================================================
// Helpers
// ============================================================
function sampleWaypoints(points: LatLng[], count: number): LatLng[] {
  if (points.length <= count) return points;
  const step = Math.floor(points.length / count);
  return Array.from({ length: count }, (_, i) => points[i * step]);
}

function mapCategoriesToGoogleTypes(categories: string[]): string[] {
  const mapping: Record<string, string> = {
    restaurant: "restaurant",
    cafe: "cafe",
    attraction: "tourist_attraction",
    hidden_gem: "point_of_interest",
    viewpoint: "natural_feature",
    shopping: "shopping_mall",
    gas_station: "gas_station",
    hotel: "lodging",
    other: "point_of_interest",
  };
  return [...new Set(categories.map((c) => mapping[c] || "point_of_interest"))];
}

function findClosestPointOnRoute(point: LatLng, routePoints: LatLng[]): LatLng {
  let minDist = Infinity;
  let closest = routePoints[0];
  for (const rp of routePoints) {
    const d = haversineDistance(point, rp);
    if (d < minDist) {
      minDist = d;
      closest = rp;
    }
  }
  return closest;
}

export function haversineDistance(a: LatLng, b: LatLng): number {
  const R = 6371; // km
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const sin2Lat = Math.sin(dLat / 2) ** 2;
  const sin2Lon = Math.sin(dLon / 2) ** 2;
  const c =
    2 *
    Math.atan2(
      Math.sqrt(sin2Lat + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * sin2Lon),
      Math.sqrt(1 - sin2Lat - Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * sin2Lon)
    );
  return R * c;
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================
// Photo URL Builder
// ============================================================
export function buildPhotoUrl(photoReference: string, maxWidth = 400): string {
  return `${PLACES_BASE}/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${PLACES_API_KEY}`;
}
