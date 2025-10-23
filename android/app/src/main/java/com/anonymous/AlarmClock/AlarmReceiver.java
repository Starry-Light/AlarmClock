package com.anonymous.AlarmClock;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;

/**
 * Broadcast receiver that triggers when an alarm time is reached
 * Launches full-screen alarm activity
 */
public class AlarmReceiver extends BroadcastReceiver {
    private static final String TAG = "AlarmReceiver";
    private static final String CHANNEL_ID = "alarm_channel";
    private static final int NOTIFICATION_ID = 1001;

    @Override
    public void onReceive(Context context, Intent intent) {
        String alarmId = intent.getStringExtra("alarmId");
        String label = intent.getStringExtra("label");
        boolean isRepeating = intent.getBooleanExtra("isRepeating", false);

        Log.d(TAG, "Alarm triggered: " + alarmId + " - " + label);

        // Create notification channel
        createNotificationChannel(context);

        // Create intent to launch full-screen alarm activity
        Intent fullScreenIntent = new Intent(context, AlarmActivity.class);
        fullScreenIntent.putExtra("alarmId", alarmId);
        fullScreenIntent.putExtra("label", label);
        fullScreenIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | 
                                  Intent.FLAG_ACTIVITY_CLEAR_TOP |
                                  Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS);

        PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(
            context,
            alarmId.hashCode(),
            fullScreenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Create notification with full-screen intent
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(context.getResources().getIdentifier("ic_launcher", "mipmap", context.getPackageName()))
            .setContentTitle("Alarm")
            .setContentText(label != null ? label : "Time to wake up!")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setAutoCancel(true)
            .setOngoing(true)
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .setContentIntent(fullScreenPendingIntent);

        // Show the notification
        NotificationManager notificationManager = 
            (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        notificationManager.notify(NOTIFICATION_ID, builder.build());

        // Also directly start the activity
        context.startActivity(fullScreenIntent);

        Log.d(TAG, "Full-screen alarm launched for: " + alarmId);
    }

    private void createNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            CharSequence name = "Alarm Notifications";
            String description = "Notifications for alarm clock";
            int importance = NotificationManager.IMPORTANCE_HIGH;
            
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, name, importance);
            channel.setDescription(description);
            channel.enableLights(true);
            channel.enableVibration(true);
            channel.setBypassDnd(true);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            
            // Set alarm sound
            try {
                int soundResId = context.getResources().getIdentifier("alarm", "raw", context.getPackageName());
                if (soundResId != 0) {
                    Uri soundUri = Uri.parse("android.resource://" + context.getPackageName() + "/" + soundResId);
                    AudioAttributes audioAttributes = new AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .build();
                    channel.setSound(soundUri, audioAttributes);
                }
            } catch (Exception e) {
                Log.e(TAG, "Error setting alarm sound", e);
            }

            NotificationManager notificationManager = context.getSystemService(NotificationManager.class);
            notificationManager.createNotificationChannel(channel);
        }
    }
}
