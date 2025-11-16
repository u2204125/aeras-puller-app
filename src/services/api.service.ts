import axios, { AxiosInstance } from 'axios';
import { Puller, Ride } from '../types';
import { socketService } from './socket.service';
import { getSecureUrl } from '../utils/protocol';

/**
 * API Service
 * Handles HTTP requests for login and data fetching
 * Uses WebSocket (via socketService) for all actions after login
 * Base URL is configured via environment variable
 */

/**
 * Transform backend ride response to frontend Ride type
 * Backend uses startBlock, frontend uses pickupBlock
 */
function transformRide(backendRide: any): Ride {
  // Normalize pickup/destination blocks returned by backend
  const rawPickup = backendRide.startBlock || backendRide.pickupBlock || {};
  const rawDestination = backendRide.destinationBlock || backendRide.dropOffBlock || backendRide.destinationBlock || {};

  const pickupBlock = {
    blockId: rawPickup.blockId || rawPickup.id || '',
    // backend sometimes uses `destinationName` or `name` or `destination_name`
    name: rawPickup.destinationName || rawPickup.name || rawPickup.destination_name || rawPickup.label || 'Unknown',
    centerLat: rawPickup.centerLat ?? rawPickup.latitude ?? rawPickup.lat ?? 0,
    centerLon: rawPickup.centerLon ?? rawPickup.longitude ?? rawPickup.lon ?? 0,
    ...rawPickup,
  };

  const destinationBlock = {
    blockId: rawDestination.blockId || rawDestination.id || '',
    name: rawDestination.destinationName || rawDestination.name || rawDestination.destination_name || rawDestination.label || 'Unknown',
    centerLat: rawDestination.centerLat ?? rawDestination.latitude ?? rawDestination.lat ?? 0,
    centerLon: rawDestination.centerLon ?? rawDestination.longitude ?? rawDestination.lon ?? 0,
    ...rawDestination,
  };

  return {
    ...backendRide,
    pickupBlock,
    pickupLat: rawPickup.latitude ?? rawPickup.lat ?? backendRide.pickupLat,
    pickupLon: rawPickup.longitude ?? rawPickup.lon ?? backendRide.pickupLon,
    destinationBlock,
    destinationLat: rawDestination.latitude ?? rawDestination.lat ?? backendRide.destinationLat,
    destinationLon: rawDestination.longitude ?? rawDestination.lon ?? backendRide.destinationLon,
  } as Ride;
}

class ApiService {
  private api: AxiosInstance;

