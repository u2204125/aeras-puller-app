import { useEffect, useState } from 'react';
import { useAppStore } from './store/appStore';
import { apiService } from './services/api.service';
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
  
  const setPuller = useAppStore((state) => state.setPuller);
  const setCurrentRide = useAppStore((state) => state.setCurrentRide);
  const setPendingRequest = useAppStore((state) => state.setPendingRequest);
  const setIsConnected = useAppStore((state) => state.setIsConnected);
  const setUserLocation = useAppStore((state) => state.setUserLocation);
  const setShowRideCompleteModal = useAppStore((state) => state.setShowRideCompleteModal);
  const setLastCompletedRide = useAppStore((state) => state.setLastCompletedRide);
  const updatePullerPoints = useAppStore((state) => state.updatePullerPoints);
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
          // Publish location to MQTT (backend will update DB)
          mqttService.publishLocation(location.latitude, location.longitude);
        })
        .catch((error) => {
          console.error('Failed to get location:', error);
          // Use mock location for demo (Dhaka, Bangladesh)
          const mockLocation = { latitude: 23.8103, longitude: 90.4125 };
          console.log('📍 Using mock location for demo:', mockLocation);
          setUserLocation(mockLocation);
          mqttService.publishLocation(mockLocation.latitude, mockLocation.longitude);
        });

      // Watch position changes (with fallback)
      const id = watchPosition(
        (location) => {
          setUserLocation(location);
          // Publish location to MQTT every update (backend listens and updates DB)
          mqttService.publishLocation(location.latitude, location.longitude);
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
   * Setup MQTT event handlers (only once)
   */
  useEffect(() => {
    // Setup MQTT event handlers
    mqttService.onRideRequest((request) => {
      console.log('🔔 New ride request received via MQTT:', request);
      
      // Show notification with audio and vibration
      notificationManager.showRideRequestNotification({
        rideId: request.id,
        from: request.pickupBlock.name,
        to: request.destinationBlock.name,
        points: request.estimatedPoints,
      });
      
      // Add to available rides
      useAppStore.getState().addAvailableRide(request);
      // Set as pending request to show modal
      useAppStore.getState().setPendingRequest(request);
    });

    mqttService.onRideFilled((rideId) => {
      console.log('🚫 Ride filled:', rideId);
      // Remove from available rides
      useAppStore.getState().removeAvailableRide(rideId);
      // Get current state and only clear if it matches
      const current = useAppStore.getState().pendingRequest;
      if (current && current.id === rideId) {
        useAppStore.getState().setPendingRequest(null);
      }
    });

    mqttService.onRideUpdate((ride) => {
      console.log('📝 Ride update received via MQTT:', ride);
      
      // If ride status changed to ACCEPTED or not SEARCHING, remove from available
      if (ride.status !== 'SEARCHING') {
        useAppStore.getState().removeAvailableRide(ride.id);
      }
      
      // Get current state and only update if it matches
      const current = useAppStore.getState().currentRide;
      if (current && current.id === ride.id) {
        useAppStore.getState().setCurrentRide(ride);
      }
    });

    mqttService.onNotification((notification) => {
      console.log('📬 Notification received via MQTT:', notification);
      // Handle specific notification types
      if (notification.type === 'ride_rejected') {
        console.log('Ride rejection confirmed by server');
      }
    });
  }, []); // Run only once on mount

  /**
   * Connect/disconnect MQTT when puller changes
   */
  useEffect(() => {
    if (puller) {
      console.log('🔌 Connecting MQTT for puller:', puller.id);
      
      // Connect to MQTT - callbacks are already registered
      mqttService.connect(
        puller.id.toString(),
        () => {
          console.log('✅ MQTT connected, puller subscribed to topics');
          setIsConnected(true);
        },
        () => {
          console.log('❌ MQTT disconnected');
          setIsConnected(false);
        }
      );

      return () => {
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

    setIsLoading(true);
    try {
      const acceptedRide = await apiService.acceptRide(rideId, puller.id);
      setCurrentRide(acceptedRide);
      removeAvailableRide(rideId);
      setShowAvailableRidesModal(false);
      
      // Show acceptance notification
      notificationManager.showRideAcceptedNotification(acceptedRide.id);
    } catch (error: any) {
      console.error('Failed to accept ride:', error);
      alert(error.response?.data?.message || 'Failed to accept ride. It may have been filled.');
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

    try {
      await apiService.rejectRide(rideId, puller.id);
      removeAvailableRide(rideId);
    } catch (error) {
      console.error('Failed to reject ride:', error);
      removeAvailableRide(rideId);
    }
  };

  /**
   * Handle accepting a ride request from pending modal
   */
  const handleAcceptRide = async () => {
    if (!pendingRequest || !puller) return;

    setIsLoading(true);
    try {
      const acceptedRide = await apiService.acceptRide(
        pendingRequest.id,
        puller.id
      );
      setCurrentRide(acceptedRide);
      setPendingRequest(null);
      
      // Show acceptance notification
      notificationManager.showRideAcceptedNotification(acceptedRide.id);
    } catch (error: any) {
      console.error('Failed to accept ride:', error);
      alert(error.response?.data?.message || 'Failed to accept ride. It may have been filled.');
      setPendingRequest(null);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle rejecting a ride request
   */
  const handleRejectRide = async () => {
    if (!pendingRequest || !puller) return;

    try {
      await apiService.rejectRide(pendingRequest.id, puller.id);
    } catch (error) {
      console.error('Failed to reject ride:', error);
    } finally {
      setPendingRequest(null);
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

    setIsLoading(true);
    try {
      const updatedRide = await apiService.confirmPickup(currentRide.id);
      setCurrentRide(updatedRide);
    } catch (error) {
      console.error('Failed to confirm pickup:', error);
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
      // For demo purposes, use destination coordinates or fallback coordinates
      // In production, this would use actual GPS: await getCurrentPosition()
      const mockLat = currentRide.destinationLat || 23.8103;
      const mockLon = currentRide.destinationLon || 90.4125;
      
      console.log(`🎯 Completing ride with coordinates: ${mockLat}, ${mockLon}`);
      
      // Complete the ride
      const completedRide = await apiService.completeRide(
        currentRide.id,
        mockLat,
        mockLon
      );

      // Update puller points
      if (completedRide.pointsAwarded) {
        const newBalance = puller.pointsBalance + completedRide.pointsAwarded;
        updatePullerPoints(newBalance);
        
        // Update the completed ride with new balance
        completedRide.puller = { ...puller, pointsBalance: newBalance };
        
        // Show completion notification
        notificationManager.showRideCompletedNotification(completedRide.pointsAwarded);
      }

      // Show completion modal
      setLastCompletedRide(completedRide);
      setShowRideCompleteModal(true);
      setCurrentRide(null);

      // Refresh puller data from server
      const updatedPuller = await apiService.getPuller(puller.id);
      setPuller(updatedPuller);
      
    } catch (error) {
      console.error('Failed to complete ride:', error);
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
