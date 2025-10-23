import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Alarm, RepeatDay } from '../types/alarm';
import { AlarmModule } from './nativeAlarmModule';

/**
 * Configure notification behavior
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Set up notification channels and categories
 */
async function setupNotifications() {
  // Set up Android notification channel with alarm sound
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('alarm', {
      name: 'Alarm Notifications',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'alarm',
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF0000',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true, // This allows sound even in Do Not Disturb mode
      enableVibrate: true,
      enableLights: true,
      showBadge: true,
    });
  }

  // Set up notification categories with action buttons
  await Notifications.setNotificationCategoryAsync('alarm', [
    {
      identifier: 'dismiss',
      buttonTitle: 'Dismiss',
      options: {
        opensAppToForeground: true,
      },
    },
    {
      identifier: 'snooze',
      buttonTitle: 'Snooze 5min',
      options: {
        opensAppToForeground: true,
      },
    },
  ]);
}

// Initialize notifications
setupNotifications();

/**
 * Map RepeatDay to weekday number (1 = Monday, 7 = Sunday)
 */
const DAY_TO_WEEKDAY: Record<RepeatDay, number> = {
  'Mon': 1,
  'Tue': 2,
  'Wed': 3,
  'Thu': 4,
  'Fri': 5,
  'Sat': 6,
  'Sun': 7,
};

