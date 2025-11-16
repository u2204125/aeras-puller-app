import { useEffect, useState } from 'react';
import { useAppStore } from './store/appStore';
import { apiService } from './services/api.service';
import { socketService } from './services/socket.service';
import { mqttService } from './services/mqtt.service';
import { getCurrentPosition, watchPosition, clearWatch } from './utils/geolocation';
import { LoginScreen } from './components/LoginScreen';
import { HomeScreen } from './components/HomeScreen';
import { RideRequestModal } from './components/RideRequestModal';
import { AvailableRidesModal } from './components/AvailableRidesModal';
import { PickupScreen, ActiveRideScreen } from './components/RideScreens';
import { RideCompleteModal } from './components/RideCompleteModal';
import { RideStatus } from './types';
import { notificationManager } from './utils/notificationManager';
import { locationService } from './services/location.service';

/**
 * Main App Component
 * Manages application state and navigation between screens
 * 
 * Screen Flow:
 * 1. LoginScreen - Phone number authentication
 * 2. HomeScreen - Waiting for rides (online/offline)
 * 3. RideRequestModal - Accept/reject incoming rides
 * 4. PickupScreen - Navigate to pickup location
 * 5. ActiveRideScreen - Ride in progress
 * 6. RideCompleteModal - Ride completion summary
 */

