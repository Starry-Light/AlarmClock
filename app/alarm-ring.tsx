import { useKeepAwake } from 'expo-keep-awake';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/theme';
import { alarmStorage } from '../services/alarmStorage';
import { audioService } from '../services/audioService';
import { notificationService } from '../services/notificationService';

/**
 * Full-screen alarm ringing screen
 * Shows when alarm triggers
 */
export default function AlarmRingScreen() {
  useKeepAwake(); // Keep screen awake while alarm is ringing
  
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [alarmLabel, setAlarmLabel] = useState<string>('Alarm');
  const [alarmId, setAlarmId] = useState<string>('');

  useEffect(() => {
    // Parse params
    const label = Array.isArray(params.label) ? params.label[0] : params.label;
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    
    setAlarmLabel(label || 'Alarm');
    setAlarmId(id || '');

    // Start playing alarm sound
    audioService.playAlarmSound();

    // Update time every second
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Cleanup on unmount
    return () => {
      clearInterval(interval);
      audioService.stopAlarmSound();
    };
  }, [params]);

  /**
   * Dismiss alarm - stop sound and go back
   */
  const handleDismiss = async () => {
    await audioService.stopAlarmSound();
    
    // If it's a one-time alarm, disable it
    if (alarmId) {
      try {
        const alarm = await alarmStorage.getAlarmById(alarmId);
        if (alarm && alarm.repeatDays.length === 0) {
          // One-time alarm - disable it
          await alarmStorage.toggleAlarm(alarmId);
        }
      } catch (error) {
        console.error('Error disabling one-time alarm:', error);
      }
    }
    
    router.back();
  };

  /**
   * Snooze alarm - stop sound, reschedule for 5 minutes, go back
   */
  const handleSnooze = async () => {
    await audioService.stopAlarmSound();
    
    // Schedule snooze notification
    const snoozeTime = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
    
    try {
      await notificationService.scheduleSnoozeNotification({
        time: snoozeTime,
        label: alarmLabel,
        alarmId: alarmId,
      });
      console.log('Alarm snoozed for 5 minutes');
    } catch (error) {
      console.error('Error scheduling snooze:', error);
    }
    
    router.back();
  };

  // Format time as HH:MM AM/PM
  const formatTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${ampm}`;
  };

  // Format date as Day, Month Date
  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>ALARM</Text>
      </View>

      {/* Main content */}
      <View style={styles.content}>
        {/* Current time display */}
        <View style={styles.timeContainer}>
          <Text style={styles.time}>{formatTime(currentTime)}</Text>
          <Text style={styles.date}>{formatDate(currentTime)}</Text>
        </View>

        {/* Alarm label */}
        <View style={styles.labelContainer}>
          <Text style={styles.alarmIcon}>⏰</Text>
          <Text style={styles.label}>{alarmLabel}</Text>
        </View>

        {/* Pulsing animation indicator */}
        <View style={styles.pulseContainer}>
          <View style={styles.pulseRing} />
          <View style={styles.pulseRing2} />
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity 
          style={[styles.button, styles.snoozeButton]}
          onPress={handleSnooze}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonIcon}>😴</Text>
          <Text style={styles.buttonText}>Snooze</Text>
          <Text style={styles.buttonSubtext}>5 minutes</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.dismissButton]}
          onPress={handleDismiss}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonIcon}>✓</Text>
          <Text style={styles.buttonText}>Dismiss</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.textSecondary,
    letterSpacing: 2,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  timeContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  time: {
    fontSize: 72,
    fontWeight: '200',
    color: Colors.dark.text,
    marginBottom: 8,
  },
  date: {
    fontSize: 18,
    color: Colors.dark.textSecondary,
  },
  labelContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  alarmIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  label: {
    fontSize: 24,
    fontWeight: '500',
    color: Colors.dark.text,
    textAlign: 'center',
  },
  pulseContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: Colors.dark.primary,
    opacity: 0.6,
  },
  pulseRing2: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: Colors.dark.primary,
    opacity: 0.4,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 30,
    gap: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  snoozeButton: {
    backgroundColor: Colors.dark.surfaceHighlight,
  },
  dismissButton: {
    backgroundColor: Colors.dark.primary,
  },
  buttonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  buttonSubtext: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
});
