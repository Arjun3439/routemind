import React, { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { COLORS, SPACING, FONT_SIZE, RADIUS, CATEGORY_ICONS } from "@/constants";
import { useTripStore, useLocationStore } from "@/store";
import { getScoreColor } from "@/services/recommendation.service";

const { width, height } = Dimensions.get("window");

export default function ExploreScreen() {
  const mapRef = useRef<MapView>(null);
  const { discoveredPlaces, currentRoute, selectedPlace, setSelectedPlace } = useTripStore();
  const { currentLocation } = useLocationStore();

  const hasRoute = !!currentRoute;

  const initialRegion = currentLocation
    ? {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      }
    : {
        latitude: 20.5937,
        longitude: 78.9629,
        latitudeDelta: 15,
        longitudeDelta: 15,
      };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        customMapStyle={darkMapStyle}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton
      >
        {/* Route Polyline */}
        {hasRoute && (
          <Polyline
            coordinates={
              currentRoute.steps.flatMap((s) => [s.startLocation, s.endLocation])
            }
            strokeColor={COLORS.primary}
            strokeWidth={4}
          />
        )}

        {/* Place Markers */}
        {discoveredPlaces.map((place) => (
          <Marker
            key={place.googlePlaceId}
            coordinate={{ latitude: place.lat, longitude: place.lng }}
            onPress={() => setSelectedPlace(place)}
          >
            <View
              style={[
                styles.marker,
                { borderColor: getScoreColor(place.worthStopScore) },
                selectedPlace?.googlePlaceId === place.googlePlaceId && styles.markerSelected,
              ]}
            >
              <Text style={styles.markerEmoji}>{CATEGORY_ICONS[place.category] || "📍"}</Text>
              <Text style={[styles.markerScore, { color: getScoreColor(place.worthStopScore) }]}>
                {place.worthStopScore}
              </Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Empty state */}
      {!hasRoute && discoveredPlaces.length === 0 && (
        <View style={styles.emptyOverlay}>
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🗺</Text>
            <Text style={styles.emptyTitle}>No active route</Text>
            <Text style={styles.emptyText}>
              Start a discovery from the Home tab to see places on the map
            </Text>
          </View>
        </View>
      )}

      {/* Selected place mini card */}
      {selectedPlace && (
        <View style={styles.selectedCard}>
          <Text style={styles.selectedEmoji}>
            {CATEGORY_ICONS[selectedPlace.category] || "📍"}
          </Text>
          <View style={styles.selectedInfo}>
            <Text style={styles.selectedName} numberOfLines={1}>
              {selectedPlace.name}
            </Text>
            <Text style={styles.selectedMeta}>
              ⭐ {selectedPlace.rating.toFixed(1)} · 🚗 {selectedPlace.detourMinutes} min
            </Text>
          </View>
          <View
            style={[
              styles.selectedScore,
              { backgroundColor: `${getScoreColor(selectedPlace.worthStopScore)}22` },
            ]}
          >
            <Text
              style={[
                styles.selectedScoreNum,
                { color: getScoreColor(selectedPlace.worthStopScore) },
              ]}
            >
              {selectedPlace.worthStopScore}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setSelectedPlace(null)}>
            <Text style={styles.dismissText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  marker: {
    backgroundColor: "rgba(9,15,35,0.9)",
    borderRadius: RADIUS.md,
    borderWidth: 2,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 4,
    alignItems: "center",
    minWidth: 46,
  },
  markerSelected: { borderWidth: 2.5 },
  markerEmoji: { fontSize: 16 },
  markerScore: { fontSize: FONT_SIZE.xs, fontWeight: "800" },

  emptyOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(2,6,23,0.5)",
  },
  emptyCard: {
    backgroundColor: "rgba(15,23,42,0.95)",
    borderRadius: RADIUS["2xl"],
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: SPACING["2xl"],
    alignItems: "center",
    width: width * 0.75,
  },
  emptyEmoji: { fontSize: 48, marginBottom: SPACING.base },
  emptyTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  emptyText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },

  selectedCard: {
    position: "absolute",
    bottom: 90,
    left: SPACING.base,
    right: SPACING.base,
    backgroundColor: "rgba(15,23,42,0.97)",
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.base,
    gap: SPACING.sm,
  },
  selectedEmoji: { fontSize: 28 },
  selectedInfo: { flex: 1 },
  selectedName: { fontSize: FONT_SIZE.base, fontWeight: "700", color: COLORS.textPrimary },
  selectedMeta: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 2 },
  selectedScore: {
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  selectedScoreNum: { fontSize: FONT_SIZE.lg, fontWeight: "900" },
  dismissText: { fontSize: 18, color: COLORS.textMuted, padding: SPACING.xs },
});

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#0f172a" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0f172a" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#334155" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0c1a2e" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];
