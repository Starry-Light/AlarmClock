import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState, Linking } from 'react-native';
import { notificationService } from '../services/notificationService';
import { alarmEventService } from '../services/alarmEventService';

export default function RootLayout() {
  const router = useRouter();
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    // Request notification permissions on app start
    notificationService.requestPermissions();
    
    // Request exact alarm permission on Android 12+
    notificationService.requestExactAlarmPermission();

    // Initialize alarm event service (for native dismiss/snooze events)
    alarmEventService.initialize();

    // Handle deep links from native AlarmActivity
    const handleDeepLink = (event: { url: string }) => {
      const { url } = event;
      console.log('Deep link received:', url);
      
      if (url.includes('alarm-ring')) {
        // Parse URL parameters
        const urlObj = new URL(url);
        const id = urlObj.searchParams.get('id') || '';
        const label = urlObj.searchParams.get('label') || 'Alarm';
        
        // Navigate to alarm ring screen
        router.push({
          pathname: '/alarm-ring',
          params: { id, label },
        });
      }
    };

    // Listen for deep links
    const linkingSubscription = Linking.addEventListener('url', handleDeepLink);
    
    // Check if app was opened with a deep link
    Linking.getInitialURL().then(url => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    // Check for notification that launched the app (when app was killed)
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (response) {
        console.log('App launched from notification:', response);
        const data = response.notification.request.content.data;
        const alarmId = data?.alarmId as string;
        const label = data?.label as string;

        // Navigate to alarm ring screen
        router.push({
          pathname: '/alarm-ring',
          params: {
            id: alarmId || '',
            label: label || 'Alarm',
          },
        });
      }
    });

    // Listen for notifications received while app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      
      // Get alarm data from notification
      const data = notification.request.content.data;
      const alarmId = data?.alarmId as string;
      const label = data?.label as string;

      // Navigate to alarm ring screen immediately (app is in foreground)
      router.push({
        pathname: '/alarm-ring',
        params: {
          id: alarmId || '',
          label: label || 'Alarm',
        },
      });
    });

    // Listen for notification taps (when user taps on notification)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response received:', response);
      
      // Get alarm data from notification
      const data = response.notification.request.content.data;
      const alarmId = data?.alarmId as string;
      const label = data?.label as string;

      // Navigate to alarm ring screen
      router.push({
        pathname: '/alarm-ring',
        params: {
          id: alarmId || '',
          label: label || 'Alarm',
        },
      });
    });

    // Listen for app state changes (foreground/background)
    const appStateSubscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        // App came to foreground - check for any pending notifications
        console.log('App is now active');
      }
    });

    // Cleanup listeners
    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
      linkingSubscription.remove();
      appStateSubscription.remove();
      alarmEventService.cleanup();
    };
  }, [router]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#000000' },
      }}
    />
  );
}
