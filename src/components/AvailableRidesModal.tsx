import { useState, useEffect } from 'react';
import { RideRequest } from '../types';
import { getTimeRemaining } from '../utils/helpers';

/**
 * AvailableRidesModal Component
 * Shows all available ride requests that the puller can accept or reject
 * 
 * Features:
 * - List all available rides
 * - Accept/Reject individual rides
 * - Countdown timer for each ride (1 minute expiration)
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

  // Update every second to refresh countdown timers
  useEffect(() => {
    const interval = setInterval(() => {
      // Force re-render to update countdown timers
      setProcessingRideId(prev => prev);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

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
    console.log(`✅ User accepting ride ${rideId}...`);
    setProcessingRideId(rideId);
    try {
      await onAccept(rideId);
      console.log(`✅ Ride ${rideId} acceptance complete`);
    } catch (error) {
      console.error(`❌ Error accepting ride ${rideId}:`, error);
    } finally {
      setProcessingRideId(null);
    }
  };

  const handleReject = async (rideId: number) => {
    console.log(`❌ User rejecting ride ${rideId}...`);
    setProcessingRideId(rideId);
    try {
      await onReject(rideId);
      console.log(`✅ Ride ${rideId} rejection complete`);
    } catch (error) {
      console.error(`❌ Error rejecting ride ${rideId}:`, error);
    } finally {
      setProcessingRideId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-3">
      <div className="w-full max-w-lg max-h-[90vh] bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl overflow-hidden flex flex-col border border-slate-700 shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">
                Available Rides
              </h2>
              <p className="text-emerald-100 text-sm mt-1">
                {rides.length} ride{rides.length !== 1 ? 's' : ''} waiting
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full w-10 h-10 flex items-center justify-center transition-colors text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Rides List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {rides.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🚗</div>
              <p className="text-xl text-slate-400">No rides available</p>
              <p className="text-sm text-slate-500 mt-2">Check back soon!</p>
            </div>
          ) : (
            rides.map((ride, index) => {
              const timeRemaining = getTimeRemaining(ride.expiresAt);
              const isExpiringSoon = timeRemaining <= 20; // Warning when < 20 seconds
              const isAlmostExpired = timeRemaining <= 10; // Critical when < 10 seconds
              
              return (
              <div
                key={ride.id}
                className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700 hover:border-emerald-500/50 transition-all shadow-lg"
              >
                {/* Ride Number Badge and Timer */}
                <div className="flex items-center justify-between mb-3">
                  <div className="bg-emerald-500/20 px-3 py-1 rounded-full">
                    <p className="text-xs font-bold text-emerald-400">
                      RIDE #{index + 1}
                    </p>
                  </div>
                  <div className={`px-2 py-1 rounded-full font-mono text-xs font-bold ${
                    isAlmostExpired 
                      ? 'bg-red-500/20 text-red-400 animate-pulse' 
                      : isExpiringSoon 
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-slate-700 text-slate-400'
                  }`}>
                    {timeRemaining}s
                  </div>
                </div>

                {/* Route */}
                <div className="mb-4">
                  {/* From */}
                  <div className="flex items-start gap-2 mb-2">
                    <div className="bg-blue-500/20 rounded p-1.5 mt-0.5">
                      <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-slate-400 uppercase">From</p>
                      <p className="text-base font-bold text-white">
                        {ride.pickupBlock?.name || ride.pickupBlock?.blockId || 'Unknown'}
                      </p>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="ml-2.5 my-1">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>

                  {/* To */}
                  <div className="flex items-start gap-2">
                    <div className="bg-red-500/20 rounded p-1.5 mt-0.5">
                      <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-slate-400 uppercase">To</p>
                      <p className="text-base font-bold text-white">
                        {ride.destinationBlock?.name || ride.destinationBlock?.blockId || 'Unknown'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Points Badge */}
                <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-lg p-3 mb-4">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-emerald-100 text-xs font-medium">EARN</span>
                    <span className="text-white text-xl font-bold">+{ride.estimatedPoints || 0}</span>
                    <span className="text-emerald-100 text-xs font-medium">POINTS</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleReject(ride.id)}
                    disabled={processingRideId === ride.id}
                    className="py-2.5 text-sm font-bold bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-1"
                  >
                    {processingRideId === ride.id ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>...</span>
                      </>
                    ) : (
                      'REJECT'
                    )}
                  </button>
                  <button
                    onClick={() => handleAccept(ride.id)}
                    disabled={processingRideId === ride.id}
                    className="py-2.5 text-sm font-bold bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white rounded-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/50 flex items-center justify-center gap-1"
                  >
                    {processingRideId === ride.id ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>...</span>
                      </>
                    ) : (
                      'ACCEPT'
                    )}
                  </button>
                </div>
              </div>
            );
            })
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
