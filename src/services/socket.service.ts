import { io, Socket } from 'socket.io-client';
import type { Ride } from '../types';
import { getSecureUrl } from '../utils/protocol';

export type SocketEventCallback<T = any> = (data: T) => void;

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = Infinity; // Allow infinite reconnection attempts
  private reconnectDelay = 1000;
  private eventListeners: Map<string, Set<SocketEventCallback>> = new Map();
  private pullerId: number | null = null;

  connect(pullerId: number): void {
    this.pullerId = pullerId;
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    // If socket exists but disconnected, try to reconnect
    if (this.socket && !this.socket.connected) {
      console.log('Attempting to reconnect existing socket...');
      this.socket.connect();
      return;
    }

    const wsUrl = getSecureUrl(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000');
    console.log('🔌 Connecting to WebSocket:', wsUrl);

    this.socket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
      timeout: 20000,
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket?.id);
      this.reconnectAttempts = 0;
      
      // Register puller with backend
      if (this.pullerId !== null) {
        this.socket?.emit('register_puller', { pullerId: this.pullerId }, (response: any) => {
          console.log('Puller registered:', response);
          if (response && response.data) {
            console.log('✅ Registration successful, online status:', response.data.isOnline);
          }
        });
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      // Auto-reconnect for all reasons except manual disconnect
      if (reason === 'io server disconnect') {
        // The server has forcefully disconnected the socket, need to reconnect manually
        this.socket?.connect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      this.reconnectAttempts++;
      console.log(`Reconnection attempt ${this.reconnectAttempts}...`);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
      this.reconnectAttempts = 0;
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('Reconnection error:', error.message);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Failed to reconnect. Will keep trying...');
      // Manually retry connection after a delay
      setTimeout(() => {
        if (this.socket && !this.socket.connected) {
          console.log('Manual reconnection attempt...');
          this.socket.connect();
        }
      }, 5000);
    });

    // Attach existing event listeners from the event map
    this.attachCustomEventListeners();
  }

  private attachCustomEventListeners(): void {
    if (!this.socket) return;
    
    // Attach all custom event listeners (new_ride_request, ride_filled, etc.)
    this.eventListeners.forEach((callbacks, event) => {
      callbacks.forEach((callback) => {
        this.socket?.on(event, callback);
      });
      console.log(`✅ Attached ${callbacks.size} listener(s) for event: ${event}`);
    });
  }

  disconnect(): void {
    if (this.socket) {
      // Clear event listeners map
      this.eventListeners.clear();
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.pullerId = null;
      console.log('🔌 WebSocket disconnected');
    }
  }

  // Helper method to safely add event listeners
  private addListener(event: string, callback: SocketEventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)?.add(callback);
    console.log(`✅ Added event listener for: ${event} (total: ${this.eventListeners.get(event)?.size})`);
    
    // Add to socket if connected
    if (this.socket) {
      try {
        this.socket.on(event, callback);
        console.log(`✅ Attached '${event}' listener to socket`);
      } catch (error) {
        console.error(`Error adding listener for ${event}:`, error);
      }
    } else {
      console.warn(`⚠️ Socket not connected yet, listener for '${event}' will be attached on connection`);
    }
  }

  // Helper method to safely remove event listeners
  private removeListener(event: string, callback: SocketEventCallback): void {
    this.eventListeners.get(event)?.delete(callback);
    
    // Remove from socket if it exists
    if (this.socket) {
      try {
        this.socket.off(event, callback);
      } catch (error) {
        console.error(`Error removing listener for ${event}:`, error);
      }
    }
  }

  // Subscribe to ride updates
  onRideUpdate(callback: SocketEventCallback<Ride>): void {
    this.addListener('ride_update', callback);
  }

  offRideUpdate(callback: SocketEventCallback<Ride>): void {
    this.removeListener('ride_update', callback);
  }

  // NOTE: Ride requests now come via MQTT, not WebSocket
  // See mqtt.service.ts for ride request handling

  // Subscribe to ride filled notifications
  onRideFilled(callback: SocketEventCallback<{ rideId: number }>): void {
    this.addListener('ride_filled', callback);
  }

  offRideFilled(callback: SocketEventCallback<{ rideId: number }>): void {
    this.removeListener('ride_filled', callback);
  }

  // Subscribe to notifications
  onNotification(callback: SocketEventCallback): void {
    this.addListener('notification', callback);
  }

  offNotification(callback: SocketEventCallback): void {
    this.removeListener('notification', callback);
  }

  // Subscribe to error events
  onError(callback: SocketEventCallback): void {
    this.addListener('error', callback);
  }

  offError(callback: SocketEventCallback): void {
    this.removeListener('error', callback);
  }

  // Generic methods for subscribing to any event
  on(event: string, callback: SocketEventCallback): void {
    this.addListener(event, callback);
  }

  off(event: string, callback: SocketEventCallback): void {
    this.removeListener(event, callback);
  }

  // Emit events
  emit(event: string, data?: any): void {
    if (!this.socket?.connected) {
      console.warn('Socket not connected. Cannot emit event:', event);
      return;
    }
    this.socket.emit(event, data);
  }

  // Get connection status
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // Get socket ID
  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  // Puller-specific actions

  async acceptRide(rideId: number, pullerId: number): Promise<Ride> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      this.socket.emit('accept_ride', { rideId, pullerId }, (response: any) => {
        if (response.event === 'error') {
          reject(new Error(response.data.message));
        } else {
          console.log('✅ Ride accepted via WebSocket');
          resolve(response.data);
        }
      });
    });
  }

  async rejectRide(rideId: number, pullerId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      this.socket.emit('reject_ride', { rideId, pullerId }, (response: any) => {
        if (response.event === 'error') {
          reject(new Error(response.data.message));
        } else {
          console.log('✅ Ride rejected via WebSocket');
          resolve();
        }
      });
    });
  }

  async confirmPickup(rideId: number): Promise<Ride> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      this.socket.emit('confirm_pickup', { rideId }, (response: any) => {
        if (response.event === 'error') {
          reject(new Error(response.data.message));
        } else {
          console.log('✅ Pickup confirmed via WebSocket');
          resolve(response.data);
        }
      });
    });
  }

  async completeRide(rideId: number, finalLat: number, finalLon: number): Promise<Ride> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      this.socket.emit('complete_ride', { rideId, finalLat, finalLon }, (response: any) => {
        if (response.event === 'error') {
          reject(new Error(response.data.message));
        } else {
          console.log('✅ Ride completed via WebSocket');
          resolve(response.data);
        }
      });
    });
  }

  async updateLocation(pullerId: number, lat: number, lon: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      this.socket.emit('update_location', { pullerId, lat, lon }, (response: any) => {
        if (response.event === 'error') {
          reject(new Error(response.data.message));
        } else {
          resolve();
        }
      });
    });
  }

  async updateStatus(pullerId: number, isOnline: boolean): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      console.log(`🔄 Emitting update_status: pullerId=${pullerId}, isOnline=${isOnline}`);

      // Set a timeout in case the server doesn't respond
      const timeout = setTimeout(() => {
        console.warn('⚠️ Status update timed out, but message was sent');
        resolve(); // Resolve anyway since the message was sent
      }, 3000); // 3 second timeout

      this.socket.emit('update_status', { pullerId, isOnline }, (response: any) => {
        clearTimeout(timeout);
        console.log('📨 Received response from update_status:', response);
        
        if (!response) {
          // No response, but emit was successful
          console.log('✅ Status update sent (no response from server)');
          resolve();
        } else if (response && response.event === 'error') {
          console.error('❌ Status update error:', response.data.message);
          reject(new Error(response.data.message));
        } else if (response && response.event === 'status_updated') {
          console.log('✅ Status updated successfully');
          resolve();
        } else {
          // Unknown response format, but assume success since broker got the message
          console.log('✅ Status update sent (unexpected response format)');
          resolve();
        }
      });
    });
  }
}

// Export a singleton instance
export const socketService = new SocketService();
