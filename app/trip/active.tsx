// ============================================================
// RouteMind Phase 7 — Active Trip Screen
// ============================================================
// app/trip/active.tsx
// Full-screen map + live monitoring while a trip is in progress.
// ============================================================

import React, { useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  Animated,
  Dimensions,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from "react-native-maps";

import { useTripStore } from "@/store";
import { useTripMonitorStore } from "@/store/trip-monitor.store";
import { useLiveLocation } from "@/hooks/useLiveLocation";
import { useTripProgress } from "@/hooks/useTripProgress";
import { useNearbyStops } from "@/hooks/useNearbyStops";
import { buildActiveGeofences } from "@/services/geofence.service";
import { decodePolyline } from "@/services/maps.service";
import { stopBackgroundTracking } from "@/services/location-tracking.service";

import { ActiveTripCard } from "@/components/trip/ActiveTripCard";
import { LiveTravelBanner } from "@/components/trip/LiveTravelBanner";
import { COLORS, SPACING, FONT_SIZE, RADIUS } from "@/constants";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function ActiveTripScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);

  const { currentTrip, discoveredPlaces } = useTripStore();
  const {
    activeGeofences,
    setActiveGeofences,
    resetTripMonitor,
    setDeviationAlertShown,
  } = useTripMonitorStore();

  // ── Location tracking ────────────────────────────────────────
  const { currentLocation, startTracking, stopTracking } = useLiveLocation(true);

  // ── Trip monitoring ──────────────────────────────────────────
  const { tripProgress, isActive } = useTripProgress();
  const { nextStop } = useNearbyStops();

  // ── Decode polyline ──────────────────────────────────────────
  const polylinePoints = currentTrip?.polyline
    ? decodePolyline(currentTrip.polyline)
    : [];

  // ── Set up geofences when places load ───────────────────────
  useEffect(() => {
    if (discoveredPlaces.length > 0 && activeGeofences.length === 0) {
      const geofences = buildActiveGeofences(discoveredPlaces);
      setActiveGeofences(geofences);
    }
  }, [discoveredPlaces]);

  // ── Follow user on map ───────────────────────────────────────
  useEffect(() => {
    if (currentLocation && mapRef.current) {
      mapRef.current.animateCamera(
        {
          center: currentLocation,
          zoom: 15,
        },
        { duration: 800 }
      );
    }
  }, [currentLocation]);

  // ── End trip ─────────────────────────────────────────────────
  const handleEndTrip = useCallback(() => {
    Alert.alert(
      "End Trip?",
      "This will stop location tracking and route monitoring.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End Trip",
          style: "destructive",
          onPress: async () => {
            stopTracking();
            await stopBackgroundTracking();
            resetTripMonitor();
            router.back();
          },
        },
      ]
    );
  }, [stopTracking, resetTripMonitor, router]);

  if (!currentTrip) {
    return (
      <View style={styles.noTrip}>
        <Text style={styles.noTripText}>No active trip.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const mapInitialRegion = {
    latitude: currentLocation?.latitude ?? currentTrip.sourceLat,
    longitude: currentLocation?.longitude ?? currentTrip.sourceLng,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  return (
    <View style={styles.container}>
      {/* ── Map ─────────────────────────────────────────────────── */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={mapInitialRegion}
        showsUserLocation
        followsUserLocation={false}
        showsTraffic
        mapType="standard"
        customMapStyle={darkMapStyle}
      >
        {/* Route polyline */}
        {polylinePoints.length > 0 && (
          <Polyline
            coordinates={polylinePoints}
            strokeColor={COLORS.primary}
            strokeWidth={4}
            lineDashPattern={undefined}
          />
        )}

        {/* Nearby stop markers */}
        {discoveredPlaces.slice(0, 20).map((place) => (
          <Marker
            key={place.id}
            coordinate={{ latitude: place.lat, longitude: place.lng }}
            title={place.name}
            onPress={() => router.push(`/place/${place.id}`)}
          >
            <View style={styles.markerBubble}>
              <Text style={styles.markerEmoji}>
                {place.worthStopScore >= 75 ? "⭐" : "📍"}
              </Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* ── Top overlay ─────────────────────────────────────────── */}
      <View style={[styles.topOverlay, { paddingTop: insets.top + SPACING.xs }]}>
        {/* Back / End trip buttons */}
        <View style={styles.topButtons}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <Text style={styles.iconBtnText}>←</Text>
          </TouchableOpacity>

          <View style={styles.tripTitle}>
            <Text style={styles.tripTitleText} numberOfLines={1}>
              {currentTrip.source} → {currentTrip.destination}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.iconBtn, styles.endBtn]}
            onPress={handleEndTrip}
          >
            <Text style={styles.iconBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Live banner */}
        {(nextStop || tripProgress?.isOffRoute) && (
          <LiveTravelBanner
            nextStop={nextStop}
            progress={tripProgress}
          />
        )}
      </View>

      {/* ── Bottom card ─────────────────────────────────────────── */}
      {tripProgress && (
        <View style={[styles.bottomCard, { paddingBottom: insets.bottom + SPACING.sm }]}>
          <ActiveTripCard
            progress={tripProgress}
            destination={currentTrip.destination}
          />
        </View>
      )}

      {/* ── Tracking pill ─────────────────────────────────────────── */}
      {isActive && (
        <View style={styles.trackingPill}>
          <View style={styles.trackingDot} />
          <Text style={styles.trackingText}>LIVE</Text>
        </View>
      )}
    </View>
  );
}

// ── Dark map style ────────────────────────────────────────────
const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#0f172a" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0f172a" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#1d4ed8" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0c1a2e" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  map: { ...StyleSheet.absoluteFillObject },

  // Top overlay
  topOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    gap: SPACING.xs,
  },
  topButtons: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.base,
    gap: SPACING.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(15,23,42,0.85)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  endBtn: {
    backgroundColor: "rgba(239,68,68,0.15)",
    borderColor: "rgba(239,68,68,0.3)",
  },
  iconBtnText: { fontSize: 16, color: COLORS.textPrimary, fontWeight: "700" },
  tripTitle: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.85)",
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  tripTitleText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: COLORS.textPrimary,
    textAlign: "center",
  },

  // Bottom card
  bottomCard: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.base,
  },

  // LIVE pill
  trackingPill: {
    position: "absolute",
    top: 90,
    right: SPACING.base,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16,185,129,0.15)",
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.3)",
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    gap: 4,
  },
  trackingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
  },
  trackingText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "800",
    color: COLORS.success,
    letterSpacing: 1,
  },

  // Markers
  markerBubble: {
    backgroundColor: "rgba(15,23,42,0.9)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    padding: 4,
  },
  markerEmoji: { fontSize: 16 },

  // No trip
  noTrip: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    gap: SPACING.md,
  },
  noTripText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.textSecondary,
  },
  backText: {
    fontSize: FONT_SIZE.base,
    color: COLORS.primary,
    fontWeight: "600",
  },
});
