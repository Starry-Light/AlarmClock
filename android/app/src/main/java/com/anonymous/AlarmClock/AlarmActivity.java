package com.anonymous.AlarmClock;

import android.app.KeyguardManager;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.Log;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Full-screen native alarm activity that shows when alarm triggers
 * This activity works over lock screen and provides dismiss/snooze functionality
 */
public class AlarmActivity extends AppCompatActivity {
    private static final String TAG = "AlarmActivity";
    private MediaPlayer mediaPlayer;
    private Vibrator vibrator;
    private String alarmId;
    private String label;
    
    private TextView currentTimeText;
    private TextView currentDateText;
    private TextView alarmLabelText;
    private TextView alarmTimeText;
    private Button dismissButton;
    private Button snoozeButton;

    @Override
    public void onBackPressed() {
        // Prevent dismissing alarm with back button
        // User must use the dismiss button
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Log.d(TAG, "AlarmActivity created");

        // Configure window to show over lock screen
        setupWindowFlags();

        // Set the native layout
        setContentView(R.layout.activity_alarm);

        // Get alarm data from intent
        Intent intent = getIntent();
        alarmId = intent.getStringExtra("alarmId");
        label = intent.getStringExtra("label");

        Log.d(TAG, "Alarm ID: " + alarmId + ", Label: " + label);

        // Initialize UI components
        initializeViews();
        
        // Update time display
        updateTimeDisplay();

        // Start alarm sound and vibration
        startAlarmSoundAndVibration();

        // Set up button listeners
        setupButtonListeners();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        stopAlarmSoundAndVibration();
    }

    private void setupWindowFlags() {
        // Show activity over lock screen and turn screen on
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
            KeyguardManager keyguardManager = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
            keyguardManager.requestDismissKeyguard(this, null);
        } else {
            getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
            );
        }

        // Keep screen on while alarm is ringing
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }

    private void initializeViews() {
        currentTimeText = findViewById(R.id.currentTimeText);
        currentDateText = findViewById(R.id.currentDateText);
        alarmLabelText = findViewById(R.id.alarmLabelText);
        alarmTimeText = findViewById(R.id.alarmTimeText);
        dismissButton = findViewById(R.id.dismissButton);
        snoozeButton = findViewById(R.id.snoozeButton);

        // Set alarm label
        if (label != null && !label.isEmpty()) {
            alarmLabelText.setText(label);
        } else {
            alarmLabelText.setText("Alarm");
        }
    }

    private void updateTimeDisplay() {
        // Update current time
        Date now = new Date();
        SimpleDateFormat timeFormat = new SimpleDateFormat("HH:mm", Locale.getDefault());
        SimpleDateFormat dateFormat = new SimpleDateFormat("EEEE, MMMM d", Locale.getDefault());
        
        currentTimeText.setText(timeFormat.format(now));
        currentDateText.setText(dateFormat.format(now));
        alarmTimeText.setText("Alarm is ringing");
    }

    private void setupButtonListeners() {
        dismissButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                handleDismiss();
            }
        });

        snoozeButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                handleSnooze();
            }
        });
    }

    private void handleDismiss() {
        Log.d(TAG, "Alarm dismissed");
        
        // Stop alarm
        stopAlarmSoundAndVibration();
        
        // Send dismiss event to React Native
        sendEventToReactNative("ALARM_DISMISSED", alarmId);
        
        // Finish this activity
        finish();
    }

    private void handleSnooze() {
        Log.d(TAG, "Alarm snoozed");
        
        // Stop alarm
        stopAlarmSoundAndVibration();
        
        // Send snooze event to React Native
        sendEventToReactNative("ALARM_SNOOZED", alarmId);
        
        // Finish this activity
        finish();
    }

    private void sendEventToReactNative(String eventType, String alarmId) {
        // Create intent to send broadcast to React Native
        Intent intent = new Intent("com.anonymous.AlarmClock.ALARM_ACTION");
        intent.putExtra("eventType", eventType);
        intent.putExtra("alarmId", alarmId);
        sendBroadcast(intent);
        
        Log.d(TAG, "Sent event to React Native: " + eventType + " for alarm " + alarmId);
    }

    private void startAlarmSoundAndVibration() {
        // Start vibration
        vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        if (vibrator != null && vibrator.hasVibrator()) {
            long[] pattern = {0, 500, 500, 500, 500};
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
            } else {
                vibrator.vibrate(pattern, 0);
            }
        }

        // Start alarm sound
        try {
            mediaPlayer = new MediaPlayer();
            
            // Try to load custom alarm sound
            int soundResId = getResources().getIdentifier("alarm", "raw", getPackageName());
            Uri soundUri;
            
            if (soundResId != 0) {
                soundUri = Uri.parse("android.resource://" + getPackageName() + "/" + soundResId);
            } else {
                // Fallback to default alarm sound
                soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
                if (soundUri == null) {
                    soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
                }
            }

            mediaPlayer.setDataSource(this, soundUri);
            
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();
            mediaPlayer.setAudioAttributes(audioAttributes);
            
            mediaPlayer.setLooping(true);
            mediaPlayer.setVolume(1.0f, 1.0f);
            mediaPlayer.prepare();
            mediaPlayer.start();

            Log.d(TAG, "Alarm sound started");
        } catch (IOException e) {
            Log.e(TAG, "Error playing alarm sound", e);
        }
    }

    private void stopAlarmSoundAndVibration() {
        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying()) {
                    mediaPlayer.stop();
                }
                mediaPlayer.release();
                mediaPlayer = null;
            } catch (Exception e) {
                Log.e(TAG, "Error stopping media player", e);
            }
        }

        if (vibrator != null) {
            vibrator.cancel();
            vibrator = null;
        }

        Log.d(TAG, "Alarm sound and vibration stopped");
    }
}
