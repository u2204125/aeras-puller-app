import mqtt, { MqttClient } from 'mqtt';
import { RideRequest, Ride } from '../types';

/**
 * MqttService
 * Manages MQTT connection for puller app to receive ride requests and updates
 * 
 * Topics subscribed:
 * - aeras/pullers/{pullerId}/ride-request: New ride requests
 * - aeras/pullers/{pullerId}/ride-rejected: Ride rejection confirmations
 * - aeras/rides/+/filled: Ride filled notifications
 * - aeras/rides/+/status: Ride status updates
 */

class MqttService {
  private client: MqttClient | null = null;
  private pullerId: string | null = null;
  private reconnectAttempts = 0;

  // Event handlers
  private onConnectCallback?: () => void;
  private onDisconnectCallback?: () => void;
  private onRideRequestCallback?: (request: RideRequest) => void;
  private onRideFilledCallback?: (rideId: number) => void;
  private onRideUpdateCallback?: (ride: Ride) => void;
  private onNotificationCallback?: (notification: any) => void;

  /**
   * Connect to MQTT broker and subscribe to puller-specific topics
   */
  connect(pullerId: string, onConnect?: () => void, onDisconnect?: () => void): void {
    this.pullerId = pullerId;
    this.onConnectCallback = onConnect;
    this.onDisconnectCallback = onDisconnect;

    // Use WebSocket protocol for browser MQTT connection
    const brokerUrl = import.meta.env.VITE_MQTT_BROKER_URL || 'ws://broker.hivemq.com:8000/mqtt';

    console.log('📡 MQTT Configuration:');
    console.log('   Broker URL:', brokerUrl);
    console.log('   Puller ID:', pullerId);

    // Connect to MQTT broker via WebSocket
    this.client = mqtt.connect(brokerUrl, {
      clientId: `puller_${pullerId}_${Math.random().toString(16).substr(2, 8)}`,
      clean: true,
      reconnectPeriod: 2000,
      connectTimeout: 30000,
    });

    this.setupEventListeners();
  }

  /**
   * Setup MQTT event listeners
   */
  private setupEventListeners(): void {
    if (!this.client) return;

    // Connection established
    this.client.on('connect', () => {
      console.log('✅ MQTT connected successfully');
      console.log('   Client ID:', this.client?.options.clientId);
      this.reconnectAttempts = 0;

      // Subscribe to puller-specific topics
      if (this.pullerId) {
        const topics = [
          `aeras/pullers/${this.pullerId}/ride-request`,
          `aeras/pullers/${this.pullerId}/ride-rejected`,
          `aeras/rides/+/filled`,
          `aeras/rides/+/status`,
        ];

        console.log('🔄 Attempting to subscribe to topics:', topics);

        this.client?.subscribe(topics, { qos: 1 }, (err, granted) => {
          if (err) {
            console.error('❌ Failed to subscribe to topics:', err);
          } else {
            console.log('✅ Subscribed to topics successfully!');
            console.log('   Granted subscriptions:', granted);
          }
        });
      }

      this.onConnectCallback?.();
    });

    // Connection lost
    this.client.on('disconnect', () => {
      console.log('❌ MQTT disconnected');
      this.onDisconnectCallback?.();
    });

    // Offline
    this.client.on('offline', () => {
      console.log('📴 MQTT client is offline');
      this.onDisconnectCallback?.();
    });

    // Reconnecting
    this.client.on('reconnect', () => {
      this.reconnectAttempts++;
      console.log(`🔄 Reconnecting to MQTT... Attempt ${this.reconnectAttempts}`);
    });

    // Error
    this.client.on('error', (error) => {
      console.error('❌ MQTT error:', error);
    });

    // Message received
    this.client.on('message', (topic, payload) => {
      try {
        const message = JSON.parse(payload.toString());
        console.log('📨 MQTT message received:', { topic, message });

        this.handleMessage(topic, message);
      } catch (error) {
        console.error('❌ Error parsing MQTT message:', error);
      }
    });
  }

