import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useUser } from "@clerk/clerk-expo";
import * as Location from "expo-location";
import { COLORS, SPACING, FONT_SIZE, RADIUS, EXAMPLE_PROMPTS } from "@/constants";
import { useTripStore, useLocationStore } from "@/store";
import { getPlaceAutocomplete, type PlacePrediction } from "@/services/maps.service";

const { width } = Dimensions.get("window");

const PROMPT_SUGGESTIONS = [
  { emoji: "🍛", label: "Must Try Foods" },
  { emoji: "💎", label: "Hidden Gems" },
  { emoji: "📸", label: "Photo Spots" },
  { emoji: "☕", label: "Best Coffee" },
  { emoji: "🌄", label: "Viewpoints" },
  { emoji: "🎭", label: "Local Experiences" },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { setCurrentTrip, setIsDiscovering } = useTripStore();
  const { currentLocation, setCurrentLocation, setLocationPermission } = useLocationStore();

  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [prompt, setPrompt] = useState("");
  const [promptIndex, setPromptIndex] = useState(0);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  // Autocomplete state
  const [sourceSuggestions, setSourceSuggestions] = useState<PlacePrediction[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<PlacePrediction[]>([]);
  const [activeField, setActiveField] = useState<"source" | "dest" | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Rotating placeholder text
  useEffect(() => {
    const interval = setInterval(() => {
      setPromptIndex((i) => (i + 1) % EXAMPLE_PROMPTS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
    ]).start();

    // Pulse animation for the CTA button
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.02, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Debounced autocomplete search
  const fetchSuggestions = useCallback(
    (text: string, field: "source" | "dest") => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (text.length < 3) {
        if (field === "source") setSourceSuggestions([]);
        else setDestSuggestions([]);
        return;
      }

      debounceRef.current = setTimeout(async () => {
        setIsSearching(true);
        try {
          const predictions = await getPlaceAutocomplete(text);
          if (field === "source") setSourceSuggestions(predictions);
          else setDestSuggestions(predictions);
        } catch {
          // silent fail
        } finally {
          setIsSearching(false);
        }
      }, 350);
    },
    []
  );

  const handleSourceChange = (text: string) => {
    setSource(text);
    setActiveField("source");
    fetchSuggestions(text, "source");
  };

  const handleDestChange = (text: string) => {
    setDestination(text);
    setActiveField("dest");
    fetchSuggestions(text, "dest");
  };

  const selectSuggestion = (prediction: PlacePrediction, field: "source" | "dest") => {
    const name = prediction.structured_formatting.main_text;
    if (field === "source") {
      setSource(name);
      setSourceSuggestions([]);
    } else {
      setDestination(name);
      setDestSuggestions([]);
    }
    setActiveField(null);
    Keyboard.dismiss();
  };

  const requestLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === "granted" ? "granted" : "denied");

      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setCurrentLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });

        // Reverse geocode to get city name
        const geo = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });

        if (geo[0]) {
          const city = geo[0].city || geo[0].district || geo[0].region || "Current Location";
          setSource(city);
          setSourceSuggestions([]);
        }
      } else {
        Alert.alert("Location Permission", "Grant location access to auto-fill your source.");
      }
    } catch {
      Alert.alert("Error", "Could not get location. Please enter manually.");
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleSearch = async () => {
    if (!source.trim() || !destination.trim() || !prompt.trim()) {
      Alert.alert("Missing Info", "Please fill in all three fields to discover your route.");
      return;
    }

    // Navigate to map/results screen
    router.push({
      pathname: "/trip/results",
      params: { source: source.trim(), destination: destination.trim(), prompt: prompt.trim() },
    });
  };

  const renderSuggestionItem = (item: PlacePrediction, field: "source" | "dest") => (
    <TouchableOpacity
      key={item.place_id}
      style={styles.suggestionItem}
      onPress={() => selectSuggestion(item, field)}
      activeOpacity={0.7}
    >
      <Text style={styles.suggestionPin}>📍</Text>
      <View style={styles.suggestionTextContainer}>
        <Text style={styles.suggestionMainText} numberOfLines={1}>
          {item.structured_formatting.main_text}
        </Text>
        <Text style={styles.suggestionSecondaryText} numberOfLines={1}>
          {item.structured_formatting.secondary_text}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const firstNameDisplay = user?.firstName || "Traveler";

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={["#020617", "#0A1628", "#0F172A"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative blobs */}
      <View style={styles.blob1} />
      <View style={styles.blob2} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <Animated.View
          style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          <View>
            <Text style={styles.greeting}>Good morning,</Text>
            <Text style={styles.name}>{firstNameDisplay} 👋</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {firstNameDisplay.charAt(0).toUpperCase()}
            </Text>
          </View>
        </Animated.View>

        {/* Hero Text */}
        <Animated.View
          style={[styles.heroSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          <Text style={styles.heroTitle}>
            Discover your{"\n"}
            <Text style={styles.heroHighlight}>perfect stops</Text>
          </Text>
          <Text style={styles.heroSubtitle}>
            AI-powered recommendations along any route
          </Text>
        </Animated.View>

        {/* Form Card */}
        <Animated.View
          style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          {/* Source */}
          <View style={styles.inputWrapper}>
            <View style={styles.inputIconRow}>
              <View style={[styles.dot, { backgroundColor: COLORS.success }]} />
              <Text style={styles.inputLabel}>FROM</Text>
            </View>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.textInput}
                placeholder="Starting city or place"
                placeholderTextColor={COLORS.textMuted}
                value={source}
                onChangeText={handleSourceChange}
                onFocus={() => setActiveField("source")}
                returnKeyType="next"
              />
              <TouchableOpacity
                style={styles.locationButton}
                onPress={requestLocation}
                disabled={isLoadingLocation}
              >
                {isLoadingLocation ? (
                  <ActivityIndicator color={COLORS.primary} size="small" />
                ) : (
                  <Text style={styles.locationIcon}>📍</Text>
                )}
              </TouchableOpacity>
            </View>
            {/* Source suggestions dropdown */}
            {activeField === "source" && sourceSuggestions.length > 0 && (
              <View style={styles.suggestionsDropdown}>
                {isSearching && (
                  <ActivityIndicator size="small" color={COLORS.primary} style={{ padding: 8 }} />
                )}
                {sourceSuggestions.map((item) => renderSuggestionItem(item, "source"))}
              </View>
            )}
          </View>

          {/* Connector line */}
          <View style={styles.connector}>
            <View style={styles.connectorLine} />
            <View style={styles.connectorDot} />
          </View>

          {/* Destination */}
          <View style={styles.inputWrapper}>
            <View style={styles.inputIconRow}>
              <View style={[styles.dot, { backgroundColor: COLORS.primary }]} />
              <Text style={styles.inputLabel}>TO</Text>
            </View>
            <TextInput
              style={styles.textInput}
              placeholder="Destination city or place"
              placeholderTextColor={COLORS.textMuted}
              value={destination}
              onChangeText={handleDestChange}
              onFocus={() => setActiveField("dest")}
              returnKeyType="next"
            />
            {/* Destination suggestions dropdown */}
            {activeField === "dest" && destSuggestions.length > 0 && (
              <View style={styles.suggestionsDropdown}>
                {isSearching && (
                  <ActivityIndicator size="small" color={COLORS.primary} style={{ padding: 8 }} />
                )}
                {destSuggestions.map((item) => renderSuggestionItem(item, "dest"))}
              </View>
            )}
          </View>

          {/* Divider */}
          <View style={styles.cardDivider} />

          {/* Prompt */}
          <View style={styles.inputWrapper}>
            <View style={styles.inputIconRow}>
              <Text style={styles.aiIcon}>✨</Text>
              <Text style={styles.inputLabel}>WHAT ARE YOU LOOKING FOR?</Text>
            </View>
            <TextInput
              style={[styles.textInput, styles.promptInput]}
              placeholder={EXAMPLE_PROMPTS[promptIndex]}
              placeholderTextColor={COLORS.textMuted}
              value={prompt}
              onChangeText={setPrompt}
              multiline
              numberOfLines={2}
              returnKeyType="done"
            />
          </View>

          {/* Quick suggestions */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestions}
          >
            {PROMPT_SUGGESTIONS.map((s) => (
              <TouchableOpacity
                key={s.label}
                style={[styles.suggestionChip, prompt === s.label && styles.suggestionChipActive]}
                onPress={() => setPrompt(s.label)}
              >
                <Text style={styles.suggestionEmoji}>{s.emoji}</Text>
                <Text style={[styles.suggestionText, prompt === s.label && styles.suggestionTextActive]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Search CTA */}
          <Animated.View style={[styles.ctaWrapper, { transform: [{ scale: pulseAnim }] }]}>
            <TouchableOpacity
              style={styles.cta}
              onPress={handleSearch}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[COLORS.primary, "#1a4fd8", COLORS.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaGradient}
              >
                <Text style={styles.ctaText}>✨ Discover Stops</Text>
                <Text style={styles.ctaArrow}>→</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>

        {/* Stats Row */}
        <Animated.View style={[styles.statsRow, { opacity: fadeAnim }]}>
          {[
            { value: "50K+", label: "Places" },
            { value: "4.9★", label: "Rating" },
            { value: "10K+", label: "Travelers" },
          ].map((stat) => (
            <View key={stat.label} style={styles.statItem}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Recent trips placeholder */}
        <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
          <Text style={styles.sectionTitle}>Popular Routes 🔥</Text>
          {[
            { from: "Chennai", to: "Bangalore", emoji: "🍛", label: "Food trail" },
            { from: "Mumbai", to: "Pune", emoji: "☕", label: "Coffee stops" },
            { from: "Delhi", to: "Agra", emoji: "📸", label: "Photo spots" },
          ].map((route, i) => (
            <TouchableOpacity
              key={i}
              style={styles.routeCard}
              onPress={() => {
                setSource(route.from);
                setDestination(route.to);
                setPrompt(route.label);
              }}
            >
              <Text style={styles.routeEmoji}>{route.emoji}</Text>
              <View style={styles.routeInfo}>
                <Text style={styles.routeName}>{route.from} → {route.to}</Text>
                <Text style={styles.routeLabel}>{route.label}</Text>
              </View>
              <Text style={styles.routeArrow}>→</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.base, paddingTop: 60, paddingBottom: 100 },

  // Decorative blobs
  blob1: {
    position: "absolute",
    top: -80,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(37,99,235,0.12)",
  },
  blob2: {
    position: "absolute",
    top: 300,
    left: -100,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(6,182,212,0.08)",
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING["2xl"],
  },
  greeting: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  name: { fontSize: FONT_SIZE.xl, fontWeight: "700", color: COLORS.textPrimary, marginTop: 2 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: FONT_SIZE.lg, fontWeight: "700", color: "#fff" },

  // Hero
  heroSection: { marginBottom: SPACING["2xl"] },
  heroTitle: {
    fontSize: FONT_SIZE["4xl"],
    fontWeight: "800",
    color: COLORS.textPrimary,
    lineHeight: 42,
    letterSpacing: -1,
  },
  heroHighlight: { color: COLORS.secondary },
  heroSubtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    lineHeight: 24,
  },

  // Form Card
  card: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: RADIUS["2xl"],
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  inputWrapper: { marginBottom: SPACING.base },
  inputIconRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING.xs,
  },
  inputLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "700",
    color: COLORS.textMuted,
    letterSpacing: 1,
  },
  aiIcon: { fontSize: 14, marginRight: SPACING.xs },
  inputRow: { flexDirection: "row", alignItems: "center" },
  textInput: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: SPACING.md,
    paddingHorizontal: SPACING.base,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.md,
  },
  promptInput: { minHeight: 56, textAlignVertical: "top" },
  locationButton: {
    marginLeft: SPACING.xs,
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: "rgba(37,99,235,0.15)",
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  locationIcon: { fontSize: 20 },

  // Connector
  connector: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: SPACING.xs,
    marginVertical: -SPACING.xs,
    paddingLeft: 2,
  },
  connectorLine: {
    width: 1,
    height: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginLeft: 3,
    marginRight: SPACING.md,
  },
  connectorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
  },

  cardDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginVertical: SPACING.md,
  },

  // Suggestions
  suggestions: {
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
  },
  suggestionChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginRight: SPACING.xs,
  },
  suggestionChipActive: {
    backgroundColor: "rgba(37,99,235,0.2)",
    borderColor: COLORS.primary,
  },
  suggestionEmoji: { fontSize: 14, marginRight: 4 },
  suggestionText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, fontWeight: "500" },
  suggestionTextActive: { color: COLORS.primary },

  // CTA
  ctaWrapper: { marginTop: SPACING.md },
  cta: { borderRadius: RADIUS.lg, overflow: "hidden" },
  ctaGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.base + 2,
    gap: SPACING.sm,
  },
  ctaText: { fontSize: FONT_SIZE.md, fontWeight: "700", color: "#fff", letterSpacing: 0.3 },
  ctaArrow: { fontSize: FONT_SIZE.lg, color: "#fff" },

  // Stats
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: SPACING.base,
    marginBottom: SPACING.xl,
  },
  statItem: { alignItems: "center" },
  statValue: { fontSize: FONT_SIZE.xl, fontWeight: "800", color: COLORS.textPrimary },
  statLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },

  // Section
  section: { marginBottom: SPACING.xl },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  routeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: SPACING.base,
    marginBottom: SPACING.xs,
  },
  routeEmoji: { fontSize: 28, marginRight: SPACING.md },
  routeInfo: { flex: 1 },
  routeName: { fontSize: FONT_SIZE.base, fontWeight: "600", color: COLORS.textPrimary },
  routeLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 2 },
  routeArrow: { fontSize: FONT_SIZE.md, color: COLORS.textMuted },

  // Autocomplete Suggestions
  suggestionsDropdown: {
    marginTop: SPACING.xs,
    backgroundColor: "rgba(15,23,42,0.95)",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  suggestionPin: {
    fontSize: 16,
    marginRight: SPACING.sm,
  },
  suggestionTextContainer: {
    flex: 1,
  },
  suggestionMainText: {
    fontSize: FONT_SIZE.base,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  suggestionSecondaryText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
});
