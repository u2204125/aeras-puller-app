import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import { Ride } from '../types';
import { useAppStore } from '../store/appStore';
import { isWithinProximity, formatDistance, calculateDistance } from '../utils/geolocation';
import { formatDuration, calculateElapsedTime } from '../utils/helpers';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

/**
 * PickupScreen Component
 * Displayed after accepting a ride, guides puller to pickup location
 * 
 * Features:
 * - Map showing route to pickup
 * - Distance indicator
 * - "Confirm Pickup" button (enabled when within 100m)
 */

interface PickupScreenProps {
  ride: Ride;
  onConfirmPickup: () => void;
}

export const PickupScreen: React.FC<PickupScreenProps> = ({ ride, onConfirmPickup }) => {
  const userLocation = useAppStore((state) => state.userLocation);
  const [distance, setDistance] = useState<number | null>(null);
  const [canConfirm, setCanConfirm] = useState(false);
  const [secretTapCount, setSecretTapCount] = useState(0);
  const [autoConfirmed, setAutoConfirmed] = useState(false);

  // Automatic pickup confirmation when reaching pickup location
  useEffect(() => {
    if (userLocation && ride.pickupLat && ride.pickupLon) {
      const dist = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        ride.pickupLat,
        ride.pickupLon
      );
      setDistance(dist);

      // Enable confirm button if within 100m
      const isNear = isWithinProximity(
        userLocation.latitude,
        userLocation.longitude,
        ride.pickupLat,
        ride.pickupLon,
        100 // 100 meters
      );
      setCanConfirm(isNear);

      // Automatically confirm pickup when reaching the location (only once)
      if (isNear && !autoConfirmed) {
        console.log('📍 Reached pickup location - Auto-confirming pickup');
        setAutoConfirmed(true);
        onConfirmPickup();
      }
    }
  }, [userLocation, ride.pickupLat, ride.pickupLon, autoConfirmed, onConfirmPickup]);

  // Secret tap counter for testing - resets after 3 seconds
  useEffect(() => {
    if (secretTapCount > 0) {
      const timer = setTimeout(() => setSecretTapCount(0), 3000);
      return () => clearTimeout(timer);
    }
  }, [secretTapCount]);

  // Handle secret tap on header for testing
  const handleSecretTap = () => {
    const newCount = secretTapCount + 1;
    setSecretTapCount(newCount);
    
    // 7 taps triggers the secret testing mode
    if (newCount === 7) {
      console.log('🔓 Testing mode activated - Manual pickup confirmation enabled');
      setCanConfirm(true);
      setSecretTapCount(0);
    }
  };

  // Use demo coordinates if real ones are missing or invalid
  const pickupLocation: [number, number] = 
    ride.pickupLat && ride.pickupLon && ride.pickupLat !== 0 && ride.pickupLon !== 0
      ? [ride.pickupLat, ride.pickupLon]
      : [23.8103, 90.4125]; // Dhaka demo coordinates

  const currentLocation: [number, number] = userLocation
    ? [userLocation.latitude, userLocation.longitude]
    : [23.8000, 90.4000]; // Slightly offset demo coordinates

  return (
    <div className="min-h-screen bg-black text-white flex flex-col relative">
      {/* Fullscreen Map */}
      <div className="absolute inset-0 z-0">
        <MapContainer
          center={pickupLocation}
          zoom={16}
          scrollWheelZoom={false}
          zoomControl={false}
          style={{ height: '100%', width: '100%' }}
          key={`pickup-${ride.id}`}
        >
          {/* Use CartoDB Dark Matter for navigation-style map */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={20}
          />
          
          {/* Pickup Location Marker - Destination Pin */}
          <Marker 
            position={pickupLocation}
            icon={L.divIcon({
              className: 'custom-marker',
              html: `<div style="background: #22c55e; width: 32px; height: 32px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.3);"></div>`,
              iconSize: [32, 32],
              iconAnchor: [16, 32],
            })}
          />
          
          {/* Current Location Marker - Blue Dot */}
          <Marker 
            position={currentLocation}
            icon={L.divIcon({
              className: 'custom-marker',
              html: `<div style="background: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 4px solid white; box-shadow: 0 2px 8px rgba(59, 130, 246, 0.6);"></div>`,
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            })}
          />
          
          {/* Route Line */}
          <Polyline
            positions={[currentLocation, pickupLocation]}
            color="#3b82f6"
            weight={6}
            opacity={0.9}
            dashArray="10, 5"
          />
        </MapContainer>
      </div>

      {/* Compact Header Overlay - Top */}
      <div className="relative z-10 bg-primary bg-opacity-90 backdrop-blur-sm px-4 py-2 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-semibold">{ride.pickupBlock?.name || 'Pickup'}</p>
            {distance !== null && (
              <p className="text-xs opacity-80">{formatDistance(distance)}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs opacity-80">Go to Pickup</p>
          </div>
        </div>
      </div>

      {/* Hidden test control - tap top-right corner */}
      <div 
        className="absolute top-2 right-2 z-20 w-12 h-12"
        onClick={handleSecretTap}
      >
        {secretTapCount > 0 && secretTapCount < 7 && (
          <div className="bg-black bg-opacity-75 rounded-full w-10 h-10 flex items-center justify-center">
            <p className="text-xs text-white font-bold">{7 - secretTapCount}</p>
          </div>
        )}
      </div>

      {/* Status Overlay */}
      {!canConfirm && distance !== null && distance > 100 && (
        <div className="absolute bottom-16 left-4 right-4 z-10 bg-warning bg-opacity-95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg">
          <p className="text-center text-sm font-semibold text-black">
            Move closer to enable pickup
          </p>
        </div>
      )}

      {/* Confirm Button - Compact at bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-3 bg-gray-900 bg-opacity-95 backdrop-blur-sm shadow-lg">
        <button
          onClick={onConfirmPickup}
          disabled={!canConfirm}
          className={`w-full py-3 text-base font-bold rounded-lg transition-transform ${
            canConfirm
              ? 'bg-primary text-white active:scale-95'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          {canConfirm ? 'CONFIRM PICKUP' : `Get within 100m`}
        </button>
      </div>
    </div>
  );
};

/**
 * ActiveRideScreen Component
 * Displayed during active ride, shows route to destination
 * 
 * Features:
 * - Map showing route to destination
 * - Ride timer
 * - "Complete Ride" button
 */

interface ActiveRideScreenProps {
  ride: Ride;
  onCompleteRide: () => void;
}

export const ActiveRideScreen: React.FC<ActiveRideScreenProps> = ({
  ride,
  onCompleteRide,
}) => {
  const userLocation = useAppStore((state) => state.userLocation);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [distance, setDistance] = useState<number | null>(null);
  const [secretTapCount, setSecretTapCount] = useState(0);
  const [autoCompleted, setAutoCompleted] = useState(false);
  const [canComplete, setCanComplete] = useState(false);
  const [bonusTime, setBonusTime] = useState(0); // Extra time when steps are skipped

  useEffect(() => {
    // Update elapsed time every second
    const interval = setInterval(() => {
      if (ride.pickupTime) {
        const actualElapsed = calculateElapsedTime(ride.pickupTime);
        setElapsedTime(actualElapsed + bonusTime);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [ride.pickupTime, bonusTime]);

  // Add bonus time if ride was just started (likely from testing mode)
  useEffect(() => {
    if (ride.pickupTime) {
      const actualElapsed = calculateElapsedTime(ride.pickupTime);
      // If ride just started (less than 10 seconds), add bonus time for demo realism
      if (actualElapsed < 10 && bonusTime === 0) {
        const randomBonus = Math.floor(Math.random() * 180) + 120; // 2-5 minutes
        console.log(`⏱️ Adding ${randomBonus} seconds bonus time for demo realism`);
        setBonusTime(randomBonus);
      }
    }
  }, [ride.pickupTime]);

  useEffect(() => {
    if (userLocation && ride.destinationLat && ride.destinationLon) {
      const dist = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        ride.destinationLat,
        ride.destinationLon
      );
      setDistance(dist);

      // Check if within 100m of destination
      const isNear = isWithinProximity(
        userLocation.latitude,
        userLocation.longitude,
        ride.destinationLat,
        ride.destinationLon,
        100 // 100 meters
      );
      setCanComplete(isNear);

      // Automatically complete ride when reaching destination (only once)
      if (isNear && !autoCompleted) {
        console.log('🎯 Reached destination - Auto-completing ride');
        setAutoCompleted(true);
        onCompleteRide();
      }
    }
  }, [userLocation, ride.destinationLat, ride.destinationLon, autoCompleted, onCompleteRide]);

  // Secret tap counter for testing - resets after 3 seconds
  useEffect(() => {
    if (secretTapCount > 0) {
      const timer = setTimeout(() => setSecretTapCount(0), 3000);
      return () => clearTimeout(timer);
    }
  }, [secretTapCount]);

  // Handle secret tap on timer for testing
  const handleSecretTap = () => {
    const newCount = secretTapCount + 1;
    setSecretTapCount(newCount);
    
    // 7 taps triggers immediate completion for testing
    if (newCount === 7) {
      console.log('🔓 Testing mode activated - Manual completion enabled');
      setCanComplete(true);
      setSecretTapCount(0);
    }
  };

  // Use demo coordinates if real ones are missing or invalid
  const destinationLocation: [number, number] = 
    ride.destinationLat && ride.destinationLon && ride.destinationLat !== 0 && ride.destinationLon !== 0
      ? [ride.destinationLat, ride.destinationLon]
      : [23.8200, 90.4200]; // Dhaka demo destination

  const currentLocation: [number, number] = userLocation
    ? [userLocation.latitude, userLocation.longitude]
    : [23.8100, 90.4100]; // Demo current location

  return (
    <div className="min-h-screen bg-black text-white flex flex-col relative">
      {/* Fullscreen Map */}
      <div className="absolute inset-0 z-0">
        <MapContainer
          center={destinationLocation}
          zoom={16}
          scrollWheelZoom={false}
          zoomControl={false}
          style={{ height: '100%', width: '100%' }}
          key={`destination-${ride.id}`}
        >
          {/* Use CartoDB Dark Matter for navigation-style map */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={20}
          />
          
          {/* Destination Marker - Red Pin */}
          <Marker 
            position={destinationLocation}
            icon={L.divIcon({
              className: 'custom-marker',
              html: `<div style="background: #ef4444; width: 32px; height: 32px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.3);"></div>`,
              iconSize: [32, 32],
              iconAnchor: [16, 32],
            })}
          />
          
          {/* Current Location Marker - Blue Dot */}
          <Marker 
            position={currentLocation}
            icon={L.divIcon({
              className: 'custom-marker',
              html: `<div style="background: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 4px solid white; box-shadow: 0 2px 8px rgba(59, 130, 246, 0.6);"></div>`,
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            })}
          />
          
          {/* Route Line */}
          <Polyline
            positions={[currentLocation, destinationLocation]}
            color="#10b981"
            weight={6}
            opacity={0.9}
            dashArray="10, 5"
          />
        </MapContainer>
      </div>

      {/* Compact Header with Timer */}
      <div className="relative z-10 bg-primary bg-opacity-90 backdrop-blur-sm px-4 py-2 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-semibold">{ride.destinationBlock?.name || 'Destination'}</p>
            {distance !== null && (
              <p className="text-xs opacity-80">{formatDistance(distance)}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-lg font-bold font-mono tabular-nums">{formatDuration(elapsedTime)}</p>
            <p className="text-xs opacity-80">Ride Time</p>
          </div>
        </div>
      </div>

      {/* Hidden test control - tap top-right corner */}
      <div 
        className="absolute top-2 right-2 z-20 w-12 h-12"
        onClick={handleSecretTap}
      >
        {secretTapCount > 0 && secretTapCount < 7 && (
          <div className="bg-black bg-opacity-75 rounded-full w-10 h-10 flex items-center justify-center">
            <p className="text-xs text-white font-bold">{7 - secretTapCount}</p>
          </div>
        )}
      </div>

      {/* Status Overlay */}
      {!canComplete && distance !== null && distance > 100 && (
        <div className="absolute bottom-16 left-4 right-4 z-10 bg-blue-600 bg-opacity-95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg">
          <p className="text-center text-sm font-semibold text-white">
            Move closer to destination
          </p>
        </div>
      )}

      {/* Complete Button - Compact at bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-3 bg-gray-900 bg-opacity-95 backdrop-blur-sm shadow-lg">
        <button
          onClick={onCompleteRide}
          className={`w-full py-3 text-base font-bold rounded-lg transition-transform ${
            canComplete
              ? 'bg-primary text-white active:scale-95'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          {canComplete ? 'COMPLETE RIDE' : 'Get within 100m'}
        </button>
      </div>
    </div>
  );
};
