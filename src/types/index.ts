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
// Phase 7 — Smart Notifications Types
// ============================================================

export type WorthStopCategory = 'must_stop' | 'worth_it' | 'consider';

export type NotificationType =
  | 'geofence_entry'
  | 'geofence_exit'
  | 'proximity_alert'
  | 'route_deviation'
  | 'smart_recommendation';

export type ProximityThresholdKm = 15 | 10 | 5;

export interface GeofenceRadius {
  category: WorthStopCategory;
  radiusKm: number;
  radiusMeters: number;
}

export interface ActiveGeofence {
  place: Place;
  category: WorthStopCategory;
  radiusKm: number;
  enteredAt: string | null;
  isInside: boolean;
  lastNotifiedAt: string | null;
}

export interface TripProgress {
  distanceRemainingKm: number;
  distanceTraveledKm: number;
  totalDistanceKm: number;
  progressPercent: number;
  etaMinutes: number;
  nextStop: NearbyStop | null;
  isOffRoute: boolean;
  offRouteMeters: number;
  currentSpeedKmh: number;
}

export interface NearbyStop {
  place: Place;
  distanceKm: number;
  etaMinutes: number;
  detourMinutes: number;
  worthStopCategory: WorthStopCategory;
  triggeredThresholds: ProximityThresholdKm[];
}

export interface LocationUpdate {
  latitude: number;
  longitude: number;
  speed: number | null;   // m/s from GPS, null if unavailable
  heading: number | null;
  accuracy: number | null;
  timestamp: number;      // Unix ms
}

export interface LiveNotification extends Notification {
  notificationType: NotificationType;
  isRead: boolean;
}

export interface CreateNotificationParams {
  userId: string;
  placeId?: string;
  tripId?: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  notificationType: NotificationType;
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

// ============================================================
// V3 — Community Intelligence Types
// ============================================================

export type PostType = 'place_post' | 'route_post' | 'hidden_gem_nomination' | 'travel_story' | 'google_review';
export type ReputationLevel = 'traveler' | 'explorer' | 'guide' | 'expert' | 'legend';
export type VoteTargetType = 'post' | 'comment';
export type FollowTargetType = 'user' | 'place' | 'route_community' | 'list';
export type SaveTargetType = 'place' | 'post' | 'route_community' | 'list';
export type ReportTargetType = 'post' | 'comment' | 'user';
export type ReportStatus = 'pending' | 'reviewed' | 'dismissed';
export type GemNominationStatus = 'pending' | 'approved' | 'rejected';

export type LiveReportType =
  | 'crowded' | 'less_crowded' | 'closed' | 'open'
  | 'road_block' | 'accident' | 'fresh_batch' | 'parking_available'
  | 'long_queue' | 'heavy_traffic' | 'police_checkpoint' | 'weather_alert';

export interface Post {
  id: string;
  authorId: string;
  type: PostType;
  placeId?: string;
  tripId?: string;
  routeCommunityId?: string;
  title: string;
  body: string;
  mediaUrls: string[];
  upvoteCount: number;
  downvoteCount: number;
  commentCount: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  authorName?: string;
  authorAvatar?: string;
  authorLevel?: ReputationLevel;
  placeName?: string;
  routeName?: string;
  userVote?: 1 | -1 | null;
  isSaved?: boolean;
  rating?: number; // Star rating (1-5) for Google review posts
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  parentCommentId?: string;
  body: string;
  upvoteCount: number;
  downvoteCount: number;
  isDeleted: boolean;
  createdAt: string;
  // Joined fields
  authorName?: string;
  authorAvatar?: string;
  authorLevel?: ReputationLevel;
  userVote?: 1 | -1 | null;
  replies?: Comment[];
  depth?: number;
}

export interface Vote {
  id: string;
  userId: string;
  targetType: VoteTargetType;
  targetId: string;
  value: 1 | -1;
  createdAt: string;
}

export interface LiveReport {
  id: string;
  reporterId: string;
  placeId?: string;
  routeCommunityId?: string;
  reportType: LiveReportType;
  expiresAt: string;
  upvoteCount: number;
  createdAt: string;
  // Joined fields
  reporterName?: string;
  reporterAvatar?: string;
  placeName?: string;
}

export interface Follow {
  id: string;
  followerId: string;
  followedType: FollowTargetType;
  followedId: string;
  createdAt: string;
}

export interface TravelList {
  id: string;
  ownerId: string;
  title: string;
  description?: string;
  coverImageUrl?: string;
  isPublic: boolean;
  likeCount: number;
  saveCount: number;
  followCount: number;
  duplicatedFromListId?: string;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  ownerName?: string;
  ownerAvatar?: string;
  itemCount?: number;
  isFollowed?: boolean;
}

export interface TravelListItem {
  id: string;
  listId: string;
  placeId: string;
  note?: string;
  position: number;
  createdAt: string;
  // Joined fields
  place?: Place;
}

export interface UserReputation {
  userId: string;
  level: ReputationLevel;
  xpPoints: number;
  badges: string[];
  postsCount: number;
  hiddenGemsFound: number;
  totalUpvotesReceived: number;
  updatedAt: string;
  // Joined fields
  userName?: string;
  userAvatar?: string;
}

export interface PlaceTrustScore {
  placeId: string;
  aiScore: number;
  communityScore: number;
  freshnessScore: number;
  trustScore: number;
  finalScore: number;
  computedAt: string;
}

export interface RouteCommunity {
  id: string;
  slug: string;
  originLabel: string;
  destinationLabel: string;
  description?: string;
  coverImageUrl?: string;
  memberCount: number;
  postCount: number;
  aiSummary?: Record<string, unknown>;
  createdAt: string;
  // Joined fields
  isFollowed?: boolean;
  reputationScores?: RouteReputationScores;
}

export interface RouteReputationScores {
  routeCommunityId: string;
  foodScore: number;
  coffeeScore: number;
  roadQualityScore: number;
  photographyScore: number;
  safetyScore: number;
  nightDrivingScore: number;
  fuelAvailabilityScore: number;
  overallScore: number;
  computedAt: string;
}

export interface HiddenGemNomination {
  id: string;
  placeId: string;
  nominatedBy: string;
  postId?: string;
  upvoteCount: number;
  downvoteCount: number;
  status: GemNominationStatus;
  approvedAt?: string;
  createdAt: string;
  // Joined fields
  placeName?: string;
  nominatorName?: string;
}

export interface TravelStory {
  id: string;
  userId: string;
  tripId?: string;
  title: string;
  summaryJson: TravelStorySummary;
  isPublished: boolean;
  postId?: string;
  createdAt: string;
  // Joined fields
  userName?: string;
  userAvatar?: string;
}

export interface TravelStorySummary {
  distanceKm: number;
  placesVisitedCount: number;
  hiddenGemsDiscovered: number;
  categoriesTried: string[];
  mostLovedStopPlaceId?: string;
  mostLovedStopName?: string;
}

export interface PlaceAISummary {
  famousFor: string;
  bestTimeToVisit: string;
  parking: string;
  crowdPattern: string;
  amenities: string;
  generatedAt: string;
}

export interface RouteAISummary {
  highlights: Array<{
    category: string;
    tip: string;
    placeName?: string;
  }>;
  generatedAt: string;
}

// Feed scoring types
export interface FeedScoreWeights {
  engagement: number;
  freshness: number;
  authorReputation: number;
  trustScore: number;
  routeRelevance: number;
}

export interface ScoredPost extends Post {
  feedScore: number;
}
