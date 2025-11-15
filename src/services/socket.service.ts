import { io, Socket } from 'socket.io-client';
import { Ride } from '../types';

/**
 * WebSocket Service
 * Handles real-time bidirectional communication with backend
 * Replaces HTTP API calls for all puller actions after login
 */

class SocketService {
  private socket: Socket | null = null;
  
  // Callbacks for events
  private onRideUpdateCallback: ((ride: Ride) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;

  /**
   * Connect to WebSocket server
   */
  connect(pullerId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:3000';
      
      console.log('🔌 Connecting to WebSocket:', wsUrl);
      
      this.socket = io(wsUrl, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      this.socket.on('connect', () => {
        console.log('✅ WebSocket connected');
        
        // Register puller with backend
        this.socket?.emit('register_puller', { pullerId }, (response: any) => {
          console.log('Puller registered:', response);
          resolve();
        });
      });

      this.socket.on('disconnect', () => {
        console.log('❌ WebSocket disconnected');
      });

      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        reject(error);
      });

      // Listen for ride updates
      this.socket.on('ride_update', (ride: Ride) => {
        console.log('📩 Ride update received:', ride);
        this.onRideUpdateCallback?.(ride);
      });

      // Listen for error events
      this.socket.on('error', (data: any) => {
        console.error('❌ WebSocket error:', data);
        this.onErrorCallback?.(data.message || 'Unknown error');
      });
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('🔌 WebSocket disconnected');
    }
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Accept a ride via WebSocket
   */
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

  /**
   * Reject a ride via WebSocket
   */
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

  /**
   * Confirm pickup via WebSocket
   */
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

  /**
   * Complete ride via WebSocket
   */
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

  /**
   * Update location via WebSocket
   */
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

  /**
   * Update online status via WebSocket
   */
  async updateStatus(pullerId: number, isOnline: boolean): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      this.socket.emit('update_status', { pullerId, isOnline }, (response: any) => {
        if (response.event === 'error') {
          reject(new Error(response.data.message));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Set callback for ride updates
   */
  onRideUpdate(callback: (ride: Ride) => void): void {
    this.onRideUpdateCallback = callback;
  }

  /**
   * Set callback for errors
   */
  onError(callback: (error: string) => void): void {
    this.onErrorCallback = callback;
  }
}

// Export singleton instance
export const socketService = new SocketService();