  /**
   * Handle incoming MQTT messages based on topic
   */
  private handleMessage(topic: string, message: any): void {
    console.log('🔍 Handling message for topic:', topic);
    console.log('🔍 Message content:', message);
    console.log('🔍 Current puller ID:', this.pullerId);
    
    // New ride request for this puller
    if (topic === `aeras/pullers/${this.pullerId}/ride-request`) {
      console.log('🔔 New ride request received:', {
        rideId: message.rideId,
        pickup: message.pickupBlock?.name,
        destination: message.destinationBlock?.name,
        points: message.estimatedPoints,
      });
      
      // Transform to match RideRequest interface
      const rideRequest: RideRequest = {
        id: message.rideId,
        pickupBlock: message.pickupBlock,
        destinationBlock: message.destinationBlock,
        pickupLat: message.pickupBlock?.centerLat,
        pickupLon: message.pickupBlock?.centerLon,
        estimatedPoints: message.estimatedPoints,
        expiresAt: message.expiresAt, // Keep as string
      };
      
      this.onRideRequestCallback?.(rideRequest);
    }

    // Ride rejection confirmation
    else if (topic === `aeras/pullers/${this.pullerId}/ride-rejected`) {
      console.log('✅ Ride rejection confirmed:', message.rideId);
      this.onNotificationCallback?.({
        type: 'ride_rejected',
        message: message.message,
        rideId: message.rideId,
      });
    }

    // Ride filled by another puller
    else if (topic.startsWith('aeras/rides/') && topic.endsWith('/filled')) {
      console.log('🚫 Ride filled by another puller:', message.rideId);
      this.onRideFilledCallback?.(message.rideId);
    }

    // Ride status update
    else if (topic.startsWith('aeras/rides/') && topic.endsWith('/status')) {
      console.log('📝 Ride status update:', {
        rideId: message.rideId,
        status: message.status,
      });
      this.onRideUpdateCallback?.(message);
    }
    
    else {
      console.log('⚠️ Unhandled topic:', topic);
    }
  }

  /**
   * Publish puller location update to MQTT
   */
  publishLocation(latitude: number, longitude: number, additionalData?: any): void {
    if (!this.client || !this.pullerId) {
      console.warn('Cannot publish location: MQTT not connected');
      return;
    }

    const topic = `aeras/pullers/${this.pullerId}/location`;
    const payload = {
      pullerId: this.pullerId,
      latitude,
      longitude,
      timestamp: new Date().toISOString(),
      ...additionalData,
    };

    this.client.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
      if (err) {
        console.error('❌ Failed to publish location:', err);
      } else {
        console.log('📍 Published location update to MQTT');
      }
    });
  }

  /**
   * Publish puller status update to MQTT
   */
  publishStatus(isOnline: boolean, isActive: boolean): void {
    if (!this.client || !this.pullerId) {
      console.warn('Cannot publish status: MQTT not connected');
      return;
    }

    const topic = `aeras/pullers/${this.pullerId}/status`;
    const payload = {
      pullerId: this.pullerId,
      isOnline,
      isActive,
      timestamp: new Date().toISOString(),
    };

    this.client.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
      if (err) {
        console.error('❌ Failed to publish status:', err);
      } else {
        console.log('🔄 Published status update to MQTT');
      }
    });
  }

  /**
   * Register callback for new ride requests
   */
  onRideRequest(callback: (request: RideRequest) => void): void {
    this.onRideRequestCallback = callback;
  }

  /**
   * Register callback for ride filled events
   */
  onRideFilled(callback: (rideId: number) => void): void {
    this.onRideFilledCallback = callback;
  }

  /**
   * Register callback for ride updates
   */
  onRideUpdate(callback: (ride: Ride) => void): void {
    this.onRideUpdateCallback = callback;
  }

  /**
   * Register callback for general notifications
   */
  onNotification(callback: (notification: any) => void): void {
    this.onNotificationCallback = callback;
  }

  /**
   * Disconnect from MQTT broker
   */
  disconnect(): void {
    if (this.client) {
      console.log('Disconnecting from MQTT...');
      this.client.end(true);
      this.client = null;
      this.pullerId = null;
    }
  }

  /**
   * Check if MQTT client is connected
   */
  isConnected(): boolean {
    return this.client?.connected ?? false;
  }
}

// Export singleton instance
export const mqttService = new MqttService();
