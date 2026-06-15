// ============================================================
// RouteMind — Open Maps Navigation Utility
// ============================================================
// Opens Google Maps in turn-by-turn navigation mode.
// Tries the native app URI scheme first, falls back to the
// universal HTTPS URL which works in any browser or the Maps
// web app — no canOpenURL required (unreliable in Expo Go).
// ============================================================

import { Linking, Platform } from "react-native";

/**
 * Opens Google Maps with turn-by-turn navigation to the given coordinates.
 * Works on iOS (Google Maps or Apple Maps web fallback) and Android.
 *
 * @param lat   Destination latitude
 * @param lng   Destination longitude
 * @param label Optional place name shown as the destination label
 */
export async function openMapsNavigation(
  lat: number,
  lng: number,
  label?: string
): Promise<void> {
  const encodedLabel = label ? encodeURIComponent(label) : `${lat},${lng}`;

  // Universal HTTPS fallback — works in any browser / Maps web app
  const webUrl =
    `https://www.google.com/maps/dir/?api=1` +
    `&destination=${lat},${lng}` +
    `&travelmode=driving`;

  if (Platform.OS === "ios") {
    // comgooglemaps:// opens Google Maps in nav mode if installed
    const nativeUrl = `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`;
    try {
      await Linking.openURL(nativeUrl);
    } catch {
      // Google Maps not installed — fall back to web (opens in Safari/Apple Maps)
      await Linking.openURL(webUrl);
    }
  } else {
    // Android: google.navigation intent opens Google Maps directly in nav mode
    const nativeUrl = `google.navigation:q=${lat},${lng}&mode=d`;
    try {
      await Linking.openURL(nativeUrl);
    } catch {
      // Google Maps not installed — fall back to HTTPS
      await Linking.openURL(webUrl);
    }
  }
}

