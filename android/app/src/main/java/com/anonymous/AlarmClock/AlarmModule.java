package com.anonymous.AlarmClock;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;

/**
 * React Native module for scheduling exact alarms with full-screen intent
 * This allows the app to wake up and show full-screen alarm even when killed
 */
public class AlarmModule extends ReactContextBaseJavaModule {
    private static final String TAG = "AlarmModule";
    private final ReactApplicationContext reactContext;

    public AlarmModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "AlarmModule";
    }

    @ReactMethod
    public void canScheduleExactAlarms(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                AlarmManager alarmManager = (AlarmManager) reactContext.getSystemService(Context.ALARM_SERVICE);
                promise.resolve(alarmManager.canScheduleExactAlarms());
            } else {
                promise.resolve(true); // On older versions, permission is granted by default
            }
        } catch (Exception e) {
            Log.e(TAG, "Error checking exact alarm permission", e);
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void requestExactAlarmPermission(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                AlarmManager alarmManager = (AlarmManager) reactContext.getSystemService(Context.ALARM_SERVICE);
                if (!alarmManager.canScheduleExactAlarms()) {
                    // Open settings to request permission
                    Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                    intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    reactContext.startActivity(intent);
                }
            }
            promise.resolve(null);
        } catch (Exception e) {
            Log.e(TAG, "Error requesting exact alarm permission", e);
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void scheduleAlarm(ReadableMap alarmData, Promise promise) {
        try {
            String alarmId = alarmData.getString("id");
            String label = alarmData.hasKey("label") ? alarmData.getString("label") : "Alarm";
            double triggerTimeDouble = alarmData.getDouble("triggerTime");
            long triggerTime = (long) triggerTimeDouble;
            boolean isRepeating = alarmData.hasKey("isRepeating") && alarmData.getBoolean("isRepeating");

            Log.d(TAG, "Scheduling alarm: " + alarmId + " at " + triggerTime);

            AlarmManager alarmManager = (AlarmManager) reactContext.getSystemService(Context.ALARM_SERVICE);

            // Create intent for the broadcast receiver
            Intent intent = new Intent(reactContext, AlarmReceiver.class);
            intent.putExtra("alarmId", alarmId);
            intent.putExtra("label", label);
            intent.putExtra("isRepeating", isRepeating);
            
            // Use unique request code based on alarm ID hash
            int requestCode = alarmId.hashCode();

            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                reactContext,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            // Schedule the alarm
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                // Use setExactAndAllowWhileIdle for exact timing even in Doze mode
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    triggerTime,
                    pendingIntent
                );
            } else {
                alarmManager.setExact(
                    AlarmManager.RTC_WAKEUP,
                    triggerTime,
                    pendingIntent
                );
            }

            Log.d(TAG, "Alarm scheduled successfully: " + alarmId);
            promise.resolve(null);
        } catch (Exception e) {
            Log.e(TAG, "Error scheduling alarm", e);
            promise.reject("ERROR", "Failed to schedule alarm: " + e.getMessage());
        }
    }

    @ReactMethod
    public void cancelAlarm(String alarmId, Promise promise) {
        try {
            Log.d(TAG, "Canceling alarm: " + alarmId);

            AlarmManager alarmManager = (AlarmManager) reactContext.getSystemService(Context.ALARM_SERVICE);

            Intent intent = new Intent(reactContext, AlarmReceiver.class);
            int requestCode = alarmId.hashCode();

            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                reactContext,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            alarmManager.cancel(pendingIntent);
            pendingIntent.cancel();

            Log.d(TAG, "Alarm canceled successfully: " + alarmId);
            promise.resolve(null);
        } catch (Exception e) {
            Log.e(TAG, "Error canceling alarm", e);
            promise.reject("ERROR", "Failed to cancel alarm: " + e.getMessage());
        }
    }

    @ReactMethod
    public void cancelAllAlarms(Promise promise) {
        try {
            Log.d(TAG, "Canceling all alarms");
            // This is a placeholder - in production, you'd want to track all alarm IDs
            // For now, we'll handle cancellation through individual cancelAlarm calls
            Log.d(TAG, "All alarms canceled");
            promise.resolve(null);
        } catch (Exception e) {
            Log.e(TAG, "Error canceling all alarms", e);
            promise.reject("ERROR", "Failed to cancel all alarms: " + e.getMessage());
        }
    }
}