  constructor() {
    const baseURL = getSecureUrl(import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1');
    
    console.log('🔧 API Service Configuration:');
    console.log('   Base URL:', baseURL);
    console.log('   Environment:', import.meta.env.MODE);
    
    this.api = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Restore token from localStorage if available
    const token = localStorage.getItem('puller_token');
    if (token) {
      this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    // Add request interceptor for logging and auth
    this.api.interceptors.request.use(
      (config) => {
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => {
        console.log(`API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        const url = error.config?.url;
        const method = error.config?.method?.toUpperCase();
        const status = error.response?.status;
        
        console.error('❌ API Error:', {
          url,
          method,
          status,
          message: error.response?.data?.message || error.message,
          fullURL: error.config?.baseURL + error.config?.url,
        });
        
        // Handle 401 errors (unauthorized) - could clear token and redirect to login
        if (error.response?.status === 401) {
          localStorage.removeItem('puller_token');
          delete this.api.defaults.headers.common['Authorization'];
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Puller Authentication using phone number
   * After successful login, connects to WebSocket for real-time communication
   */
  async loginPuller(phone: string): Promise<Puller> {
    try {
      const response = await this.api.post<{ access_token: string; puller: Puller }>('/auth/puller/login', {
        phone,
      });

      // Store the access token for future requests
      if (response.data.access_token) {
        this.api.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`;
        // Optionally store in localStorage
        localStorage.setItem('puller_token', response.data.access_token);
      }

      const puller = response.data.puller;

      // Connect to WebSocket after successful login
      try {
        await socketService.connect(puller.id);
        console.log('✅ Connected to WebSocket - All actions will use real-time communication');
      } catch (wsError) {
        console.warn('⚠️  WebSocket connection failed, will fallback to HTTP:', wsError);
      }

      return puller;
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.response?.status === 404) {
        throw new Error('Phone number not found. Please contact admin.');
      } else if (error.response?.status === 401) {
        throw new Error('Your account has been deactivated. Please contact admin.');
      }
      throw new Error('Login failed. Please try again.');
    }
  }

  /**
   * Get puller details by ID
   */
  async getPuller(pullerId: number): Promise<Puller> {
    const response = await this.api.get<Puller>(`/pullers/${pullerId}`);
    return response.data;
  }

  /**
   * Update puller's online status
   * Uses WebSocket for real-time updates
   */
  async updateOnlineStatus(pullerId: number, isOnline: boolean): Promise<Puller> {
    // Use WebSocket if connected, otherwise fallback to HTTP
    if (socketService.isConnected()) {
      await socketService.updateStatus(pullerId, isOnline);
      // Fetch updated puller data
      return this.getPuller(pullerId);
    } else {
      const endpoint = isOnline ? 'online' : 'offline';
      const response = await this.api.post<Puller>(`/pullers/${pullerId}/${endpoint}`);
      return response.data;
    }
  }

  /**
   * Update puller's GPS location
   * Uses WebSocket for real-time updates
   */
  async updateLocation(pullerId: number, lat: number, lon: number): Promise<void> {
    // Use WebSocket if connected, otherwise fallback to HTTP
    if (socketService.isConnected()) {
      await socketService.updateLocation(pullerId, lat, lon);
    } else {
      await this.api.post(`/pullers/${pullerId}/location`, {
        lat,
        lon,
      });
    }
  }

  /**
   * Update puller's points balance
   */
  async updatePullerPoints(pullerId: number, newBalance: number): Promise<Puller> {
    const response = await this.api.patch<Puller>(`/pullers/${pullerId}/points`, {
      pointsBalance: newBalance,
    });
    return response.data;
  }

  /**
   * Accepts a ride request on behalf of a puller.
   */
  async acceptRide(startBlockId: string, destinationBlockId: string, pullerId: number): Promise<Ride> {
    try {
      const response = await this.api.post(`/rides/accept`, {
        startBlockId,
        destinationBlockId,
        pullerId,
      });

      // Backend may return the ride directly or wrapped in { ride }
      const backendRide = response.data?.ride ?? response.data;
      return transformRide(backendRide);
    } catch (error) {
      console.error(`Failed to accept ride via API:`, error);
      throw error;
    }
  }

  /**
   * Mark a ride as picked up (move to ACTIVE)
   */
  async pickupRide(rideId: string | number): Promise<Ride> {
    try {
      const response = await this.api.post(`/rides/${rideId}/pickup`);
      const backendRide = response.data?.ride ?? response.data;
      return transformRide(backendRide);
    } catch (error) {
      console.error('Failed to pickup ride via API:', error);
      throw error;
    }
  }

  /**
   * Rejects a ride as a puller.
   */
  async rejectRide(rideId: string | number, pullerId: number): Promise<void> {
    try {
      // Use WebSocket if connected, otherwise fallback to HTTP
      if (socketService.isConnected()) {
        await socketService.rejectRide(Number(rideId), pullerId);
        return;
      }

      await this.api.post(`/rides/${rideId}/reject`, { pullerId: pullerId.toString() });
    } catch (error) {
      console.error('Failed to reject ride via API:', error);
      throw error;
    }
  }

  /**
   * Completes a ride and awards points to the puller.
   */
  async completeRide(rideId: string, finalLat: number, finalLon: number, pointsOverride?: number): Promise<Ride> {
    try {
      // Backend controller expects POST /rides/:id/complete
      const payload: any = { finalLat, finalLon };
      if (typeof pointsOverride === 'number') {
        payload.pointsOverride = pointsOverride;
      }

      const response = await this.api.post(`/rides/${rideId}/complete`, payload);

      const backendRide = response.data?.ride ?? response.data;
      return transformRide(backendRide);
    } catch (error) {
      console.error('Failed to complete ride via API:', error);
      throw error;
    }
  }

  /**
   * Fetches the puller's ride history
   */
  async getRideHistory(pullerId: number, page = 1, limit = 20): Promise<{ data: Ride[]; total: number }> {
    const response = await this.api.get<{ data: any[]; total: number }>(`/pullers/${pullerId}/rides`, {
      params: {
        page,
        limit,
      },
    });
    return {
      data: response.data.data.map(transformRide),
      total: response.data.total,
    };
  }

  /**
   * Get current active ride for a puller
   */
  async getCurrentRide(pullerId: number): Promise<Ride | null> {
    try {
      // Try to get ACCEPTED rides first
      let response = await this.api.get<{ rides: any[]; total: number }>('/rides', {
        params: {
          status: 'ACCEPTED',
          page: 1,
          limit: 100,
        },
      });

      // Filter for this puller's rides
      let pullerRides = response.data.rides?.filter(
        (ride: any) => ride.puller?.id === pullerId
      );

      if (pullerRides && pullerRides.length > 0) {
        return transformRide(pullerRides[0]);
      }

      // If no ACCEPTED rides, check for ACTIVE rides
      response = await this.api.get<{ rides: any[]; total: number }>('/rides', {
        params: {
          status: 'ACTIVE',
          page: 1,
          limit: 100,
        },
      });

      pullerRides = response.data.rides?.filter(
        (ride: any) => ride.puller?.id === pullerId
      );

      if (pullerRides && pullerRides.length > 0) {
        return transformRide(pullerRides[0]);
      }

      return null;
    } catch (error) {
      console.error('Error fetching current ride:', error);
      return null;
    }
  }

  /**
   * Get available SEARCHING rides (pending requests looking for pullers)
   */
  async getSearchingRides(): Promise<Ride[]> {
    try {
      const response = await this.api.get<{ rides: any[]; total: number }>('/rides', {
        params: {
          status: 'SEARCHING',
          page: 1,
          limit: 50,
        },
      });

      return (response.data.rides || []).map(transformRide);
    } catch (error) {
      console.error('Error fetching searching rides:', error);
      return [];
    }
  }

  /**
   * Logout puller - clear stored token
   */
  logout(): void {
    localStorage.removeItem('puller_token');
    delete this.api.defaults.headers.common['Authorization'];
  }

  /**
   * Check if user has a valid token
   */
  hasToken(): boolean {
    return !!localStorage.getItem('puller_token');
  }
}

// Export a singleton instance
export const apiService = new ApiService();
