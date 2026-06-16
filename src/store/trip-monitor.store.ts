// ============================================================
// RouteMind Phase 7 — Trip Monitor Zustand Store
// ============================================================
// Holds all live trip state: location, speed, progress,
// geofences, nearby stops, notifications, triggered thresholds.
// ============================================================

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  TripProgress,
  ActiveGeofence,
  NearbyStop,
  LiveNotification,
  LocationUpdate,
  ProximityThresholdKm,
} from "@/types";

// ============================================================
// State interface
// ============================================================
interface TripMonitorState {
  // ── Location ────────────────────────────────────────────────
  currentLocation: { latitude: number; longitude: number } | null;
  currentSpeed: number; // km/h
  locationHistory: Array<{ latitude: number; longitude: number; timestamp: number }>;

  // ── Trip progress ────────────────────────────────────────────
  tripProgress: TripProgress | null;

  // ── Nearby stops ─────────────────────────────────────────────
  nearbyStops: NearbyStop[];

  // ── Geofences ────────────────────────────────────────────────
  activeGeofences: ActiveGeofence[];

  // ── Notifications (in-memory inbox) ──────────────────────────
  notifications: LiveNotification[];

  // ── Proximity threshold tracking ─────────────────────────────
  // placeId → set of thresholds already triggered this session
  triggeredThresholds: Record<string, ProximityThresholdKm[]>;

  // ── Tracking state ───────────────────────────────────────────
  isTracking: boolean;
  trackingStartedAt: string | null;

  // ── Route deviation alert state ──────────────────────────────
  deviationAlertShown: boolean;
  lastDeviationNotifiedAt: string | null;
}

// ============================================================
// Actions interface
// ============================================================
interface TripMonitorActions {
  // Location
  setLocation: (update: LocationUpdate) => void;
  clearLocationHistory: () => void;

  // Trip progress
  updateTripProgress: (progress: TripProgress) => void;
  clearTripProgress: () => void;

  // Nearby stops
  setNearbyStops: (stops: NearbyStop[]) => void;

  // Geofences
  setActiveGeofences: (geofences: ActiveGeofence[]) => void;
  updateGeofence: (placeId: string, updates: Partial<ActiveGeofence>) => void;

  // Notifications
  addNotification: (notification: LiveNotification) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;

  // Proximity thresholds
  markThresholdTriggered: (placeId: string, thresholdKm: ProximityThresholdKm) => void;
  isThresholdTriggered: (placeId: string, thresholdKm: ProximityThresholdKm) => boolean;
  clearTriggeredThresholds: () => void;

  // Deviation
  setDeviationAlertShown: (shown: boolean) => void;
  setLastDeviationNotifiedAt: (at: string | null) => void;

  // Tracking
  startTracking: () => void;
  stopTracking: () => void;

  // Reset
  resetTripMonitor: () => void;
}

type TripMonitorStore = TripMonitorState & TripMonitorActions;

// ============================================================
// Initial state
// ============================================================
const initialState: TripMonitorState = {
  currentLocation: null,
  currentSpeed: 0,
  locationHistory: [],
  tripProgress: null,
  nearbyStops: [],
  activeGeofences: [],
  notifications: [],
  triggeredThresholds: {},
  isTracking: false,
  trackingStartedAt: null,
  deviationAlertShown: false,
  lastDeviationNotifiedAt: null,
};

// ============================================================
// Store
// ============================================================
export const useTripMonitorStore = create<TripMonitorStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ── Location ──────────────────────────────────────────────
      setLocation: (update) => {
        const speedKmh = update.speed != null ? update.speed * 3.6 : get().currentSpeed;

        set((state) => {
          const newHistory = [
            ...state.locationHistory.slice(-20), // keep last 20 positions
            {
              latitude: update.latitude,
              longitude: update.longitude,
              timestamp: update.timestamp,
            },
          ];

          return {
            currentLocation: { latitude: update.latitude, longitude: update.longitude },
            currentSpeed: speedKmh,
            locationHistory: newHistory,
          };
        });
      },

      clearLocationHistory: () => set({ locationHistory: [] }),

      // ── Trip progress ─────────────────────────────────────────
      updateTripProgress: (tripProgress) => set({ tripProgress }),
      clearTripProgress: () => set({ tripProgress: null }),

      // ── Nearby stops ──────────────────────────────────────────
      setNearbyStops: (nearbyStops) => set({ nearbyStops }),

      // ── Geofences ─────────────────────────────────────────────
      setActiveGeofences: (activeGeofences) => set({ activeGeofences }),

      updateGeofence: (placeId, updates) =>
        set((state) => ({
          activeGeofences: state.activeGeofences.map((g) =>
            g.place.id === placeId ? { ...g, ...updates } : g
          ),
        })),

      // ── Notifications ─────────────────────────────────────────
      addNotification: (notification) =>
        set((state) => ({
          notifications: [notification, ...state.notifications].slice(0, 100), // cap at 100
        })),

      markNotificationRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
          ),
        })),

      markAllNotificationsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({
            ...n,
            isRead: true,
            readAt: n.readAt ?? new Date().toISOString(),
          })),
        })),

      clearNotifications: () => set({ notifications: [] }),

      // ── Proximity thresholds ──────────────────────────────────
      markThresholdTriggered: (placeId, thresholdKm) =>
        set((state) => {
          const existing = state.triggeredThresholds[placeId] ?? [];
          if (existing.includes(thresholdKm)) return state;
          return {
            triggeredThresholds: {
              ...state.triggeredThresholds,
              [placeId]: [...existing, thresholdKm],
            },
          };
        }),

      isThresholdTriggered: (placeId, thresholdKm) => {
        const triggered = get().triggeredThresholds[placeId] ?? [];
        return triggered.includes(thresholdKm);
      },

      clearTriggeredThresholds: () => set({ triggeredThresholds: {} }),

      // ── Deviation ─────────────────────────────────────────────
      setDeviationAlertShown: (deviationAlertShown) => set({ deviationAlertShown }),
      setLastDeviationNotifiedAt: (lastDeviationNotifiedAt) =>
        set({ lastDeviationNotifiedAt }),

      // ── Tracking lifecycle ────────────────────────────────────
      startTracking: () =>
        set({
          isTracking: true,
          trackingStartedAt: new Date().toISOString(),
          deviationAlertShown: false,
          lastDeviationNotifiedAt: null,
        }),

      stopTracking: () =>
        set({
          isTracking: false,
        }),

      // ── Full reset ────────────────────────────────────────────
      resetTripMonitor: () => set({ ...initialState }),
    }),
    {
      name: "routemind-trip-monitor",
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist notifications and triggered thresholds across sessions
      partialize: (state) => ({
        notifications: state.notifications,
        triggeredThresholds: state.triggeredThresholds,
      }),
    }
  )
);

// ============================================================
// Derived selectors (memoized access patterns)
// ============================================================

/** Count of unread notifications */
export const selectUnreadCount = (state: TripMonitorStore): number =>
  state.notifications.filter((n) => !n.isRead).length;

/** Triggered thresholds for a specific place as a Set */
export const selectTriggeredThresholdsForPlace = (
  state: TripMonitorStore,
  placeId: string
): Set<ProximityThresholdKm> =>
  new Set((state.triggeredThresholds[placeId] ?? []) as ProximityThresholdKm[]);
