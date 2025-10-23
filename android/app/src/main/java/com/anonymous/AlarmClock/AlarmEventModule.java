package com.anonymous.AlarmClock;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import androidx.annotation.Nullable;

/**
 * React Native module to receive alarm events from native code
 */
public class AlarmEventModule extends ReactContextBaseJavaModule {
    private static final String TAG = "AlarmEventModule";
    private final ReactApplicationContext reactContext;
    private BroadcastReceiver alarmEventReceiver;

    public AlarmEventModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        registerAlarmEventReceiver();
    }

    @Override
    public String getName() {
        return "AlarmEventModule";
    }

    @Override
    public void onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy();
        if (alarmEventReceiver != null) {
            try {
                reactContext.unregisterReceiver(alarmEventReceiver);
                Log.d(TAG, "Alarm event receiver unregistered");
            } catch (Exception e) {
                Log.e(TAG, "Error unregistering receiver", e);
            }
        }
    }

    private void registerAlarmEventReceiver() {
        alarmEventReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String eventType = intent.getStringExtra("eventType");
                String alarmId = intent.getStringExtra("alarmId");
                
                Log.d(TAG, "Received alarm event: " + eventType + " for alarm " + alarmId);
                
                // Send event to React Native
                WritableMap params = Arguments.createMap();
                params.putString("eventType", eventType);
                params.putString("alarmId", alarmId);
                
                sendEvent("AlarmEvent", params);
            }
        };

        IntentFilter filter = new IntentFilter("com.anonymous.AlarmClock.ALARM_ACTION");
        
        // Android 13+ requires specifying export flag
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            reactContext.registerReceiver(alarmEventReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            reactContext.registerReceiver(alarmEventReceiver, filter);
        }
        
        Log.d(TAG, "Alarm event receiver registered");
    }

    private void sendEvent(String eventName, @Nullable WritableMap params) {
        if (reactContext.hasActiveCatalystInstance()) {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, params);
            Log.d(TAG, "Event sent to React Native: " + eventName);
        } else {
            Log.w(TAG, "Cannot send event, Catalyst instance not active");
        }
    }
}
