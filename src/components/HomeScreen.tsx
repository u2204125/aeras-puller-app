import { useAppStore } from '../store/appStore';
import { apiService } from '../services/api.service';
import { mqttService } from '../services/mqtt.service';
import { formatPoints } from '../utils/helpers';

/**
 * HomeScreen Component
 * Main screen when puller is online and waiting for rides
 * 
 * Features:
 * - Display online status
 * - Show current points balance
 * - Go offline button
 * - Connection status indicator
 */

interface HomeScreenProps {
  onViewHistory: () => void;
  onViewAvailableRides: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onViewHistory, onViewAvailableRides }) => {
  const puller = useAppStore((state) => state.puller);
  const isOnline = useAppStore((state) => state.isOnline);
  const isConnected = useAppStore((state) => state.isConnected);
  const availableRides = useAppStore((state) => state.availableRides);
  const setIsOnline = useAppStore((state) => state.setIsOnline);
  const setPuller = useAppStore((state) => state.setPuller);
  const reset = useAppStore((state) => state.reset);

  // Toggle online status
  const handleToggleOnline = async () => {
    if (!puller) return;

    try {
      const updatedPuller = await apiService.updateOnlineStatus(
        puller.id,
        !isOnline
      );
      setPuller(updatedPuller);
      setIsOnline(updatedPuller.isOnline);
      
      // Publish status update to MQTT
      mqttService.publishStatus(updatedPuller.isOnline, updatedPuller.isActive);
    } catch (error) {
      console.error('Failed to update online status:', error);
    }
  };

  // Logout
  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to logout?')) {
      try {
        // Set offline before logout
        if (puller && isOnline) {
          await apiService.updateOnlineStatus(puller.id, false);
          // Publish offline status to MQTT
          mqttService.publishStatus(false, puller.isActive);
        }
      } catch (error) {
        console.error('Failed to set offline status:', error);
      }
      
      // Disconnect MQTT
      mqttService.disconnect();
      
      // Clear API token
      apiService.logout();
      
      // Reset app state
      reset();
    }
  };

  if (!puller) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 p-6 border-b-2 border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold">{puller.name}</h2>
          
          {/* Connection Indicator */}
          <div className="flex items-center gap-2">
            <div
              className={`w-4 h-4 rounded-full ${
                isConnected ? 'bg-primary' : 'bg-danger'
              }`}
            />
            <span className="text-sm text-gray-400">
              {isConnected ? 'Connected' : 'Offline'}
            </span>
          </div>
        </div>
        <p className="text-lg text-gray-400">{puller.phone}</p>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {/* Online Status */}
        <div className="text-center mb-12">
          <div
            className={`inline-block px-8 py-4 rounded-full ${
              isOnline ? 'bg-primary bg-opacity-20' : 'bg-gray-800'
            }`}
          >
            <p
              className={`text-3xl font-bold ${
                isOnline ? 'text-primary' : 'text-gray-500'
              }`}
            >
              {isOnline ? '● You are Online' : '○ You are Offline'}
            </p>
          </div>

          {isOnline && (
            <p className="text-xl text-gray-400 mt-4">
              Waiting for ride requests...
            </p>
          )}
          
          {/* Available Rides Indicator */}
          {isOnline && availableRides.length > 0 && (
            <div className="mt-6 flex flex-col items-center gap-3">
              <div className="inline-block px-6 py-3 bg-warning bg-opacity-20 border-2 border-warning rounded-full animate-pulse">
                <p className="text-lg font-semibold text-warning">
                  🔔 {availableRides.length} Ride{availableRides.length !== 1 ? 's' : ''} Available!
                </p>
              </div>
              <button
                onClick={onViewAvailableRides}
                className="px-8 py-4 bg-warning text-black font-bold text-xl rounded-xl active:scale-95 transition-transform shadow-lg hover:bg-yellow-400"
              >
                View Ride Requests
              </button>
            </div>
          )}
        </div>

        {/* Points Balance */}
        <div className="w-full max-w-md bg-gradient-to-br from-primary to-primary-dark rounded-2xl p-8 mb-8 shadow-2xl">
          <p className="text-xl text-white text-opacity-80 mb-2">
            Current Points
          </p>
          <p className="text-6xl font-bold text-white">
            {formatPoints(puller.pointsBalance)}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="w-full max-w-md space-y-4">
          {/* Toggle Online Button */}
          <button
            onClick={handleToggleOnline}
            className={`w-full py-6 text-2xl font-bold rounded-xl active:scale-95 transition-transform ${
              isOnline
                ? 'bg-gray-800 text-white'
                : 'bg-primary text-white'
            }`}
          >
            {isOnline ? 'Go Offline' : 'Go Online'}
          </button>

          {/* View History Button */}
          <button
            onClick={onViewHistory}
            className="w-full py-6 text-2xl font-bold bg-gray-800 text-white rounded-xl active:scale-95 transition-transform"
          >
            Ride History
          </button>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full py-5 text-xl font-medium bg-transparent border-2 border-gray-700 text-gray-400 rounded-xl active:scale-95 transition-transform"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-6 text-center text-gray-600 text-sm">
        <p>AERAS Rickshaw Puller System</p>
      </div>
    </div>
  );
};
