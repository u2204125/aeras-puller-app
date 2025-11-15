# Ride Flow Automation - Puller App

## Overview
This document describes the automated ride flow features implemented in the puller-app, including automatic route transitions, proximity-based confirmations, and hidden testing controls.

## Features Implemented

### 1. Automatic Pickup Confirmation
**Location**: `PickupScreen` component

**Behavior**:
- When the puller accepts a ride request, they see the route from their current location to the pickup location
- The app continuously monitors the puller's GPS location
- When the puller gets within **100 meters** of the pickup location:
  - The "Confirm Pickup" button automatically becomes enabled
  - **Automatic trigger**: The pickup is automatically confirmed without manual button press
  - The ride status changes from `ACCEPTED` to `ACTIVE`
  - The route automatically switches to show pickup → destination

**Visual Feedback**:
- Distance to pickup is displayed in the header
- When far from pickup: Button shows "Get within 100m to confirm" (disabled)
- When near pickup: Button shows "CONFIRM PICKUP" (enabled, but auto-triggers)
- Warning overlay appears when more than 100m away

### 2. Automatic Ride Completion
**Location**: `ActiveRideScreen` component

**Behavior**:
- During an active ride, the route shows pickup → destination
- The app continuously monitors the puller's GPS location
- When the puller gets within **100 meters** of the destination:
  - The "Complete Ride" button automatically becomes enabled
  - **Automatic trigger**: The ride is automatically completed without manual button press
  - The ride status changes to `COMPLETED`
  - Points are automatically awarded to the puller
  - The ride completion modal is shown with rewards

**Visual Feedback**:
- Distance to destination is displayed in the header
- Ride duration timer is continuously updated
- When far from destination: Button shows "Get within 100m to complete" (disabled)
- When near destination: Button shows "COMPLETE RIDE" (enabled, but auto-triggers)
- Status overlay appears when navigating to destination

### 3. Map Display
**Both Screens**:
- **Current Location Marker**: Shows puller's real-time GPS position
- **Target Marker**: Shows pickup location (PickupScreen) or destination (ActiveRideScreen)
- **Route Line**: 
  - Blue line from current location to pickup (PickupScreen)
  - Green line from current location to destination (ActiveRideScreen)
- **Auto-centering**: Map automatically centers on puller's current position
- **Zoom level**: 15 (good balance between detail and area coverage)

## Hidden Testing Controls

### Purpose
For development and testing, it's not practical to physically travel to locations. Hidden testing controls allow developers to simulate reaching locations.

### How to Activate

#### PickupScreen - Test Pickup Confirmation
1. **Tap the header section** (where it says "Go to Pickup") **7 times rapidly**
2. Counter appears showing remaining taps needed
3. After 7 taps:
   - Counter resets
   - Console logs: `🔓 Testing mode activated - Manual pickup confirmation enabled`
   - "Confirm Pickup" button becomes enabled regardless of distance
   - You can now manually confirm pickup from anywhere

#### ActiveRideScreen - Test Ride Completion
1. **Tap the timer section** (the black box showing ride duration) **7 times rapidly**
2. Counter appears showing remaining taps needed
3. After 7 taps:
   - Counter resets
   - Console logs: `🔓 Testing mode activated - Manual completion enabled`
   - "Complete Ride" button becomes enabled regardless of distance
   - You can now manually complete the ride from anywhere

### Reset Mechanism
- If you stop tapping, the counter resets after **3 seconds**
- This prevents accidental activation
- You must complete all 7 taps within the 3-second window

## Technical Implementation

### Distance Calculation
- Uses **Haversine formula** for accurate distance calculation
- Considers Earth's curvature
- Returns distance in meters
- Function: `calculateDistance()` in `/utils/geolocation.ts`

### Proximity Detection
- Default threshold: **100 meters**
- Function: `isWithinProximity()` in `/utils/geolocation.ts`
- Used for both pickup and destination detection

### Auto-confirmation Prevention
- Uses `autoConfirmed` state flag to prevent multiple triggers
- Each screen maintains its own flag
- Ensures automatic confirmation happens only once per location

### GPS Tracking
- Continuous location monitoring via `watchPosition()`
- High accuracy mode enabled
- Location updates published to MQTT for real-time tracking
- Updates every few seconds depending on device

## User Flow

### Complete Ride Journey

1. **Waiting for Rides** (HomeScreen)
   - Puller is online and waiting
   - GPS location is being tracked

2. **Ride Request Received** (RideRequestModal)
   - Notification with sound/vibration
   - Shows pickup and destination blocks
   - Option to accept or reject

