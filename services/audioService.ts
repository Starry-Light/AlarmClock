import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

/**
 * Audio service for playing alarm sounds
 * Handles looping, volume control, and vibration
 */

let soundObject: Audio.Sound | null = null;
let isPlaying = false;

export const audioService = {
  /**
   * Initialize audio mode for alarm playback
   * This ensures audio plays even in silent mode on supported platforms
   */
  async initializeAudio(): Promise<void> {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true, // Play in silent mode on iOS
        staysActiveInBackground: true,
        shouldDuckAndroid: false, // Don't lower volume for other apps
        playThroughEarpieceAndroid: false, // Use speaker
        allowsRecordingIOS: false,
      });
    } catch (error) {
      console.error('Error initializing audio:', error);
    }
  },

  /**
   * Play alarm sound with looping
   */
  async playAlarmSound(): Promise<void> {
    try {
      // Stop any currently playing sound
      await this.stopAlarmSound();

      // Initialize audio mode
      await this.initializeAudio();

      // Try to load and play the custom alarm sound
      try {
        const { sound } = await Audio.Sound.createAsync(
          require('../assets/sounds/alarm.mp3'),
          {
            shouldPlay: true,
            isLooping: true, // Loop continuously
            volume: 1.0, // Maximum volume
          },
          this.onPlaybackStatusUpdate
        );

        soundObject = sound;
        isPlaying = true;

        // Start vibration pattern
        this.startVibrationPattern();

        console.log('Alarm sound started successfully');
      } catch (soundError) {
        console.error('Error loading alarm.mp3:', soundError);
        
        // Still start vibration even if sound fails
        isPlaying = true;
        this.startVibrationPattern();
        
        console.log('Playing with vibration only (sound file not loaded)');
      }
    } catch (error) {
      console.error('Error in playAlarmSound:', error);
      
      // At minimum, try to vibrate
      isPlaying = true;
      this.startVibrationPattern();
    }
  },

  /**
   * Stop alarm sound and vibration
   */
  async stopAlarmSound(): Promise<void> {
    try {
      if (soundObject) {
        await soundObject.stopAsync();
        await soundObject.unloadAsync();
        soundObject = null;
      }
      isPlaying = false;
      console.log('Alarm sound stopped');
    } catch (error) {
      console.error('Error stopping alarm sound:', error);
    }
  },

  /**
   * Check if alarm is currently playing
   */
  isAlarmPlaying(): boolean {
    return isPlaying;
  },

  /**
   * Vibration pattern for alarm
   * Continuous pattern that repeats
   */
  startVibrationPattern(): void {
    // Vibrate in a pattern: [wait, vibrate, wait, vibrate]
    // This will run continuously while alarm is active
    const vibrate = () => {
      if (isPlaying) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setTimeout(vibrate, 1000); // Vibrate every second
      }
    };
    vibrate();
  },

  /**
   * Playback status update handler
   */
  onPlaybackStatusUpdate(status: any): void {
    if (status.didJustFinish && !status.isLooping) {
      console.log('Alarm sound finished');
    }
    if (status.error) {
      console.error('Playback error:', status.error);
    }
  },

  /**
   * Set volume (0.0 to 1.0)
   * For future gradual volume increase feature
   */
  async setVolume(volume: number): Promise<void> {
    try {
      if (soundObject) {
        await soundObject.setVolumeAsync(Math.max(0, Math.min(1, volume)));
      }
    } catch (error) {
      console.error('Error setting volume:', error);
    }
  },

  /**
   * Cleanup on app close/background
   */
  async cleanup(): Promise<void> {
    await this.stopAlarmSound();
  },
};
