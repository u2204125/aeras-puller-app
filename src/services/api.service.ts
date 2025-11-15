import axios, { AxiosInstance } from 'axios';
import { Puller, Ride } from '../types';

/**
 * API Service
 * Handles all HTTP requests to the backend
 * Base URL is configured via environment variable
 */

/**
 * Transform backend ride response to frontend Ride type
 * Backend uses startBlock, frontend uses pickupBlock
 */
function transformRide(backendRide: any): Ride {
  return {
    ...backendRide,
    pickupBlock: backendRide.startBlock || backendRide.pickupBlock,
    pickupLat: backendRide.startBlock?.latitude || backendRide.pickupLat,
    pickupLon: backendRide.startBlock?.longitude || backendRide.pickupLon,
    destinationLat: backendRide.destinationBlock?.latitude || backendRide.destinationLat,
    destinationLon: backendRide.destinationBlock?.longitude || backendRide.destinationLon,
  };
}

class ApiService {
  private api: AxiosInstance;

  constructor() {
    const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
    
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

      return response.data.puller;
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
   */
  async updateOnlineStatus(pullerId: number, isOnline: boolean): Promise<Puller> {
    const endpoint = isOnline ? 'online' : 'offline';
    const response = await this.api.post<Puller>(`/pullers/${pullerId}/${endpoint}`);
    return response.data;
  }

  /**
   * Update puller's GPS location
   */
  async updateLocation(pullerId: number, lat: number, lon: number): Promise<void> {
    await this.api.post(`/pullers/${pullerId}/location`, {
      lat,
      lon,
    });
  }

  /**
   * Accept a ride request
   */
  async acceptRide(rideId: number, pullerId: number): Promise<Ride> {
    const response = await this.api.post<any>(`/rides/${rideId}/accept`, {
      pullerId: pullerId.toString(),
    });
    return transformRide(response.data);
  }

  /**
   * Reject a ride request
   */
  async rejectRide(rideId: number, pullerId: number): Promise<void> {
    await this.api.post(`/rides/${rideId}/reject`, {
      pullerId: pullerId.toString(),
    });
  }

  /**
   * Confirm pickup (puller has arrived at pickup location)
   */
  async confirmPickup(rideId: number): Promise<Ride> {
    const response = await this.api.post<any>(`/rides/${rideId}/pickup`);
    return transformRide(response.data);
  }

  /**
   * Complete a ride
   */
  async completeRide(rideId: number, finalLat: number, finalLon: number): Promise<Ride> {
    const response = await this.api.post<any>(`/rides/${rideId}/complete`, {
      finalLat,
      finalLon,
    });
    return transformRide(response.data);
  }

  /**
   * Get ride history for a puller
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
