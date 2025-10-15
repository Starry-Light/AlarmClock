import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { notificationService } from '../services/notificationService';

export default function RootLayout() {
  useEffect(() => {
    // Request notification permissions on app start
    notificationService.requestPermissions();
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#000000' },
      }}
    />
  );
}