function App() {
  const puller = useAppStore((state) => state.puller);
  const currentRide = useAppStore((state) => state.currentRide);
  const pendingRequest = useAppStore((state) => state.pendingRequest);
  const availableRides = useAppStore((state) => state.availableRides);
  const showRideCompleteModal = useAppStore((state) => state.showRideCompleteModal);
  const lastCompletedRide = useAppStore((state) => state.lastCompletedRide);
  
  const setCurrentRide = useAppStore((state) => state.setCurrentRide);
  const setPendingRequest = useAppStore((state) => state.setPendingRequest);
  const setUserLocation = useAppStore((state) => state.setUserLocation);
  const setShowRideCompleteModal = useAppStore((state) => state.setShowRideCompleteModal);
  const setLastCompletedRide = useAppStore((state) => state.setLastCompletedRide);
  const setPuller = useAppStore((state) => state.setPuller);
  const removeAvailableRide = useAppStore((state) => state.removeAvailableRide);

  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showAvailableRidesModal, setShowAvailableRidesModal] = useState(false);

  /**
   * Request notification permission on app mount
   */
  useEffect(() => {
    notificationManager.requestPermission().then((granted) => {
      if (granted) {
        console.log('✅ Notification permission granted');
      } else {
        console.log('❌ Notification permission denied');
      }
    });
  }, []);

  /**
   * Initialize GPS tracking when puller logs in
   */
  useEffect(() => {
    if (puller) {
      // Get initial position (with fallback for demo)
      getCurrentPosition()
        .then((location) => {
          setUserLocation(location);
          // Publish location to backend via WebSocket
          socketService.updateLocation(puller.id, location.latitude, location.longitude)
            .catch(err => console.error('Failed to update location:', err));
        })
        .catch((error) => {
          console.error('Failed to get location:', error);
          // Use mock location for demo (Dhaka, Bangladesh)
          const mockLocation = { latitude: 23.8103, longitude: 90.4125 };
          console.log('📍 Using mock location for demo:', mockLocation);
          setUserLocation(mockLocation);
          socketService.updateLocation(puller.id, mockLocation.latitude, mockLocation.longitude)
            .catch(err => console.error('Failed to update location:', err));
        });

      // Watch position changes (with fallback)
      const id = watchPosition(
        (location) => {
          setUserLocation(location);
          // Publish location to backend via WebSocket every update
          socketService.updateLocation(puller.id, location.latitude, location.longitude)
            .catch(err => console.error('Failed to update location:', err));
        },
        (error) => {
          console.error('Location watch error:', error);
          // Keep using last known or mock location
        }
      );

      // Check for existing active ride
      apiService.getCurrentRide(puller.id).then((ride) => {
        if (ride) {
          setCurrentRide(ride);
        }
      });

      // Fetch available searching rides from database
      apiService.getSearchingRides().then((rides) => {
        console.log(`📋 Loaded ${rides.length} searching rides from database`);
        console.log('📋 Raw rides data:', rides);
        
        // Convert rides to RideRequest format and add to available rides
        const rideRequests = rides.map((ride: any) => {
          const rideRequest = {
            id: ride.id,
            pickupBlock: {
              blockId: ride.startBlock?.blockId || '',
              name: ride.startBlock?.destinationName || ride.startBlock?.name || 'Unknown',
              centerLat: ride.startBlock?.latitude || 0,
              centerLon: ride.startBlock?.longitude || 0,
            },
            destinationBlock: {
              blockId: ride.destinationBlock?.blockId || '',
              name: ride.destinationBlock?.destinationName || ride.destinationBlock?.name || 'Unknown',
              centerLat: ride.destinationBlock?.latitude || 0,
              centerLon: ride.destinationBlock?.longitude || 0,
            },
            pickupLat: ride.startBlock?.latitude || 0,
            pickupLon: ride.startBlock?.longitude || 0,
            estimatedPoints: 10, // Default estimate
            expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          };
          console.log(`📋 Transformed ride ${ride.id}:`, rideRequest);
          return rideRequest;
        });
        
        useAppStore.getState().setAvailableRides(rideRequests);
      });

      return () => {
        clearWatch(id);
      };
    }
  }, [puller?.id]);

  /**
   * Setup MQTT and WebSocket event handlers (only once)
   */
  useEffect(() => {
    console.log('🔧 Setting up event handlers...');
    
    // MQTT: Handle ride requests from broker (robust to different payload/topic formats)
    const handleMqttRideRequest = (request: any) => {
      console.log('🔔 NEW RIDE REQUEST RECEIVED via MQTT:', request);
      console.log('📦 MQTT Request payload:', JSON.stringify(request, null, 2));

      // Support multiple payload shapes produced by hardware or backend:
      // - { startBlockId, destinationBlockId }
      // - { blockId, destinationId }
      // - { blockId } (no destination)
      const pickupBlockId = request.startBlockId || request.blockId || request.from || request.pickupBlockId || null;
      let destinationBlockId = request.destinationBlockId || request.destinationId || request.to || request.destination || null;

      if (!pickupBlockId) {
        console.warn('MQTT ride request missing pickup block id — ignoring:', request);
        return;
      }

      if (!destinationBlockId) {
        // If destination is missing, assume it's same as pickup (or unknown)
        destinationBlockId = pickupBlockId;
      }

      // Transform to match RideRequest interface
      const rideRequest = {
        id: Date.now(), // Generate temporary ID
        pickupBlock: {
          blockId: pickupBlockId,
          name: pickupBlockId, // Use id as name for now
          centerLat: 0,
          centerLon: 0,
        },
        destinationBlock: {
          blockId: destinationBlockId,
          name: destinationBlockId,
          centerLat: 0,
          centerLon: 0,
        },
        pickupLat: 0,
        pickupLon: 0,
        estimatedPoints: typeof request.estimatedPoints === 'number' ? request.estimatedPoints : 100,
        expiresAt: new Date(Date.now() + 1 * 60 * 1000).toISOString(), // 1 minute from now
      };

      console.log('✅ Transformed ride request:', rideRequest);

      // Show notification with audio and vibration
      notificationManager.showRideRequestNotification({
        rideId: rideRequest.id,
        from: pickupBlockId,
        to: destinationBlockId,
        points: rideRequest.estimatedPoints,
      });

      // Add to available rides (don't auto-show modal)
  useAppStore.getState().addAvailableRide(rideRequest);

      console.log('✅ Ride request added to available rides');
    };

    // Setup MQTT ride request handler
    mqttService.onRideRequest(handleMqttRideRequest);

    // WebSocket: Handle ride filled notifications
    const handleRideFilled = (data: { rideId: number }) => {
      console.log('🚫 Ride filled:', data.rideId);
      // Remove from available rides
      useAppStore.getState().removeAvailableRide(data.rideId);
      // Get current state and only clear if it matches
      const current = useAppStore.getState().pendingRequest;
      if (current && current.id === data.rideId) {
        useAppStore.getState().setPendingRequest(null);
      }
    };

    // WebSocket: Handle ride updates
    const handleRideUpdate = (ride: any) => {
      console.log('📝 Ride update received via WebSocket:', ride);
      
      // If ride status changed to ACCEPTED or not SEARCHING, remove from available
      if (ride.status !== 'SEARCHING') {
        useAppStore.getState().removeAvailableRide(ride.id);
      }
      
      // Get current state and only update if it matches
      const current = useAppStore.getState().currentRide;
      if (current && current.id === ride.id) {
        useAppStore.getState().setCurrentRide(ride);
      }
    };

    // WebSocket: Handle notifications
    const handleNotification = (notification: any) => {
      console.log('📬 Notification received via WebSocket:', notification);
      // Handle specific notification types
      if (notification.type === 'ride_rejected') {
        console.log('Ride rejection confirmed by server');
      }
    };

    // Register WebSocket event handlers (NOT for ride requests)
    socketService.onRideFilled(handleRideFilled);
    socketService.onRideUpdate(handleRideUpdate);
    socketService.onNotification(handleNotification);

    // Cleanup: remove event listeners on unmount
    return () => {
      socketService.offRideFilled(handleRideFilled);
      socketService.offRideUpdate(handleRideUpdate);
      socketService.offNotification(handleNotification);
    };
  }, []); // Run only once on mount

  /**
   * Auto-remove expired ride requests (1 minute expiration)
   */
  useEffect(() => {
    const checkExpiredRides = () => {
      const now = new Date();
      const availableRides = useAppStore.getState().availableRides;
      
      availableRides.forEach((ride) => {
        const expiresAt = new Date(ride.expiresAt);
        if (now >= expiresAt) {
          console.log(`⏰ Ride ${ride.id} has expired, removing...`);
          useAppStore.getState().removeAvailableRide(ride.id);
          
          // If this was the pending request, clear it
          const pendingRequest = useAppStore.getState().pendingRequest;
          if (pendingRequest && pendingRequest.id === ride.id) {
            useAppStore.getState().setPendingRequest(null);
          }
        }
      });
    };

    // Check every second for expired rides
    const interval = setInterval(checkExpiredRides, 1000);

    return () => clearInterval(interval);
  }, []);

  /**
   * Connect/disconnect WebSocket and MQTT when puller changes
   */
  useEffect(() => {
    if (puller) {
      console.log('🔌 Connecting WebSocket for puller:', puller.id);
      socketService.connect(puller.id);

      console.log('🔌 Connecting MQTT for puller:', puller.id);
      mqttService.connect(puller.id);

      return () => {
        console.log('🔌 Disconnecting WebSocket for puller:', puller.id);
        socketService.disconnect();
        
        console.log('🔌 Disconnecting MQTT for puller:', puller.id);
        mqttService.disconnect();
      };
    }
  }, [puller?.id]);

  /**
   * Handle accepting a ride from the available rides modal
   */
  const handleAcceptRideFromModal = async (rideId: number) => {
    if (!puller) return;

    const rideRequest = availableRides.find(r => r.id === rideId);
    if (!rideRequest) {
      console.error(`Ride request with ID ${rideId} not found in available rides.`);
      alert('Ride request not found. It might have expired.');
      return;
    }

    console.log(`✅ Accepting ride from ${rideRequest.pickupBlock.blockId} to ${rideRequest.destinationBlock.blockId} for puller ${puller.id}`);
    setIsLoading(true);
    
    try {
      const acceptedRide = await apiService.acceptRide(rideRequest.pickupBlock.blockId, rideRequest.destinationBlock.blockId, puller.id);

      console.log('✅ Ride accepted successfully (API):', acceptedRide);

      // Preserve the UI's estimatedPoints from the rideRequest so it can be
      // used later when completing the ride (frontend may show 100 points)
      try {
        (acceptedRide as any).estimatedPoints = rideRequest.estimatedPoints;
      } catch (e) {
        // ignore
      }

      setCurrentRide(acceptedRide);
      removeAvailableRide(rideId);
      setShowAvailableRidesModal(false);
      
      // Show acceptance notification
      notificationManager.showRideAcceptedNotification(acceptedRide.id);
      
      console.log('🗺️ Navigating to pickup screen...');
    } catch (error: any) {
      console.error('❌ Failed to accept ride:', error);
      alert('Failed to accept ride. Please try again.');
      removeAvailableRide(rideId);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle rejecting a ride from the available rides modal
   */
  const handleRejectRideFromModal = async (rideId: number) => {
    if (!puller) return;

    console.log(`❌ Rejecting ride ${rideId} for puller ${puller.id}`);
    setIsLoading(true);

    try {
      // Call backend (or WebSocket) to record rejection and trigger redistribution
      await apiService.rejectRide(rideId, puller.id);

      // Remove from UI list regardless
      removeAvailableRide(rideId);

      console.log('✅ Ride rejected successfully (API/WebSocket)');
    } catch (error) {
      console.error('❌ Failed to reject ride via API:', error);
      // Still remove locally to avoid stale UI if backend is unreachable
      removeAvailableRide(rideId);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle accepting a ride request from pending modal
   */
  const handleAcceptRide = async () => {
    if (!pendingRequest || !puller) return;

    console.log(`✅ Accepting pending ride ${pendingRequest.id} for puller ${puller.id}`);
    setIsLoading(true);
    
    try {
      // For MQTT-only mode: Create a mock accepted ride
      const acceptedRide = {
        id: pendingRequest.id,
        status: RideStatus.ACCEPTED,
        requestTime: new Date().toISOString(),
        acceptTime: new Date().toISOString(),
        pickupTime: null,
        completionTime: null,
        pointsAwarded: null,
        pickupBlock: pendingRequest.pickupBlock,
        destinationBlock: pendingRequest.destinationBlock,
        puller: puller,
        pickupLat: pendingRequest.pickupLat,
        pickupLon: pendingRequest.pickupLon,
        destinationLat: pendingRequest.destinationBlock.centerLat,
        destinationLon: pendingRequest.destinationBlock.centerLon,
        finalLat: null,
        finalLon: null,
      };
      
      console.log('✅ Ride accepted successfully (MQTT mode):', acceptedRide);
      
      setCurrentRide(acceptedRide);
      setPendingRequest(null);
      removeAvailableRide(pendingRequest.id);
      
      // Show acceptance notification
      notificationManager.showRideAcceptedNotification(acceptedRide.id);
      
      console.log('🗺️ Navigating to pickup screen...');
    } catch (error: any) {
      console.error('❌ Failed to accept ride:', error);
      alert('Failed to accept ride. Please try again.');
      setPendingRequest(null);
      removeAvailableRide(pendingRequest.id);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle rejecting a ride request
   */
  const handleRejectRide = async () => {
    if (!pendingRequest || !puller) return;

    console.log(`❌ Rejecting pending ride ${pendingRequest.id} for puller ${puller.id}`);
    setIsLoading(true);

    try {
      await apiService.rejectRide(pendingRequest.id, puller.id);
      setPendingRequest(null);
      removeAvailableRide(pendingRequest.id);
      console.log('✅ Ride rejected successfully (API/WebSocket)');
    } catch (error) {
      console.error('❌ Failed to reject pending ride via API:', error);
      // Clear locally to keep UI responsive
      setPendingRequest(null);
      removeAvailableRide(pendingRequest.id);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle ride request timeout
   */
  const handleRideTimeout = () => {
    setPendingRequest(null);
  };

  /**
   * Handle confirming pickup
   */
  const handleConfirmPickup = async () => {
    if (!currentRide) return;

    console.log('📍 Confirming pickup for ride:', currentRide.id);
    setIsLoading(true);
    
    try {
      // Call backend API to mark ride as picked up (ACTIVE)
      const updatedRide = await apiService.pickupRide(String(currentRide.id));

      console.log('✅ Pickup confirmed (API):', updatedRide);

      // Merge updated fields from backend but DO NOT overwrite map-related
      // coordinates and block objects coming from the current UI state.
      // Some backend responses may omit or shrink these fields which causes
      // markers to disappear — preserve the frontend values explicitly.
      const mergedRide = {
        ...currentRide,
        ...updatedRide,
        // Always preserve frontend coordinates/blocks to keep markers stable
        pickupLat: currentRide.pickupLat,
        pickupLon: currentRide.pickupLon,
        destinationLat: currentRide.destinationLat,
        destinationLon: currentRide.destinationLon,
        pickupBlock: currentRide.pickupBlock,
        destinationBlock: currentRide.destinationBlock,
      };

      setCurrentRide(mergedRide);
    } catch (error) {
      console.error('❌ Failed to confirm pickup:', error);
      alert('Failed to confirm pickup. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle completing a ride
   */
  const handleCompleteRide = async () => {
    if (!currentRide || !puller) return;

    setIsLoading(true);
    try {
      // Get mock location for completion
      const { lat: mockLat, lon: mockLon } = locationService.getMockLocation();

      // Determine optional override points (use estimatedPoints from UI if available)
      // Ensure we pass a number to the API (apiService only attaches pointsOverride when typeof number)
      const rawEstimated = (currentRide as any)?.estimatedPoints ?? currentRide.pointsAwarded ?? undefined;
      const numericOverride = typeof rawEstimated === 'number' ? rawEstimated : Number(rawEstimated);
      const overridePoints = Number.isFinite(numericOverride) ? Math.max(0, Math.floor(numericOverride)) : undefined;

      // Call the API to complete the ride (pass override when available)
      const completedRideData = await apiService.completeRide(String(currentRide.id), mockLat, mockLon, overridePoints);

      // Merge backend response but preserve map coordinates and blocks if backend omits them
      const mergedCompletedRide = {
        ...currentRide,
        ...completedRideData,
        status: RideStatus.COMPLETED,
        completionTime: new Date().toISOString(),
        // Preserve coordinates/blocks if backend didn't include them
        pickupLat: completedRideData.pickupLat ?? currentRide.pickupLat,
        pickupLon: completedRideData.pickupLon ?? currentRide.pickupLon,
        destinationLat: completedRideData.destinationLat ?? currentRide.destinationLat,
        destinationLon: completedRideData.destinationLon ?? currentRide.destinationLon,
        pickupBlock: completedRideData.pickupBlock ?? currentRide.pickupBlock,
        destinationBlock: completedRideData.destinationBlock ?? currentRide.destinationBlock,
        finalLat: completedRideData.finalLat ?? currentRide.finalLat,
        finalLon: completedRideData.finalLon ?? currentRide.finalLon,
      };

      // Update puller balance using awarded points from backend (or 0)
      const awarded = completedRideData?.pointsAwarded ?? 0;

      // Update global puller state so HomeScreen and other components show the new balance immediately
      if (puller) {
        const updatedPuller = { ...puller, pointsBalance: (puller.pointsBalance || 0) + awarded };
        setPuller(updatedPuller);
      }

      const completedRide = {
        ...mergedCompletedRide,
        puller: puller ? { ...puller, pointsBalance: (puller.pointsBalance || 0) + awarded } : mergedCompletedRide.puller,
      };

      // Show completion notification
      notificationManager.showRideCompletedNotification(awarded);

      // Show completion modal
      setLastCompletedRide(completedRide);
      setShowRideCompleteModal(true);
      setCurrentRide(null);

      console.log('✅ Ride completed successfully');
    } catch (error) {
      console.error('❌ Failed to complete ride:', error);
      alert('Failed to complete ride. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle dismissing ride complete modal
   */
  const handleDismissCompleteModal = () => {
    setShowRideCompleteModal(false);
    setLastCompletedRide(null);
  };

  // Determine which screen to show
  const renderScreen = () => {
    // Not logged in
    if (!puller) {
      return <LoginScreen />;
    }

    // Show ride history (future feature)
    if (showHistory) {
      return (
        <div className="min-h-screen bg-black text-white p-6">
          <button onClick={() => setShowHistory(false)} className="text-primary text-xl mb-4">
            ← Back
          </button>
          <h1 className="text-3xl font-bold">Ride History</h1>
          <p className="text-xl text-gray-400 mt-4">Coming soon...</p>
        </div>
      );
    }

    // Active ride - ride in progress (passenger picked up)
    if (currentRide && currentRide.status === RideStatus.ACTIVE) {
      return (
        <ActiveRideScreen
          ride={currentRide}
          onCompleteRide={handleCompleteRide}
        />
      );
    }

    // Accepted ride - going to pickup
    if (currentRide && currentRide.status === RideStatus.ACCEPTED) {
      return (
        <PickupScreen
          ride={currentRide}
          onConfirmPickup={handleConfirmPickup}
        />
      );
    }

    // Default home screen
    return (
      <HomeScreen
        onViewHistory={() => setShowHistory(true)}
        onViewAvailableRides={() => setShowAvailableRidesModal(true)}
      />
    );
  };

  return (
    <div className="relative">
      {/* Main Screen */}
      {renderScreen()}

      {/* Available Rides Modal */}
      {showAvailableRidesModal && (
        <AvailableRidesModal
          rides={availableRides}
          onAccept={handleAcceptRideFromModal}
          onReject={handleRejectRideFromModal}
          onClose={() => setShowAvailableRidesModal(false)}
        />
      )}

      {/* Ride Request Modal Overlay */}
      {pendingRequest && !isLoading && (
        <RideRequestModal
          request={pendingRequest}
          onAccept={handleAcceptRide}
          onReject={handleRejectRide}
          onTimeout={handleRideTimeout}
        />
      )}

      {/* Ride Complete Modal */}
      {showRideCompleteModal && lastCompletedRide && (
        <RideCompleteModal
          ride={lastCompletedRide}
          onDismiss={handleDismissCompleteModal}
        />
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-80 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-24 w-24 border-8 border-gray-700 border-t-primary mb-4" />
            <p className="text-2xl text-white">Processing...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
