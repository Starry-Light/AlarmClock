import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AlarmList } from '../components/AlarmList';
import { useAlarms } from '../hooks/useAlarms';
import { Colors, Spacing, BorderRadius, FontSizes } from '../constants/theme';
import { Alarm } from '../types/alarm';

export default function HomeScreen() {
  const router = useRouter();
  const { alarms, loading, error, toggleAlarm, deleteAlarm } = useAlarms();

  const handleAddAlarm = () => {
    router.push('/editor');
  };

  const handleEditAlarm = (alarm: Alarm) => {
    router.push({
      pathname: '/editor',
      params: { alarmId: alarm.id },
    });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.dark.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Alarms</Text>
        <Text style={styles.subtitle}>
          {alarms.length} {alarms.length === 1 ? 'alarm' : 'alarms'}
        </Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <AlarmList
        alarms={alarms}
        onToggle={toggleAlarm}
        onEdit={handleEditAlarm}
        onDelete={deleteAlarm}
      />

      <TouchableOpacity 
        style={styles.fab}
        onPress={handleAddAlarm}
        activeOpacity={0.8}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl * 2,
    paddingBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.dark.text,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.dark.textSecondary,
  },
  errorContainer: {
    backgroundColor: Colors.dark.danger,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  errorText: {
    color: Colors.dark.text,
    fontSize: FontSizes.sm,
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.xl,
    width: 60,
    height: 60,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.dark.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabIcon: {
    fontSize: 32,
    color: Colors.dark.text,
    fontWeight: '300',
  },
});
