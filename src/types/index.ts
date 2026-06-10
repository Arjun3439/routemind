// ============================================================
// RouteMind — Global TypeScript Types
// ============================================================

export interface User {
  id: string;
  clerkId: string;
  email: string;
  name: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface Trip {
  id: string;
  userId: string;
  source: string;
  destination: string;
  prompt: string;
  sourceLat: number;
  sourceLng: number;
  destinationLat: number;
  destinationLng: number;
  polyline: string;
  status: "pending" | "active" | "completed";
  createdAt: string;
  updatedAt: string;
}

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface Place {
  id: string;
  googlePlaceId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  category: PlaceCategory;
  rating: number;
  totalRatings: number;
  priceLevel?: number;
  photoReference?: string;
  photoUrl?: string;
  openNow?: boolean;
  worthStopScore: number;
  detourMinutes: number;
  detourKm: number;
  communityScore: number;
  tipCount: number;
  isSaved?: boolean;
  isVisited?: boolean;
  tags: string[];
}

export type PlaceCategory =
  | "restaurant"
  | "cafe"
  | "attraction"
  | "hidden_gem"
  | "viewpoint"
  | "shopping"
  | "gas_station"
  | "hotel"
  | "other";

export interface Tip {
  id: string;
  placeId: string;
  userId: string;
  content: string;
  upvotes: number;
  hasUpvoted?: boolean;
  userAvatar?: string;
  userName?: string;
  createdAt: string;
}

export interface SavedPlace {
  id: string;
  userId: string;
  placeId: string;
  place?: Place;
  savedAt: string;
}

export interface Visit {
  id: string;
  userId: string;
  placeId: string;
  tripId?: string;
  visitedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  placeId: string;
  tripId?: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sentAt: string;
  readAt?: string;
}

// ============================================================
// AI / Gemini Types
// ============================================================

export interface AIFilters {
  categories: PlaceCategory[];
  minRating: number;
  minReviews: number;
  maxDetourKm: number;
  maxDetourMinutes: number;
  keywords: string[];
  priceLevel?: number[];
  intent: string;
  explanation: string;
}

// ============================================================
// Google Maps / Places Types
// ============================================================

export interface RouteResult {
  polyline: string;
  distance: string;
  duration: string;
  steps: RouteStep[];
  bounds: {
    northeast: LatLng;
    southwest: LatLng;
  };
}

export interface RouteStep {
  instruction: string;
  distance: string;
  duration: string;
  startLocation: LatLng;
  endLocation: LatLng;
}

export interface GooglePlace {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: { lat: number; lng: number };
  };
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  opening_hours?: { open_now: boolean };
  photos?: Array<{ photo_reference: string }>;
  types: string[];
}

// ============================================================
// Recommendation Types
// ============================================================

export interface WorthStopScoreBreakdown {
  ratingScore: number;
  reviewScore: number;
  distanceScore: number;
  communityScore: number;
  total: number;
}

export interface RouteDiscoveryResult {
  trip: Trip;
  places: Place[];
  filters: AIFilters;
  totalFound: number;
}
