package com.anonymous.AlarmClock;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

/**
 * Broadcast receiver to restore alarms after device reboot
 */
public class AlarmBootReceiver extends BroadcastReceiver {
    private static final String TAG = "AlarmBootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            Log.d(TAG, "Device booted - alarms should be restored by React Native on app start");
            
            // Note: We don't restore alarms here directly because:
            // 1. Alarm data is stored in SQLite by React Native
            // 2. React Native will restore alarms when the app starts
            // 3. This receiver just ensures we can respond to boot events
            
            // If you want to restore alarms immediately after boot without waiting
            // for user to open the app, you would need to:
            // 1. Store alarm data in SharedPreferences (accessible from Java)
            // 2. Re-schedule all alarms here
            // For now, alarms will be restored when user opens the app
        }
    }
}
