import { useState, useEffect } from 'react';
import { RideRequest } from '../types';
import { soundAlert } from '../utils/soundAlert';
import { getTimeRemaining } from '../utils/helpers';

/**
 * RideRequestModal Component
 * Full-screen modal overlay for incoming ride requests
 * 
 * Features:
 * - Loud looping audio alert
 * - Large, high-contrast UI
 * - 30-second countdown timer
 * - Accept/Reject buttons
 * - Auto-dismiss on timeout
 */

interface RideRequestModalProps {
  request: RideRequest;
  onAccept: () => void;
  onReject: () => void;
  onTimeout: () => void;
}

export const RideRequestModal: React.FC<RideRequestModalProps> = ({
  request,
  onAccept,
  onReject,
  onTimeout,
}) => {
  const [timeRemaining, setTimeRemaining] = useState(30);

  useEffect(() => {
    // Start the alarm sound
    soundAlert.playAlert();

    // Calculate initial time remaining
    const remaining = getTimeRemaining(request.expiresAt);
    setTimeRemaining(remaining);

    // Update countdown every second
    const interval = setInterval(() => {
      const remaining = getTimeRemaining(request.expiresAt);
      setTimeRemaining(remaining);

      // Auto-dismiss when time runs out
      if (remaining <= 0) {
        handleTimeout();
      }
    }, 1000);

    // Cleanup
    return () => {
      clearInterval(interval);
      soundAlert.stopAlert();
      soundAlert.stopVibration();
    };
  }, [request.expiresAt]);

  const handleAccept = () => {
    soundAlert.stopAlert();
    soundAlert.stopVibration();
    soundAlert.playSuccess();
    onAccept();
  };

  const handleReject = () => {
    soundAlert.stopAlert();
    soundAlert.stopVibration();
    onReject();
  };

  const handleTimeout = () => {
    soundAlert.stopAlert();
    soundAlert.stopVibration();
    onTimeout();
  };

  // Calculate progress percentage
  const progressPercentage = (timeRemaining / 30) * 100;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Pulsing Alert Header */}
        <div className="text-center mb-8 animate-pulse">
          <h1 className="text-6xl font-bold text-warning mb-2">
            🔔 NEW RIDE!
          </h1>
        </div>

        {/* Ride Details Card */}
        <div className="bg-gray-900 rounded-2xl p-8 mb-8 border-4 border-warning">
          {/* From */}
          <div className="mb-6">
            <p className="text-xl text-gray-400 mb-2">FROM</p>
            <p className="text-3xl font-bold text-white">
              {request.pickupBlock.name}
            </p>
          </div>

          {/* Arrow */}
          <div className="text-center mb-6">
            <span className="text-5xl text-primary">↓</span>
          </div>

          {/* To */}
          <div className="mb-6">
            <p className="text-xl text-gray-400 mb-2">TO</p>
            <p className="text-3xl font-bold text-white">
              {request.destinationBlock.name}
            </p>
          </div>

          {/* Points Reward */}
          <div className="bg-primary bg-opacity-20 rounded-xl p-6 text-center">
            <p className="text-xl text-primary mb-2">EARN APPROX.</p>
            <p className="text-5xl font-bold text-primary">
              +{request.estimatedPoints}
            </p>
            <p className="text-2xl text-primary">Points</p>
          </div>
        </div>

        {/* Timer Progress Bar */}
        <div className="mb-6">
          <div className="bg-gray-800 rounded-full h-4 overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ${
                timeRemaining > 10
                  ? 'bg-primary'
                  : timeRemaining > 5
                  ? 'bg-warning'
                  : 'bg-danger'
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <p className="text-center text-2xl text-white mt-3 font-mono">
            {timeRemaining}s remaining
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          {/* Reject Button */}
          <button
            onClick={handleReject}
            className="py-8 text-2xl font-bold bg-danger text-white rounded-xl active:scale-95 transition-transform"
          >
            REJECT
          </button>

          {/* Accept Button */}
          <button
            onClick={handleAccept}
            className="py-8 text-2xl font-bold bg-primary text-white rounded-xl active:scale-95 transition-transform shadow-lg shadow-primary/50"
          >
            ACCEPT
          </button>
        </div>
      </div>
    </div>
  );
};
