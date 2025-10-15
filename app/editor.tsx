import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { StatusBar } from 'expo-status-bar';
import { RepeatDaysSelector } from '../components/RepeatDaysSelector';
import { useAlarms } from '../hooks/useAlarms';
import { Alarm, RepeatDay } from '../types/alarm';
import { Colors, Spacing, BorderRadius, FontSizes } from '../constants/theme';

export default function EditorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { alarms, addAlarm, updateAlarm } = useAlarms();

  const [time, setTime] = useState(new Date());
  const [label, setLabel] = useState('');
  const [repeatDays, setRepeatDays] = useState<RepeatDay[]>([]);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const isEditing = !!params.alarmId;
  const existingAlarm = alarms.find(a => a.id === params.alarmId);

  useEffect(() => {
    if (existingAlarm) {
      setTime(new Date(existingAlarm.time));
      setLabel(existingAlarm.label);
      setRepeatDays(existingAlarm.repeatDays);
    }
  }, [existingAlarm]);

  const handleSave = async () => {
    try {
      if (isEditing && existingAlarm) {
        const updatedAlarm: Alarm = {
          ...existingAlarm,
          time,
          label,
          repeatDays,
        };
        await updateAlarm(updatedAlarm);
      } else {
        const newAlarm: Alarm = {
          id: Date.now().toString(),
          time,
          label: label || 'Alarm',
          enabled: true,
          repeatDays,
        };
        await addAlarm(newAlarm);
      }
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to save alarm');
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const onTimeChange = (event: any, selectedDate?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setTime(selectedDate);
    }
  };

  const formatTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${ampm}`;
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Edit Alarm' : 'New Alarm'}
        </Text>
        <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
          <Text style={[styles.headerButtonText, styles.saveButton]}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Time</Text>
          <TouchableOpacity
            style={styles.timeButton}
            onPress={() => setShowTimePicker(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.timeText}>{formatTime(time)}</Text>
          </TouchableOpacity>

          {(showTimePicker || Platform.OS === 'ios') && (
            <DateTimePicker
              value={time}
              mode="time"
              is24Hour={false}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onTimeChange}
              textColor={Colors.dark.text}
              themeVariant="dark"
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Label</Text>
          <TextInput
            style={styles.input}
            value={label}
            onChangeText={setLabel}
            placeholder="Alarm name (optional)"
            placeholderTextColor={Colors.dark.textSecondary}
          />
        </View>

        <View style={styles.section}>
          <RepeatDaysSelector
            selectedDays={repeatDays}
            onDaysChange={setRepeatDays}
          />
        </View>

        {repeatDays.length === 0 && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              💡 This alarm will ring once. Select days to make it repeat.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl * 2,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  headerButton: {
    padding: Spacing.sm,
    minWidth: 60,
  },
  headerButtonText: {
    fontSize: FontSizes.md,
    color: Colors.dark.primary,
  },
  saveButton: {
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  content: {
    flex: 1,
    padding: Spacing.md,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionLabel: {
    fontSize: FontSizes.md,
    color: Colors.dark.text,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  timeButton: {
    backgroundColor: Colors.dark.surface,
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  timeText: {
    fontSize: 56,
    fontWeight: '200',
    color: Colors.dark.text,
  },
  input: {
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.dark.text,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  infoBox: {
    backgroundColor: Colors.dark.surfaceHighlight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.dark.primary,
  },
  infoText: {
    fontSize: FontSizes.sm,
    color: Colors.dark.textSecondary,
    lineHeight: 20,
  },
});
