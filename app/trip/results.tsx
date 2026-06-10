import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  FlatList,
  Alert,
} from "react-native";
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useUser } from "@clerk/clerk-expo";
import { COLORS, SPACING, FONT_SIZE, RADIUS, MAP_DEFAULTS, CATEGORY_ICONS } from "@/constants";
import { useTripStore, useLocationStore } from "@/store";
import { geminiService } from "@/services/gemini.service";
import { geocodeAddress, getDirections, decodePolyline } from "@/services/maps.service";
import { discoverPlacesAlongRoute, getScoreLabel, getScoreColor } from "@/services/recommendation.service";
import { startGeofenceMonitoring } from "@/services/notification.service";
import { tripService } from "@/services/supabase.service";
import type { Place, AIFilters } from "@/types";
import PlaceCard from "@/components/place/PlaceCard";

const { width, height } = Dimensions.get("window");
const BOTTOM_SHEET_HEIGHT = height * 0.45;

type DiscoveryStep =
  | "idle"
  | "geocoding"
  | "routing"
  | "ai"
  | "discovering"
  | "done"
  | "error";

const STEP_LABELS: Record<DiscoveryStep, string> = {
  idle: "",
  geocoding: "📍 Locating places...",
  routing: "🗺 Calculating route...",
  ai: "🤖 Parsing your request...",
  discovering: "🔍 Discovering stops...",
  done: "",
  error: "Something went wrong",
};

