import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import { alarmStorage } from './alarmStorage';
import { notificationService } from './notificationService';

/**
 * Service to handle native alarm events (dismiss/snooze)
 * These events come from the native AlarmActivity when user interacts with the alarm
 */

interface AlarmEvent {
  eventType: 'ALARM_DISMISSED' | 'ALARM_SNOOZED';
  alarmId: string;
}

class AlarmEventService {
  private eventEmitter: NativeEventEmitter | null = null;
  private subscription: any = null;

  /**
   * Initialize the alarm event listener
   */
  initialize() {
    if (Platform.OS !== 'android') {
      return;
    }

    const { AlarmEventModule } = NativeModules;
    if (!AlarmEventModule) {
      console.warn('AlarmEventModule not available');
      return;
    }

    this.eventEmitter = new NativeEventEmitter(AlarmEventModule);
    
    // Listen for alarm events
    this.subscription = this.eventEmitter.addListener(
      'AlarmEvent',
      (event: AlarmEvent) => {
        console.log('Received alarm event:', event);
        this.handleAlarmEvent(event);
      }
    );

    console.log('AlarmEventService initialized');
  }

  /**
   * Handle alarm events from native code
   */
  private async handleAlarmEvent(event: AlarmEvent) {
    const { eventType, alarmId } = event;

    switch (eventType) {
      case 'ALARM_DISMISSED':
        await this.handleDismiss(alarmId);
        break;
      
      case 'ALARM_SNOOZED':
        await this.handleSnooze(alarmId);
        break;
      
      default:
        console.warn('Unknown alarm event type:', eventType);
    }
  }


  private async handleDismiss(alarmId: string) {
    console.log('Handling dismiss for alarm:', alarmId);
    
    try {
      // Get the alarm
      const alarm = await alarmStorage.getAlarmById(alarmId);
      
      if (alarm) {
        // If it's a one-time alarm, disable it
        if (alarm.repeatDays.length === 0) {
          console.log('Disabling one-time alarm:', alarmId);
          await alarmStorage.toggleAlarm(alarmId);
        } else {
          // For repeating alarms, reschedule the next occurrence
          console.log('Rescheduling repeating alarm:', alarmId);
          await notificationService.scheduleAlarmNotification(alarm);
        }
      }
    } catch (error) {
      console.error('Error handling dismiss:', error);
    }
  }

  private async handleSnooze(alarmId: string) {
    console.log('Handling snooze for alarm:', alarmId);
    
    try {
      // Get the alarm
      const alarm = await alarmStorage.getAlarmById(alarmId);
      
      if (alarm) {
        // Schedule snooze for 5 minutes from now
        const snoozeTime = new Date(Date.now() + 5 * 60 * 1000);
        
        await notificationService.scheduleSnoozeNotification({
          time: snoozeTime,
          label: alarm.label || 'Alarm',
          alarmId: alarm.id,
        });
        
        console.log('Snoozed alarm for 5 minutes:', alarmId);
      }
    } catch (error) {
      console.error('Error handling snooze:', error);
    }
  }

  /**
   * Clean up event listener
   */
  cleanup() {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
    this.eventEmitter = null;
    console.log('AlarmEventService cleaned up');
  }
}

export const alarmEventService = new AlarmEventService();
