/**
 * Location Service
 * Provides mock location data for testing and development.
 */
class LocationService {
  /**
   * Returns a mock location.
   * In a real app, this would get the current device location.
   */
  getMockLocation(): { lat: number; lon: number } {
    // Mock location somewhere in Dhaka
    return {
      lat: 23.8103,
      lon: 90.4125,
    };
  }
}

export const locationService = new LocationService();
