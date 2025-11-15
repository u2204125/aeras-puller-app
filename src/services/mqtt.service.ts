import mqtt, { MqttClient } from 'mqtt';

/**
 * MQTT Service for Puller App
 * Subscribes to ride requests from the backend via MQTT broker
 */

export type MqttRideRequestCallback = (request: any) => void;

class MqttService {
  private client: MqttClient | null = null;
  private onRideRequestCallback: MqttRideRequestCallback | null = null;
  private isConnected = false;

  /**
   * Connect to MQTT broker and subscribe to ride requests
   */
  connect(pullerId: number): void {

    if (this.client && this.isConnected) {
      console.log('MQTT already connected');
      return;
    }

    // Browser environment requires WebSocket protocol (ws:// or wss://)
    // HiveMQ public broker WebSocket port: 8000 (ws), 8884 (wss)
    let brokerUrl = import.meta.env.VITE_MQTT_BROKER || 'ws://broker.hivemq.com:8000/mqtt';
    
    // Auto-switch to wss:// if running on HTTPS
    if (window.location.protocol === 'https:' && brokerUrl.startsWith('ws://')) {
      brokerUrl = brokerUrl.replace('ws://', 'wss://').replace(':8000', ':8884');
      console.log('🔒 Running on HTTPS, switching to secure WebSocket');
    }
    
    console.log('🔌 Connecting to MQTT broker:', brokerUrl);

    try {
      this.client = mqtt.connect(brokerUrl, {
        clientId: `puller_${pullerId}_${Date.now()}`,
        clean: true,
        reconnectPeriod: 1000,
        connectTimeout: 30000,
      });

      this.client.on('connect', () => {
        console.log('✅ MQTT connected');
        this.isConnected = true;

        // Subscribe to ride requests for this specific puller
        const topic = `aeras/ride-request`;
        this.client?.subscribe(topic, (err) => {
          if (err) {
            console.error('❌ Failed to subscribe to ride requests:', err);
          } else {
            console.log(`✅ Subscribed to: ${topic}`);
          }
        });
      });

      this.client.on('message', (topic, message) => {
        console.log(`📨 MQTT message received on topic: ${topic}`);
        
        try {
          const data = JSON.parse(message.toString());
          console.log('📦 MQTT payload:', data);

          // Check if this is a ride request
          if (topic.includes('ride-request')) {
            console.log('🔔 Ride request received via MQTT:', data);
            console.log('🔔 Callback registered?', this.onRideRequestCallback !== null);
            
            if (this.onRideRequestCallback) {
              console.log('✅ Calling ride request callback...');
              this.onRideRequestCallback(data);
              console.log('✅ Callback called successfully');
            } else {
              console.error('❌ No callback registered for ride requests!');
            }
          }
        } catch (error) {
          console.error('❌ Error parsing MQTT message:', error);
        }
      });

      this.client.on('error', (error) => {
        console.error('❌ MQTT error:', error);
        this.isConnected = false;
      });

      this.client.on('close', () => {
        console.log('❌ MQTT connection closed');
        this.isConnected = false;
      });

      this.client.on('reconnect', () => {
        console.log('🔄 MQTT reconnecting...');
      });

      this.client.on('offline', () => {
        console.log('⚠️ MQTT offline');
        this.isConnected = false;
      });

    } catch (error) {
      console.error('❌ MQTT connection error:', error);
      this.isConnected = false;
    }
  }

  /**
   * Disconnect from MQTT broker
   */
  disconnect(): void {
    if (this.client) {
      console.log('🔌 Disconnecting from MQTT broker...');
      this.client.end();
      this.client = null;
      this.isConnected = false;
    }
  }

  /**
   * Set callback for ride request events
   */
  onRideRequest(callback: MqttRideRequestCallback): void {
    console.log('📝 Registering MQTT ride request callback');
    this.onRideRequestCallback = callback;
    console.log('✅ MQTT ride request callback registered');
  }

  /**
   * Check if MQTT is connected
   */
  isClientConnected(): boolean {
    return this.isConnected && this.client?.connected === true;
  }
}

// Export singleton instance
export const mqttService = new MqttService();
