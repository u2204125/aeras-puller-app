/**
 * Sound Alert Utilities
 * Manages audio alerts for ride notifications
 */

class SoundAlertManager {
  private audioContext: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying = false;

  /**
   * Initialize audio context (must be called after user interaction)
   */
  private initAudioContext(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  /**
   * Play a loud, looping beep sound
   * This uses the Web Audio API to create a tone
   */
  playAlert(): void {
    if (this.isPlaying) return;

    this.initAudioContext();
    if (!this.audioContext) return;

    // Create oscillator for beep sound
    this.oscillator = this.audioContext.createOscillator();
    this.gainNode = this.audioContext.createGain();

    // Configure the beep (800Hz frequency, sine wave)
    this.oscillator.type = 'sine';
    this.oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);

    // Set volume
    this.gainNode.gain.setValueAtTime(0.5, this.audioContext.currentTime);

    // Connect nodes
    this.oscillator.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);

    // Start the beep
    this.oscillator.start();
    this.isPlaying = true;

    // Create pulsing effect (beep on/off every 500ms)
    this.createPulse();

    // Also vibrate the device if supported
    this.vibrate();
  }

  /**
   * Create a pulsing beep effect
   */
  private createPulse(): void {
    if (!this.gainNode || !this.audioContext || !this.isPlaying) return;

    const currentTime = this.audioContext.currentTime;
    
    // Beep pattern: on for 0.2s, off for 0.3s
    this.gainNode.gain.setValueAtTime(0.5, currentTime);
    this.gainNode.gain.setValueAtTime(0, currentTime + 0.2);
    this.gainNode.gain.setValueAtTime(0.5, currentTime + 0.5);
    
    // Continue pulsing
    setTimeout(() => {
      if (this.isPlaying) {
        this.createPulse();
      }
    }, 500);
  }

  /**
   * Stop the alert sound
   */
  stopAlert(): void {
    if (!this.isPlaying) return;

    this.isPlaying = false;

    if (this.oscillator) {
      try {
        this.oscillator.stop();
        this.oscillator.disconnect();
        this.oscillator = null;
      } catch (e) {
        console.error('Error stopping oscillator:', e);
      }
    }

    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
  }

  /**
   * Vibrate the device (if supported)
   * Pattern: vibrate 200ms, pause 100ms, repeat
   */
  vibrate(): void {
    if ('vibrate' in navigator) {
      // Long vibration pattern for attention
      const pattern = [200, 100, 200, 100, 200];
      navigator.vibrate(pattern);
    }
  }

  /**
   * Stop vibration
   */
  stopVibration(): void {
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }
  }

  /**
   * Check if audio is currently playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Play a short success sound
   */
  playSuccess(): void {
    this.initAudioContext();
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(523.25, this.audioContext.currentTime); // C5 note
    oscillator.frequency.setValueAtTime(659.25, this.audioContext.currentTime + 0.1); // E5 note

    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + 0.3);

    // Short success vibration
    if ('vibrate' in navigator) {
      navigator.vibrate(100);
    }
  }
}

// Export singleton instance
export const soundAlert = new SoundAlertManager();
