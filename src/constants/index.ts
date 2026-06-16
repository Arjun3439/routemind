// ============================================================
// RouteMind — App Constants
// ============================================================

// Color Palette
export const COLORS = {
  primary: "#2563EB",
  primaryLight: "#3B82F6",
  primaryDark: "#1D4ED8",
  secondary: "#06B6D4",
  secondaryLight: "#22D3EE",
  accent: "#F59E0B",
  accentLight: "#FBBF24",
  background: "#020617",
  surface: "#0F172A",
  surfaceLight: "#1E293B",
  border: "rgba(255,255,255,0.12)",
  glass: "rgba(255,255,255,0.08)",
  glassHeavy: "rgba(255,255,255,0.15)",
  white: "#FFFFFF",
  textPrimary: "#FFFFFF",
  textSecondary: "#94A3B8",
  textMuted: "#64748B",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  starColor: "#FBBF24",
} as const;

// Typography Scale
export const FONT_SIZE = {
  xs: 11,
  sm: 12,
  base: 14,
  md: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 28,
  "4xl": 32,
  "5xl": 40,
} as const;

// Spacing Scale
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
  "4xl": 48,
  "5xl": 64,
} as const;

// Border Radius
export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  full: 9999,
} as const;

// Worth Stop Score Weights
export const SCORE_WEIGHTS = {
  rating: 0.4,
  reviews: 0.2,
  distance: 0.2,
  community: 0.2,
} as const;

// Score thresholds
export const SCORE_THRESHOLDS = {
  excellent: 80,
  good: 60,
  fair: 40,
} as const;

// Map defaults
export const MAP_DEFAULTS = {
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
  defaultZoom: 13,
  routeStrokeWidth: 4,
  routeColor: "#2563EB",
  corridorRadiusKm: 10,
  maxPlacesPerSearch: 20,
} as const;

// Notification task name
export const LOCATION_TASK_NAME = "routemind-location-task";
export const GEOFENCE_TASK_NAME = "routemind-geofence-task";

// Geofence radius in meters (legacy, kept for backwards compat)
export const GEOFENCE_RADIUS_METERS = 500;

// ============================================================
// Phase 7 — Smart Notifications Constants
// ============================================================

// Geofence radii by worth-stop category (km + meters)
export const GEOFENCE_RADII = {
  must_stop: { km: 3, meters: 3000 },
  worth_it:  { km: 2, meters: 2000 },
  consider:  { km: 1, meters: 1000 },
} as const;

// Worth-stop score → category thresholds
export const WORTH_STOP_SCORE_THRESHOLDS = {
  must_stop: 75,  // score >= 75
  worth_it:  50,  // score 50-74
  // consider: score < 50
} as const;

// Proximity alert thresholds (km) — each fires exactly once per stop
export const PROXIMITY_THRESHOLDS_KM = [15, 10, 5] as const;

// Route deviation threshold (meters off-polyline = alert)
export const ROUTE_DEVIATION_THRESHOLD_METERS = 500;

// Notification cooldown: don't re-notify same place within this window
export const NOTIFICATION_COOLDOWN_HOURS = 24;

// Background location tracking accuracy & interval
export const BG_LOCATION_ACCURACY = 6;  // Location.Accuracy.BestForNavigation
export const BG_LOCATION_INTERVAL_MS = 5000;  // update every 5 seconds
export const BG_LOCATION_DISTANCE_M  = 10;    // or every 10 meters

// Foreground tracking
export const FG_LOCATION_INTERVAL_MS = 3000;
export const FG_LOCATION_DISTANCE_M  = 5;

// Default speed when GPS speed is unavailable
export const DEFAULT_SPEED_KMH = 60;

// Min speed (km/h) to consider user is actively driving
export const MIN_DRIVING_SPEED_KMH = 10;

// API config
export const API_TIMEOUTS = {
  gemini: 30000,
  maps: 15000,
  supabase: 10000,
} as const;

// Detour limits
export const MAX_DETOUR_MINUTES = 15;
export const MAX_DETOUR_KM = 10;

// Example prompts for home screen
export const EXAMPLE_PROMPTS = [
  "Must try foods on my route 🍛",
  "Hidden gems & local secrets 💎",
  "Best photography spots 📸",
  "Top-rated coffee places ☕",
  "Must-see viewpoints & scenery 🌄",
  "Unique local experiences 🎭",
  "Best biryani spots 🍚",
  "Quiet nature stops 🌿",
];

// Place category icons
export const CATEGORY_ICONS: Record<string, string> = {
  restaurant: "🍽",
  cafe: "☕",
  attraction: "🏛",
  hidden_gem: "💎",
  viewpoint: "🌄",
  shopping: "🛍",
  gas_station: "⛽",
  hotel: "🏨",
  other: "📍",
};

// Category labels
export const CATEGORY_LABELS: Record<string, string> = {
  restaurant: "Restaurant",
  cafe: "Café",
  attraction: "Attraction",
  hidden_gem: "Hidden Gem",
  viewpoint: "Viewpoint",
  shopping: "Shopping",
  gas_station: "Gas Station",
  hotel: "Hotel",
  other: "Place",
};