export default function TripResultsScreen() {
  const { source, destination, prompt } = useLocalSearchParams<{
    source: string;
    destination: string;
    prompt: string;
  }>();
  const router = useRouter();
  const { user } = useUser();
  const mapRef = useRef<MapView>(null);

  const {
    setCurrentTrip,
    setCurrentRoute,
    setAIFilters,
    setDiscoveredPlaces,
    discoveredPlaces,
    selectedPlace,
    setSelectedPlace,
    currentRoute,
    isDiscovering,
    setIsDiscovering,
  } = useTripStore();

  const [step, setStep] = useState<DiscoveryStep>("idle");
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [aiFilters, setLocalAIFilters] = useState<AIFilters | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const runDiscovery = useCallback(async () => {
    if (!source || !destination || !prompt) return;
    setIsDiscovering(true);
    setStep("geocoding");

    try {
      // Step 1: Geocode source + destination
      const [srcLatLng, dstLatLng] = await Promise.all([
        geocodeAddress(source),
        geocodeAddress(destination),
      ]);

      // Step 2: Get route
      setStep("routing");
      const route = await getDirections(srcLatLng, dstLatLng);
      setCurrentRoute(route);

      const coords = decodePolyline(route.polyline);
      setRouteCoords(coords);

      // Fit map to route
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(coords, {
          edgePadding: { top: 80, right: 40, bottom: BOTTOM_SHEET_HEIGHT + 40, left: 40 },
          animated: true,
        });
      }, 500);

      // Step 3: Parse prompt with Gemini
      setStep("ai");
      const filters = await geminiService.parsePrompt(prompt);
      setLocalAIFilters(filters);
      setAIFilters(filters);

      // Step 4: Discover places
      setStep("discovering");
      const places = await discoverPlacesAlongRoute(route.polyline, filters);
      setDiscoveredPlaces(places);

      // Step 5: Start geofencing for top places
      if (places.length > 0) {
        await startGeofenceMonitoring(places);
      }

      // Step 6: Save trip to Supabase
      if (user?.id) {
        try {
          const trip = await tripService.createTrip({
            userId: user.id,
            source,
            destination,
            prompt,
            sourceLat: srcLatLng.latitude,
            sourceLng: srcLatLng.longitude,
            destinationLat: dstLatLng.latitude,
            destinationLng: dstLatLng.longitude,
            polyline: route.polyline,
            status: "completed",
          });
          setCurrentTrip(trip);
          console.log("Trip saved:", trip.id);
        } catch (saveErr) {
          // Don't fail the whole flow if saving fails
          console.warn("Could not save trip to database:", saveErr);
        }
      }

      setStep("done");
    } catch (err: any) {
      console.error("Discovery error:", err);
      setErrorMsg(err?.message || "Discovery failed");
      setStep("error");
      Alert.alert("Discovery Failed", err?.message || "Please check your inputs and try again.");
    } finally {
      setIsDiscovering(false);
    }
  }, [source, destination, prompt]);

  useEffect(() => {
    runDiscovery();
  }, []);

  const handlePlaceSelect = (place: Place) => {
    setSelectedPlace(place);
    mapRef.current?.animateToRegion(
      {
        latitude: place.lat,
        longitude: place.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      500
    );
  };

  const handlePlaceDetail = (place: Place) => {
    router.push({ pathname: "/place/[id]", params: { id: place.googlePlaceId } });
  };

  const isLoading = step !== "done" && step !== "error" && step !== "idle";

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        customMapStyle={darkMapStyle}
        initialRegion={{
          latitude: 13.0827,
          longitude: 80.2707,
          latitudeDelta: 3,
          longitudeDelta: 3,
        }}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {/* Route polyline */}
        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor={COLORS.primary}
            strokeWidth={4}
            lineDashPattern={undefined}
          />
        )}

        {/* Place markers */}
        {discoveredPlaces.map((place) => (
          <Marker
            key={place.googlePlaceId}
            coordinate={{ latitude: place.lat, longitude: place.lng }}
            onPress={() => handlePlaceSelect(place)}
          >
            <View
              style={[
                styles.markerContainer,
                selectedPlace?.googlePlaceId === place.googlePlaceId && styles.markerSelected,
              ]}
            >
              <Text style={styles.markerEmoji}>{CATEGORY_ICONS[place.category] || "📍"}</Text>
              <Text style={styles.markerScore}>{place.worthStopScore}</Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Back button */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>

      {/* Top Info Bar */}
      <View style={styles.topBar}>
        <Text style={styles.topBarRoute} numberOfLines={1}>
          {source} → {destination}
        </Text>
        {aiFilters && (
          <View style={styles.topBarBadge}>
            <Text style={styles.topBarBadgeText}>✨ {aiFilters.intent}</Text>
          </View>
        )}
      </View>

      {/* Loading overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator color={COLORS.primary} size="large" />
            <Text style={styles.loadingStep}>{STEP_LABELS[step]}</Text>
            <Text style={styles.loadingSubtext}>This takes about 10-15 seconds</Text>
          </View>
        </View>
      )}

      {/* Bottom Sheet */}
      {step === "done" && (
        <View style={styles.bottomSheet}>
          {/* Handle */}
          <View style={styles.sheetHandle} />

          {/* Header */}
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>
                {discoveredPlaces.length} stops found
              </Text>
              {aiFilters && (
                <Text style={styles.sheetSubtitle}>{aiFilters.explanation}</Text>
              )}
            </View>
            {currentRoute && (
              <View style={styles.routeInfoBadge}>
                <Text style={styles.routeInfoText}>🕐 {currentRoute.duration}</Text>
                <Text style={styles.routeInfoText}>📏 {currentRoute.distance}</Text>
              </View>
            )}
          </View>

          {/* Places list */}
          {discoveredPlaces.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={styles.emptyText}>No places found matching your criteria</Text>
              <Text style={styles.emptySubtext}>Try a broader prompt or increase detour distance</Text>
            </View>
          ) : (
            <FlatList
              data={discoveredPlaces}
              keyExtractor={(item) => item.googlePlaceId}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.placesList}
              renderItem={({ item }) => (
                <PlaceCard
                  place={item}
                  isSelected={selectedPlace?.googlePlaceId === item.googlePlaceId}
                  onPress={() => handlePlaceSelect(item)}
                  onDetailPress={() => handlePlaceDetail(item)}
                />
              )}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  map: { ...StyleSheet.absoluteFillObject },

  backButton: {
    position: "absolute",
    top: 52,
    left: SPACING.base,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(2,6,23,0.85)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  backButtonText: { fontSize: 20, color: "#fff" },

  topBar: {
    position: "absolute",
    top: 52,
    left: 62,
    right: SPACING.base,
    zIndex: 10,
  },
  topBarRoute: {
    fontSize: FONT_SIZE.base,
    fontWeight: "700",
    color: "#fff",
    backgroundColor: "rgba(2,6,23,0.85)",
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    paddingHorizontal: SPACING.base,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  topBarBadge: {
    backgroundColor: "rgba(37,99,235,0.85)",
    borderRadius: RADIUS.sm,
    padding: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    marginTop: SPACING.xs,
    alignSelf: "flex-start",
  },
  topBarBadgeText: { fontSize: FONT_SIZE.xs, color: "#fff", fontWeight: "600" },

  // Loading
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(2,6,23,0.7)",
  },
  loadingCard: {
    backgroundColor: "rgba(15,23,42,0.95)",
    borderRadius: RADIUS["2xl"],
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: SPACING["2xl"],
    alignItems: "center",
    width: width * 0.75,
  },
  loadingStep: {
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
    color: "#fff",
    marginTop: SPACING.base,
    textAlign: "center",
  },
  loadingSubtext: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },

  // Bottom Sheet
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: BOTTOM_SHEET_HEIGHT,
    backgroundColor: "rgba(9,15,35,0.97)",
    borderTopLeftRadius: RADIUS["3xl"],
    borderTopRightRadius: RADIUS["3xl"],
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    paddingTop: SPACING.sm,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: SPACING.base,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: SPACING.base,
    marginBottom: SPACING.md,
  },
  sheetTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: "700",
    color: "#fff",
  },
  sheetSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
    maxWidth: width * 0.55,
  },
  routeInfoBadge: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    alignItems: "flex-end",
    gap: 2,
  },
  routeInfoText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  placesList: { paddingHorizontal: SPACING.base, paddingBottom: SPACING.xl, gap: SPACING.md },

  // Markers
  markerContainer: {
    backgroundColor: "rgba(15,23,42,0.9)",
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: SPACING.xs,
    paddingVertical: 4,
    alignItems: "center",
    minWidth: 48,
  },
  markerSelected: {
    borderColor: COLORS.primary,
    borderWidth: 2.5,
    backgroundColor: "rgba(37,99,235,0.25)",
  },
  markerEmoji: { fontSize: 16 },
  markerScore: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "800",
    color: "#fff",
  },

  // Empty
  emptyState: { alignItems: "center", paddingVertical: SPACING["2xl"] },
  emptyEmoji: { fontSize: 48, marginBottom: SPACING.md },
  emptyText: {
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: "center",
  },
});

// ============================================================
// Dark Map Style
// ============================================================
const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#0f172a" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0f172a" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#334155" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0c1a2e" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#cbd5e1" }] },
];
