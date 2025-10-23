import { NativeModules, Platform } from 'react-native';

/**
 * Native alarm module interface
 * Provides access to Android's AlarmManager for exact alarms
 */

interface AlarmModuleInterface {
  /**
   * Check if the app can schedule exact alarms
   * Required on Android 12+ (API 31+)
   */
  canScheduleExactAlarms(): Promise<boolean>;

  /**
   * Request permission to schedule exact alarms
   * Opens system settings on Android 12+
   */
  requestExactAlarmPermission(): Promise<void>;

  /**
   * Schedule a native alarm using AlarmManager
   * This will trigger even when the app is killed
   */
  scheduleAlarm(alarmData: {
    id: string;
    label: string;
    triggerTime: number; // Unix timestamp in milliseconds
    isRepeating?: boolean;
  }): Promise<void>;

  /**
   * Cancel a scheduled alarm
   */
  cancelAlarm(alarmId: string): Promise<void>;

  /**
   * Cancel all scheduled alarms
   */
  cancelAllAlarms(): Promise<void>;
}

// Get the native module
const AlarmModuleNative = NativeModules.AlarmModule as AlarmModuleInterface | undefined;

/**
 * Safe wrapper around the native alarm module
 * Falls back gracefully if module is not available
 */
export const AlarmModule = {
  /**
   * Check if native alarm module is available
   */
  isAvailable(): boolean {
    return Platform.OS === 'android' && AlarmModuleNative !== undefined;
  },

  /**
   * Check if the app can schedule exact alarms
   */
  async canScheduleExactAlarms(): Promise<boolean> {
    if (!this.isAvailable() || !AlarmModuleNative) {
      console.warn('AlarmModule not available');
      return false;
    }
    try {
      return await AlarmModuleNative.canScheduleExactAlarms();
    } catch (error) {
      console.error('Error checking exact alarm permission:', error);
      return false;
    }
  },

  /**
   * Request permission to schedule exact alarms
   */
  async requestExactAlarmPermission(): Promise<void> {
    if (!this.isAvailable() || !AlarmModuleNative) {
      console.warn('AlarmModule not available');
      return;
    }
    try {
      await AlarmModuleNative.requestExactAlarmPermission();
    } catch (error) {
      console.error('Error requesting exact alarm permission:', error);
      throw error;
    }
  },

  /**
   * Schedule a native alarm
   */
  async scheduleAlarm(alarmData: {
    id: string;
    label: string;
    triggerTime: number;
    isRepeating?: boolean;
  }): Promise<void> {
    if (!this.isAvailable() || !AlarmModuleNative) {
      throw new Error('AlarmModule not available on this platform');
    }
    try {
      await AlarmModuleNative.scheduleAlarm(alarmData);
      console.log('Native alarm scheduled:', alarmData.id);
    } catch (error) {
      console.error('Error scheduling native alarm:', error);
      throw error;
    }
  },

  /**
   * Cancel a scheduled alarm
   */
  async cancelAlarm(alarmId: string): Promise<void> {
    if (!this.isAvailable() || !AlarmModuleNative) {
      console.warn('AlarmModule not available');
      return;
    }
    try {
      await AlarmModuleNative.cancelAlarm(alarmId);
      console.log('Native alarm canceled:', alarmId);
    } catch (error) {
      console.error('Error canceling native alarm:', error);
      throw error;
    }
  },

  /**
   * Cancel all scheduled alarms
   */
  async cancelAllAlarms(): Promise<void> {
    if (!this.isAvailable() || !AlarmModuleNative) {
      console.warn('AlarmModule not available');
      return;
    }
    try {
      await AlarmModuleNative.cancelAllAlarms();
      console.log('All native alarms canceled');
    } catch (error) {
      console.error('Error canceling all native alarms:', error);
      throw error;
    }
  },
};