export const notificationService = {
  /**
   * Request notification permissions and set up channels
   */
  async requestPermissions(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    // Set up notification channels every time we request permissions
    // This ensures channels exist before scheduling
    if (finalStatus === 'granted' && Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('alarm', {
        name: 'Alarm Notifications',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'alarm', // Sound name without extension when using expo-notifications plugin
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF0000',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
      });
    }
    
    return finalStatus === 'granted';
  },

  /**
   * Request exact alarm permission (Android 12+)
   */
  async requestExactAlarmPermission(): Promise<boolean> {
    if (!AlarmModule.isAvailable()) {
      return true; // Not needed on iOS or older Android
    }

    const canSchedule = await AlarmModule.canScheduleExactAlarms();
    if (!canSchedule) {
      await AlarmModule.requestExactAlarmPermission();
      // Check again after request
      return await AlarmModule.canScheduleExactAlarms();
    }
    return true;
  },

  /**
   * Schedule notification for an alarm using native AlarmManager
   * This ensures the alarm triggers even when the app is killed
   */
  async scheduleAlarmNotification(alarm: Alarm): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.warn('Notification permission denied');
        return null;
      }

      // Request exact alarm permission on Android 12+
      await this.requestExactAlarmPermission();

      // Cancel existing notification if any
      if (alarm.notificationId) {
        await this.cancelNotification(alarm.notificationId);
      }

      const hour = alarm.time.getHours();
      const minute = alarm.time.getMinutes();

      // Use native alarm module on Android for reliable triggering
      if (AlarmModule.isAvailable()) {
        await this.scheduleNativeAlarm(alarm);
        // Return a synthetic ID for tracking
        return `native-${alarm.id}`;
      }

      // Fallback to expo-notifications (for iOS or if native module fails)
      // If alarm has repeat days, schedule repeating notification
      if (alarm.repeatDays.length > 0) {
        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Alarm ⏰',
            body: alarm.label || 'Time to wake up!',
            sound: 'alarm',
            priority: Notifications.AndroidNotificationPriority.MAX,
            data: { alarmId: alarm.id, label: alarm.label },
            categoryIdentifier: 'alarm',
            autoDismiss: false,
            sticky: true,
            ...(Platform.OS === 'android' && { channelId: 'alarm' }),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
            hour,
            minute,
            repeats: true,
          },
        });
        
        return notificationId;
      } else {
        // One-time alarm
        const triggerDate = new Date(alarm.time);
        
        // If the time has passed today, schedule for tomorrow
        if (triggerDate < new Date()) {
          triggerDate.setDate(triggerDate.getDate() + 1);
        }

        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Alarm ⏰',
            body: alarm.label || 'Time to wake up!',
            sound: 'alarm',
            priority: Notifications.AndroidNotificationPriority.MAX,
            data: { alarmId: alarm.id, label: alarm.label },
            categoryIdentifier: 'alarm',
            autoDismiss: false,
            sticky: true,
            ...(Platform.OS === 'android' && { channelId: 'alarm' }),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
          },
        });
        
        return notificationId;
      }
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  },

  /**
   * Schedule native alarm using AlarmManager
   * This is used on Android to ensure alarms trigger when app is killed
   */
  async scheduleNativeAlarm(alarm: Alarm): Promise<void> {
    if (!AlarmModule.isAvailable()) {
      throw new Error('Native alarm module not available');
    }

    const isRepeating = alarm.repeatDays.length > 0;
    let triggerDate: Date;

    if (isRepeating) {
      // For repeating alarms, find the next occurrence based on repeat days
      triggerDate = this.getNextOccurrence(alarm.time, alarm.repeatDays);
    } else {
      // For one-time alarms
      triggerDate = new Date(alarm.time);
      
      // If the time has passed today, schedule for tomorrow
      if (triggerDate < new Date()) {
        triggerDate.setDate(triggerDate.getDate() + 1);
      }
    }

    await AlarmModule.scheduleAlarm({
      id: alarm.id,
      label: alarm.label || 'Alarm',
      triggerTime: triggerDate.getTime(),
      isRepeating,
    });

    console.log('Native alarm scheduled:', alarm.id, 'for', triggerDate.toString());
  },

  /**
   * Calculate the next occurrence of a repeating alarm
   */
  getNextOccurrence(alarmTime: Date, repeatDays: RepeatDay[]): Date {
    if (repeatDays.length === 0) {
      // No repeat days - return the alarm time
      const result = new Date(alarmTime);
      if (result < new Date()) {
        result.setDate(result.getDate() + 1);
      }
      return result;
    }

    const now = new Date();
    const alarmHour = alarmTime.getHours();
    const alarmMinute = alarmTime.getMinutes();
    
    // Convert repeat days to day numbers (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const repeatDayNumbers = repeatDays.map(day => {
      const dayMap: Record<RepeatDay, number> = {
        'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
      };
      return dayMap[day];
    }).sort((a, b) => a - b);

    // Start checking from today
    let candidate = new Date();
    candidate.setHours(alarmHour, alarmMinute, 0, 0);

    // If the alarm time has already passed today, start checking from tomorrow
    if (candidate <= now) {
      candidate.setDate(candidate.getDate() + 1);
    }

    // Find the next day that matches one of the repeat days
    // Check up to 7 days ahead
    for (let i = 0; i < 7; i++) {
      const dayOfWeek = candidate.getDay();
      if (repeatDayNumbers.includes(dayOfWeek)) {
        return candidate;
      }
      candidate.setDate(candidate.getDate() + 1);
    }

    // Fallback: return tomorrow (should never reach here if repeatDays is not empty)
    const fallback = new Date();
    fallback.setHours(alarmHour, alarmMinute, 0, 0);
    fallback.setDate(fallback.getDate() + 1);
    return fallback;
  },

  /**
   * Schedule a snooze notification (5 minutes from now)
   */
  async scheduleSnoozeNotification(params: {
    time: Date;
    label: string;
    alarmId: string;
  }): Promise<string | null> {
    try {
      // Use native alarm for snooze on Android
      if (AlarmModule.isAvailable()) {
        await AlarmModule.scheduleAlarm({
          id: `snooze-${params.alarmId}`,
          label: params.label || 'Snooze Alarm',
          triggerTime: params.time.getTime(),
          isRepeating: false,
        });
        return `native-snooze-${params.alarmId}`;
      }

      // Fallback to expo-notifications
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Snooze Alarm',
          body: params.label || 'Time to wake up!',
          sound: 'alarm',
          priority: Notifications.AndroidNotificationPriority.MAX,
          data: { alarmId: params.alarmId, label: params.label, isSnooze: true },
          categoryIdentifier: 'alarm',
          autoDismiss: false,
          sticky: true,
          ...(Platform.OS === 'android' && { channelId: 'alarm' }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: params.time,
        },
      });
      
      return notificationId;
    } catch (error) {
      console.error('Error scheduling snooze notification:', error);
      return null;
    }
  },

  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    try {
      // Handle native alarm cancellation
      if (notificationId.startsWith('native-')) {
        const alarmId = notificationId.replace('native-', '');
        if (AlarmModule.isAvailable()) {
          await AlarmModule.cancelAlarm(alarmId);
        }
        return;
      }

      // Cancel expo notification
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  },

  /**
   * Cancel all notifications for an alarm
   */
  async cancelAlarmNotifications(alarm: Alarm): Promise<void> {
    if (alarm.notificationId) {
      await this.cancelNotification(alarm.notificationId);
    }
  },

  /**
   * Get all scheduled notifications (for debugging)
   */
  async getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    return await Notifications.getAllScheduledNotificationsAsync();
  },

  /**
   * Cancel all notifications
   */
  async cancelAllNotifications(): Promise<void> {
    // Cancel native alarms
    if (AlarmModule.isAvailable()) {
      await AlarmModule.cancelAllAlarms();
    }
    // Cancel expo notifications
    await Notifications.cancelAllScheduledNotificationsAsync();
  },
};
