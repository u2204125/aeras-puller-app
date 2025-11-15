import { useEffect } from 'react';
import { Ride } from '../types';
import { formatPoints } from '../utils/helpers';
import { soundAlert } from '../utils/soundAlert';

/**
 * RideCompleteModal Component
 * Full-screen success modal shown after completing a ride
 * 
 * Features:
 * - Success animation
 * - Points earned display
 * - Updated balance
 */

interface RideCompleteModalProps {
  ride: Ride;
  onDismiss: () => void;
}

export const RideCompleteModal: React.FC<RideCompleteModalProps> = ({
  ride,
  onDismiss,
}) => {
  useEffect(() => {
    // Play success sound
    soundAlert.playSuccess();
  }, []);

  return (
    <div className="absolute inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md text-center">
        {/* Success Icon */}
        <div className="mb-6 sm:mb-8">
          <div className="inline-block bg-primary bg-opacity-20 rounded-full p-6 sm:p-8">
            <svg
              className="w-20 h-20 sm:w-32 sm:h-32 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-5xl font-bold text-white mb-6 sm:mb-8">
          Ride Complete!
        </h1>

        {/* Points Earned */}
        <div className="bg-gray-900 rounded-2xl p-6 sm:p-8 mb-4 sm:mb-6">
          <p className="text-lg sm:text-2xl text-gray-400 mb-2">Points Earned</p>
          <p className="text-5xl sm:text-6xl font-bold text-primary mb-4">
            +{formatPoints(ride.pointsAwarded || 0)}
          </p>
          
          {/* New Balance */}
          <div className="border-t-2 border-gray-800 pt-4 mt-4">
            <p className="text-base sm:text-xl text-gray-400 mb-2">New Total</p>
            <p className="text-3xl sm:text-4xl font-bold text-white">
              {formatPoints(ride.puller?.pointsBalance || 0)}
            </p>
          </div>
        </div>

        {/* Ride Details */}
        <div className="bg-gray-900 bg-opacity-50 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8 text-left">
          <div className="flex justify-between items-start sm:items-center mb-3 gap-2">
            <span className="text-base sm:text-lg text-gray-400 flex-shrink-0">From:</span>
            <span className="text-lg sm:text-xl text-white font-medium text-right break-words">
              {ride.pickupBlock?.name || 'Unknown'}
            </span>
          </div>
          <div className="flex justify-between items-start sm:items-center gap-2">
            <span className="text-base sm:text-lg text-gray-400 flex-shrink-0">To:</span>
            <span className="text-lg sm:text-xl text-white font-medium text-right break-words">
              {ride.destinationBlock?.name || 'Unknown'}
            </span>
          </div>
        </div>

        {/* OK Button */}
        <button
          onClick={onDismiss}
          className="w-full py-5 sm:py-7 text-2xl sm:text-3xl font-bold bg-primary text-white rounded-xl active:scale-95 transition-transform shadow-lg hover:shadow-xl"
        >
          OK
        </button>
      </div>
    </div>
  );
};