3. **Navigate to Pickup** (PickupScreen)
   - Shows route from current location → pickup
   - Distance displayed and updated in real-time
   - Map shows both markers and route line
   - **Automatic**: When within 100m, pickup is confirmed automatically
   - **Manual Fallback**: Button can be pressed if auto-confirm doesn't trigger
   - **Testing**: 7 taps on header to enable manual confirmation

4. **Active Ride** (ActiveRideScreen)
   - Shows route from pickup → destination
   - Timer shows ride duration
   - Distance to destination updated in real-time
   - **Automatic**: When within 100m, ride is completed automatically
   - **Manual Fallback**: Button can be pressed if auto-complete doesn't trigger
   - **Testing**: 7 taps on timer to enable manual completion

5. **Ride Complete** (RideCompleteModal)
   - Shows points awarded
   - Shows updated total points balance
   - Returns to HomeScreen ready for next ride

## API Integration

### Endpoints Used

1. **Accept Ride**
   - `POST /api/v1/rides/:id/accept`
   - Body: `{ pullerId: string }`
   - Returns: Updated ride with status `ACCEPTED`

2. **Confirm Pickup**
   - `POST /api/v1/rides/:id/pickup`
   - No body required
   - Returns: Updated ride with status `ACTIVE`
   - Sets `pickupTime` timestamp

3. **Complete Ride**
   - `POST /api/v1/rides/:id/complete`
   - Body: `{ finalLat: number, finalLon: number }`
   - Returns: Updated ride with status `COMPLETED`
   - Includes `pointsAwarded` and `completionTime`

### MQTT Topics

- **Location Updates**: `puller/{pullerId}/location`
  - Continuously published during ride
  - Format: `{ lat: number, lon: number }`

- **Ride Updates**: `rides/{rideId}/update`
  - Received when ride status changes
  - Updates local ride state

## Console Logs

For debugging, the following logs are output:

- `📍 Reached pickup location - Auto-confirming pickup` - Automatic pickup triggered
- `🔓 Testing mode activated - Manual pickup confirmation enabled` - Testing mode for pickup
- `🎯 Reached destination - Auto-completing ride` - Automatic completion triggered
- `🔓 Testing mode activated - Manual completion enabled` - Testing mode for completion

## Future Enhancements

Potential improvements:

1. **Configurable Proximity Threshold**
   - Allow admin to set different thresholds
   - Different thresholds for pickup vs destination
   - Location-specific thresholds

2. **Voice Navigation**
   - Audio directions to pickup/destination
   - Distance announcements

3. **Estimated Time of Arrival (ETA)**
   - Calculate ETA based on distance and average speed
   - Show to both puller and rider

4. **Route Optimization**
   - Suggest optimal routes
   - Avoid traffic/obstacles
   - Multiple waypoints

5. **Offline Mode**
   - Cache map tiles for offline use
   - Queue actions when offline
   - Sync when back online

6. **Advanced Testing Controls**
   - Simulate GPS movement
   - Test different scenarios
   - Mock location data

## Troubleshooting

### Automatic confirmation not working?

1. **Check GPS permissions**: Ensure location access is granted
2. **Check accuracy**: Device must have good GPS signal
3. **Check distance**: Must be within 100 meters
4. **Check console**: Look for distance logs
5. **Use testing mode**: 7 taps to manually enable

### Button stays disabled?

1. **Use testing mode**: 7 rapid taps on header/timer
2. **Check GPS**: Ensure location is being tracked
3. **Check distance calculation**: View distance in header

### Map not updating?

1. **Refresh the page**: Reload the application
2. **Check GPS**: Ensure location permission is granted
3. **Check network**: Map tiles require internet connection

## Code Locations

- **PickupScreen**: `/puller-app/src/components/RideScreens.tsx` (lines ~40-160)
- **ActiveRideScreen**: `/puller-app/src/components/RideScreens.tsx` (lines ~170-330)
- **Geolocation Utils**: `/puller-app/src/utils/geolocation.ts`
- **API Service**: `/puller-app/src/services/api.service.ts`
- **App Orchestration**: `/puller-app/src/App.tsx`

## Testing Checklist

- [ ] Accept ride request
- [ ] See route to pickup on map
- [ ] Distance updates as you move
- [ ] Test 7-tap activation on pickup header
- [ ] Manual confirm pickup works in testing mode
- [ ] Route switches to destination after pickup
- [ ] Timer starts counting
- [ ] Distance to destination updates
- [ ] Test 7-tap activation on timer
- [ ] Manual complete works in testing mode
- [ ] Ride completion modal appears
- [ ] Points are awarded correctly
- [ ] Return to home screen

## Security Notes

- Testing controls are hidden (not in UI by default)
- Requires 7 consecutive taps (unlikely to trigger accidentally)
- Auto-resets after 3 seconds of inactivity
- Console logs help identify when testing mode is active
- Production builds can disable testing controls via environment variable if needed
