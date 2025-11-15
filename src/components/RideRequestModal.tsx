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
  const [timeRemaining, setTimeRemaining] = useState(60);

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

  // Calculate progress percentage (60 seconds = 100%)
  const progressPercentage = (timeRemaining / 60) * 100;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
      <div className="w-full max-w-sm mx-auto">
        {/* Ride Details Card */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 border border-amber-500/20 shadow-2xl">
          
          {/* From Location */}
          <div className="mb-4 text-center">
            <p className="text-2xl font-bold text-white tracking-tight">
              {request.pickupBlock.name}
            </p>
          </div>

          {/* Arrow Indicator */}
          <div className="flex justify-center mb-4">
            <div className="bg-emerald-500/10 rounded-full p-2">
              <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          </div>

          {/* To Label */}
          <div className="mb-2 text-center">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">
              TO
            </p>
          </div>

          {/* To Location */}
          <div className="mb-5 text-center">
            <p className="text-2xl font-bold text-white tracking-tight">
              {request.destinationBlock.name}
            </p>
          </div>

          {/* Points Reward Card */}
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl p-4 text-center shadow-lg mb-4">
            <p className="text-xs text-emerald-100 uppercase tracking-wider font-medium mb-1">
              EARN APPROX.
            </p>
            <p className="text-5xl font-bold text-white mb-0.5">
              +{request.estimatedPoints}
            </p>
            <p className="text-lg text-emerald-100 font-medium">
              Points
            </p>
          </div>

          {/* Timer Progress Bar */}
          <div className="mb-4">
            <div className="bg-slate-700/50 rounded-full h-2.5 overflow-hidden shadow-inner">
              <div
                className={`h-full transition-all duration-1000 ease-linear ${
                  timeRemaining > 10
                    ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                    : timeRemaining > 5
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                    : 'bg-gradient-to-r from-red-500 to-red-600 animate-pulse'
                }`}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <p className={`text-center text-base mt-2 font-bold font-mono ${
              timeRemaining > 10
                ? 'text-emerald-400'
                : timeRemaining > 5
                ? 'text-amber-400'
                : 'text-red-400 animate-pulse'
            }`}>
              {timeRemaining}s remaining
            </p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            {/* Reject Button */}
            <button
              onClick={handleReject}
              className="py-3.5 text-base font-bold bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-lg active:scale-95 transition-all shadow-lg hover:shadow-red-500/50"
            >
              REJECT
            </button>

            {/* Accept Button */}
            <button
              onClick={handleAccept}
              className="py-3.5 text-base font-bold bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white rounded-lg active:scale-95 transition-all shadow-lg shadow-emerald-500/50 hover:shadow-emerald-400/60"
            >
              ACCEPT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
