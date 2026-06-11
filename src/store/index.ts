import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { User, Trip, Place, AIFilters, RouteResult } from "@/types";

// ============================================================
// Auth Store
// ============================================================
interface AuthState {
  user: User | null;
  isLoaded: boolean;
  setUser: (user: User | null) => void;
  setLoaded: (loaded: boolean) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoaded: false,
      setUser: (user) => set({ user }),
      setLoaded: (isLoaded) => set({ isLoaded }),
      clearUser: () => set({ user: null }),
    }),
    {
      name: "routemind-auth",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// ============================================================
// Trip Store
// ============================================================
interface TripState {
  currentTrip: Trip | null;
  currentRoute: RouteResult | null;
  aiFilters: AIFilters | null;
  discoveredPlaces: Place[];
  selectedPlace: Place | null;
  isDiscovering: boolean;
  setCurrentTrip: (trip: Trip | null) => void;
  setCurrentRoute: (route: RouteResult | null) => void;
  setAIFilters: (filters: AIFilters | null) => void;
  setDiscoveredPlaces: (places: Place[]) => void;
  setSelectedPlace: (place: Place | null) => void;
  setIsDiscovering: (loading: boolean) => void;
  resetTrip: () => void;
}

export const useTripStore = create<TripState>()((set) => ({
  currentTrip: null,
  currentRoute: null,
  aiFilters: null,
  discoveredPlaces: [],
  selectedPlace: null,
  isDiscovering: false,
  setCurrentTrip: (currentTrip) => set({ currentTrip }),
  setCurrentRoute: (currentRoute) => set({ currentRoute }),
  setAIFilters: (aiFilters) => set({ aiFilters }),
  setDiscoveredPlaces: (discoveredPlaces) => set({ discoveredPlaces }),
  setSelectedPlace: (selectedPlace) => set({ selectedPlace }),
  setIsDiscovering: (isDiscovering) => set({ isDiscovering }),
  resetTrip: () =>
    set({
      currentTrip: null,
      currentRoute: null,
      aiFilters: null,
      discoveredPlaces: [],
      selectedPlace: null,
      isDiscovering: false,
    }),
}));

// ============================================================
// Location Store
// ============================================================
interface LocationState {
  currentLocation: { latitude: number; longitude: number } | null;
  locationPermission: "granted" | "denied" | "undetermined";
  setCurrentLocation: (location: { latitude: number; longitude: number } | null) => void;
  setLocationPermission: (permission: "granted" | "denied" | "undetermined") => void;
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      currentLocation: null,
      locationPermission: "undetermined",
      setCurrentLocation: (currentLocation) => set({ currentLocation }),
      setLocationPermission: (locationPermission) => set({ locationPermission }),
    }),
    {
      name: "routemind-location",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export * from "./community";

// ============================================================
// UI Store
// ============================================================
interface UIState {
  bottomSheetIndex: number;
  mapStyle: "standard" | "satellite";
  showFilters: boolean;
  activeTab: "home" | "explore" | "saved" | "profile";
  setBottomSheetIndex: (index: number) => void;
  setMapStyle: (style: "standard" | "satellite") => void;
  setShowFilters: (show: boolean) => void;
  setActiveTab: (tab: "home" | "explore" | "saved" | "profile") => void;
}

export const useUIStore = create<UIState>()((set) => ({
  bottomSheetIndex: 0,
  mapStyle: "standard",
  showFilters: false,
  activeTab: "home",
  setBottomSheetIndex: (bottomSheetIndex) => set({ bottomSheetIndex }),
  setMapStyle: (mapStyle) => set({ mapStyle }),
  setShowFilters: (showFilters) => set({ showFilters }),
  setActiveTab: (activeTab) => set({ activeTab }),
}));
