/**
 * Type definitions for the AERAS Puller App
 * These match the backend entities and DTOs
 */

export enum RideStatus {
  PENDING_USER_CONFIRMATION = 'PENDING_USER_CONFIRMATION',
  SEARCHING = 'SEARCHING',
  ACCEPTED = 'ACCEPTED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export interface Puller {
  id: number;
  name: string;
  phone: string;
  pointsBalance: number;
  isOnline: boolean;
  isActive: boolean;
  lastKnownLat: number | null;
  lastKnownLon: number | null;
}

export interface LocationBlock {
  blockId: string;
  name: string;
  centerLat: number;
  centerLon: number;
  boundaryCoords?: Array<[number, number]>;
}

export interface Ride {
  id: number;
  status: RideStatus;
  requestTime: string;
  acceptTime: string | null;
  pickupTime: string | null;
  completionTime: string | null;
  pointsAwarded: number | null;
  pickupBlock: LocationBlock;
  destinationBlock: LocationBlock;
  puller: Puller | null;
  pickupLat: number;
  pickupLon: number;
  destinationLat: number;
  destinationLon: number;
  finalLat: number | null;
  finalLon: number | null;
}

export interface RideRequest {
  id: number;
  pickupBlock: LocationBlock;
  destinationBlock: LocationBlock;
  estimatedPoints: number;
  pickupLat: number;
  pickupLon: number;
  expiresAt: string;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export interface AppState {
  puller: Puller | null;
  isOnline: boolean;
  currentRide: Ride | null;
  pendingRequest: RideRequest | null;
  isConnected: boolean;
  userLocation: GeoLocation | null;
}

export interface LoginCredentials {
  phone: string;
}

export interface AcceptRideDto {
  pullerId: number;
}

export interface CompleteRideDto {
  finalLat: number;
  finalLon: number;
}
