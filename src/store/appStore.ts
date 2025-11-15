import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Puller, Ride, RideRequest, GeoLocation } from '../types';

/**
 * AppStore - Global state management using Zustand
 * 
 * This store manages:
 * - Puller information (ID, name, points)
 * - Online/offline status
 * - Current active ride
 * - Pending ride requests
 * - WebSocket connection status
 * - User's GPS location
 * 
 * Persists to localStorage to maintain login state across page reloads
 */

interface AppStore {
  // Puller state
  puller: Puller | null;
  setPuller: (puller: Puller | null) => void;
  updatePullerPoints: (points: number) => void;

  // Online/offline status
  isOnline: boolean;
  setIsOnline: (status: boolean) => void;

  // Current ride state
  currentRide: Ride | null;
  setCurrentRide: (ride: Ride | null) => void;

  // Pending ride request (shown in modal)
  pendingRequest: RideRequest | null;
  setPendingRequest: (request: RideRequest | null) => void;

  // Available ride requests (from database and socket)
  availableRides: RideRequest[];
  setAvailableRides: (rides: RideRequest[]) => void;
  addAvailableRide: (ride: RideRequest) => void;
  removeAvailableRide: (rideId: number) => void;

  // WebSocket connection status
  isConnected: boolean;
  setIsConnected: (status: boolean) => void;

  // User's GPS location
  userLocation: GeoLocation | null;
  setUserLocation: (location: GeoLocation | null) => void;

  // UI state
  showRideCompleteModal: boolean;
  setShowRideCompleteModal: (show: boolean) => void;
  lastCompletedRide: Ride | null;
  setLastCompletedRide: (ride: Ride | null) => void;

  // Reset store (for logout)
  reset: () => void;
}

const initialState = {
  puller: null,
  isOnline: false,
  currentRide: null,
  pendingRequest: null,
  availableRides: [],
  isConnected: false,
  userLocation: null,
  showRideCompleteModal: false,
  lastCompletedRide: null,
};

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      ...initialState,

      setPuller: (puller) => set({ puller }),

      updatePullerPoints: (points) =>
        set((state) => ({
          puller: state.puller ? { ...state.puller, pointsBalance: points } : null,
        })),

      setIsOnline: (status) => set({ isOnline: status }),

      setCurrentRide: (ride) => set({ currentRide: ride }),

      setPendingRequest: (request) => set({ pendingRequest: request }),

      setAvailableRides: (rides) => set({ availableRides: rides }),

      addAvailableRide: (ride) =>
        set((state) => {
          // Avoid duplicates
          if (state.availableRides.some((r) => r.id === ride.id)) {
            return state;
          }
          return { availableRides: [...state.availableRides, ride] };
        }),

      removeAvailableRide: (rideId) =>
        set((state) => ({
          availableRides: state.availableRides.filter((r) => r.id !== rideId),
        })),

      setIsConnected: (status) => set({ isConnected: status }),

      setUserLocation: (location) => set({ userLocation: location }),

      setShowRideCompleteModal: (show) => set({ showRideCompleteModal: show }),

      setLastCompletedRide: (ride) => set({ lastCompletedRide: ride }),

      reset: () => set(initialState),
    }),
    {
      name: 'puller-app-storage', // localStorage key
      storage: createJSONStorage(() => localStorage),
      // Only persist critical state, not transient state like connection status
      partialize: (state) => ({
        puller: state.puller,
        currentRide: state.currentRide,
        isOnline: state.isOnline,
        // Don't persist: pendingRequest, isConnected, userLocation, modal states
      }),
    }
  )
);
