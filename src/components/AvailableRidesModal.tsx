import { useState } from 'react';
import { RideRequest } from '../types';

/**
 * AvailableRidesModal Component
 * Shows all available ride requests that the puller can accept or reject
 * 
 * Features:
 * - List all available rides
 * - Accept/Reject individual rides
 * - Responsive design
 * - High contrast, mobile-first UI
 */

interface AvailableRidesModalProps {
  rides: RideRequest[];
  onAccept: (rideId: number) => void;
  onReject: (rideId: number) => void;
  onClose: () => void;
}

export const AvailableRidesModal: React.FC<AvailableRidesModalProps> = ({
  rides,
  onAccept,
  onReject,
  onClose,
}) => {
  const [processingRideId, setProcessingRideId] = useState<number | null>(null);

  // Debug: Log rides data
  console.log('🔍 AvailableRidesModal - Rides data:', rides);
  rides.forEach(ride => {
    console.log(`Ride ${ride.id}:`, {
      pickupBlock: ride.pickupBlock,
      destinationBlock: ride.destinationBlock,
      pickupBlockName: ride.pickupBlock?.name,
      destinationBlockName: ride.destinationBlock?.name,
    });
  });

  const handleAccept = async (rideId: number) => {
    setProcessingRideId(rideId);
    await onAccept(rideId);
    setProcessingRideId(null);
  };

  const handleReject = async (rideId: number) => {
    setProcessingRideId(rideId);
    await onReject(rideId);
    setProcessingRideId(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl max-h-[90vh] bg-gray-900 rounded-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary-dark p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold text-white">
              🚗 Available Rides
            </h2>
            <button
              onClick={onClose}
              className="text-white text-4xl font-bold hover:bg-white hover:bg-opacity-20 rounded-full w-12 h-12 flex items-center justify-center transition-colors"
            >
              ×
            </button>
          </div>
          <p className="text-white text-opacity-80 mt-2">
            {rides.length} ride{rides.length !== 1 ? 's' : ''} waiting for pullers
          </p>
        </div>

        {/* Rides List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {rides.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-2xl text-gray-400">No rides available</p>
            </div>
          ) : (
            rides.map((ride) => (
              <div
                key={ride.id}
                className="bg-gray-800 rounded-xl p-6 border-2 border-gray-700 hover:border-primary transition-colors"
              >
                {/* Ride Details */}
                <div className="mb-6">
                  {/* Ride ID for debugging */}
                  <div className="mb-2">
                    <p className="text-xs text-gray-500">Ride #{ride.id}</p>
                  </div>

                  {/* From */}
                  <div className="mb-4">
                    <p className="text-sm text-gray-400 mb-1">FROM</p>
                    <p className="text-2xl font-bold text-white">
                      📍 {ride.pickupBlock?.name || ride.pickupBlock?.blockId || 'Unknown Location'}
                    </p>
                    {!ride.pickupBlock?.name && (
                      <p className="text-xs text-red-400 mt-1">
                        Debug: {JSON.stringify(ride.pickupBlock)}
                      </p>
                    )}
                  </div>

                  {/* To */}
                  <div className="mb-4">
                    <p className="text-sm text-gray-400 mb-1">TO</p>
                    <p className="text-2xl font-bold text-white">
                      🎯 {ride.destinationBlock?.name || ride.destinationBlock?.blockId || 'Unknown Destination'}
                    </p>
                    {!ride.destinationBlock?.name && (
                      <p className="text-xs text-red-400 mt-1">
                        Debug: {JSON.stringify(ride.destinationBlock)}
                      </p>
                    )}
                  </div>

                  {/* Points */}
                  <div className="bg-primary bg-opacity-20 border border-primary rounded-lg p-4 inline-block">
                    <p className="text-sm text-primary mb-1">YOU'LL EARN</p>
                    <p className="text-3xl font-bold text-primary">
                      +{ride.estimatedPoints || 0} Points
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleReject(ride.id)}
                    disabled={processingRideId === ride.id}
                    className="py-4 text-xl font-bold bg-danger text-white rounded-xl active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processingRideId === ride.id ? 'Processing...' : '✖ Reject'}
                  </button>
                  <button
                    onClick={() => handleAccept(ride.id)}
                    disabled={processingRideId === ride.id}
                    className="py-4 text-xl font-bold bg-success text-white rounded-xl active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processingRideId === ride.id ? 'Processing...' : '✓ Accept'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-800 border-t-2 border-gray-700">
          <button
            onClick={onClose}
            className="w-full py-4 text-xl font-bold bg-gray-700 text-white rounded-xl active:scale-95 transition-transform"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
