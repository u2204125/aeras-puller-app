/**
 * Notification Manager
 * Handles browser notifications, audio alerts, and vibrations
 */

import { soundAlert } from './soundAlert';

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
  data?: any;
}

class NotificationManager {
  private permission: NotificationPermission = 'default';

  constructor() {
    this.checkPermission();
  }

  /**
   * Check current notification permission status
   */
  private checkPermission(): void {
    if ('Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  /**
   * Request notification permission from user
   */
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      console.log('Notification permission:', permission);
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  /**
   * Show a browser notification
   */
  async showNotification(options: NotificationOptions): Promise<Notification | null> {
    console.log('📢 [showNotification] Current permission:', this.permission);
    
    // Request permission if not granted
    if (this.permission !== 'granted') {
      console.log('⚠️ [showNotification] Permission not granted, requesting...');
      const granted = await this.requestPermission();
      if (!granted) {
        console.warn('❌ [showNotification] Permission denied by user');
        return null;
      }
    }

    try {
      const notificationOptions: any = {
        body: options.body,
        icon: options.icon || '/logo.png',
        badge: options.badge || '/logo.png',
        tag: options.tag || 'default',
        requireInteraction: options.requireInteraction ?? true,
        silent: options.silent ?? false,
        vibrate: options.vibrate || [200, 100, 200],
        data: options.data,
      };

      console.log('📢 [showNotification] Creating notification with options:', {
        title: options.title,
        ...notificationOptions
      });

      const notification = new Notification(options.title, notificationOptions);

      // Auto-close after 30 seconds if not requiring interaction
      if (!options.requireInteraction) {
        setTimeout(() => notification.close(), 30000);
      }

      console.log('✅ [showNotification] Notification created successfully');
      return notification;
    } catch (error) {
      console.error('❌ [showNotification] Error showing notification:', error);
      return null;
    }
  }

  /**
   * Show ride request notification with sound and vibration
   */
  async showRideRequestNotification(rideDetails: {
    rideId: number;
    from: string;
    to: string;
    points: number;
  }): Promise<void> {
    console.log('🔔 [NOTIFICATION MANAGER] Showing ride request notification:', rideDetails);

    // Play loud alert sound
    console.log('🔊 [NOTIFICATION MANAGER] Playing alert sound');
    soundAlert.playAlert();

    // Vibrate device
    console.log('📳 [NOTIFICATION MANAGER] Triggering vibration');
    this.vibratePattern([300, 100, 300, 100, 300, 100, 300]);

    // Show browser notification
    console.log('📢 [NOTIFICATION MANAGER] Attempting to show browser notification');
    const notification = await this.showNotification({
      title: '🚗 NEW RIDE REQUEST!',
      body: `From ${rideDetails.from} to ${rideDetails.to}\nEarn ${rideDetails.points} points`,
      tag: `ride-${rideDetails.rideId}`,
      requireInteraction: true,
      data: { rideId: rideDetails.rideId, type: 'ride-request' },
      vibrate: [300, 100, 300, 100, 300],
    });

    if (notification) {
      console.log('✅ [NOTIFICATION MANAGER] Browser notification shown successfully');
      // Handle notification click
      notification.onclick = () => {
        console.log('Notification clicked for ride:', rideDetails.rideId);
        window.focus();
        notification.close();
      };
    } else {
      console.warn('❌ [NOTIFICATION MANAGER] Failed to show browser notification');
    }
  }

  /**
   * Show ride accepted notification
   */
  async showRideAcceptedNotification(rideId: number): Promise<void> {
    console.log('✅ [NOTIFICATION MANAGER] Showing ride accepted notification for ride:', rideId);
    
    soundAlert.playSuccess();
    this.vibratePattern([100, 50, 100]);

    await this.showNotification({
      title: '✅ Ride Accepted',
      body: 'Navigate to pickup location',
      tag: `ride-accepted-${rideId}`,
      requireInteraction: false,
      data: { rideId, type: 'ride-accepted' },
    });
  }

  /**
   * Show ride completed notification
   */
  async showRideCompletedNotification(pointsEarned: number): Promise<void> {
    console.log('🎉 [NOTIFICATION MANAGER] Showing ride completed notification, points:', pointsEarned);
    
    soundAlert.playSuccess();
    this.vibratePattern([200, 100, 200]);

    await this.showNotification({
      title: '🎉 Ride Completed!',
      body: `You earned ${pointsEarned} points`,
      tag: 'ride-completed',
      requireInteraction: false,
      data: { pointsEarned, type: 'ride-completed' },
    });
  }

  /**
   * Custom vibration pattern
   */
  vibratePattern(pattern: number[]): void {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }

  /**
   * Stop all alerts (sound and vibration)
   */
  stopAllAlerts(): void {
    soundAlert.stopAlert();
    soundAlert.stopVibration();
  }

  /**
   * Check if notifications are supported
   */
  isSupported(): boolean {
    return 'Notification' in window;
  }

  /**
   * Get current permission status
   */
  getPermissionStatus(): NotificationPermission {
    return this.permission;
  }

  /**
   * Test notification (for debugging)
   */
  async testNotification(): Promise<void> {
    await this.showNotification({
      title: '🧪 Test Notification',
      body: 'This is a test notification from AERAS Puller App',
      tag: 'test',
      requireInteraction: false,
    });
  }
}

// Export singleton instance
export const notificationManager = new NotificationManager();
