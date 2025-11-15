import { useEffect, useState, useCallback } from 'react';
import { socketService } from '../services/socket.service';

/**
 * Custom hook to manage WebSocket connection
 * Provides connection status and socket service instance
 */
export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);

  const checkConnection = useCallback(() => {
    try {
      const connected = socketService.isConnected();
      setIsConnected(connected);
    } catch (error) {
      console.error('Error checking socket connection:', error);
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    // Check connection status periodically
    Promise.resolve().then(checkConnection);
    const interval = setInterval(checkConnection, 1000);

    return () => {
      clearInterval(interval);
      // Don't disconnect on unmount to maintain connection across component changes
    };
  }, [checkConnection]);

  return { isConnected, socket: socketService };
};
