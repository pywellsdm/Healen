package com.healen.app;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public class AlarmActivity extends Activity {
    public static final String EXTRA_SESSION = "session";
    public static final String PREFS_NAME = "healen_alarm";
    public static final String KEY_DISMISSED = "dismissed_session";

    private MediaPlayer player;
    private Vibrator vibrator;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setShowWhenLocked(true);
        setTurnScreenOn(true);
        getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD);

        final String session = getIntent().getStringExtra(EXTRA_SESSION);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setBackgroundColor(0xFF0E0F1A);
        int pad = (int) (32 * getResources().getDisplayMetrics().density);
        root.setPadding(pad, pad, pad, pad);

        TextView title = new TextView(this);
        title.setText("Time to wake up");
        title.setTextColor(0xFFFFFFFF);
        title.setTextSize(28);
        title.setGravity(Gravity.CENTER);
        root.addView(title, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));

        TextView sub = new TextView(this);
        sub.setText("Your Healen alarm is ringing. Rise and shine!");
        sub.setTextColor(0xFF94A3B8);
        sub.setTextSize(16);
        sub.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams subLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        subLp.setMargins(0, (int) (16 * getResources().getDisplayMetrics().density), 0,
                (int) (64 * getResources().getDisplayMetrics().density));
        root.addView(sub, subLp);

        Button snooze = new Button(this);
        snooze.setText("Snooze 5 min");
        snooze.setTextColor(0xFFFFFFFF);
        snooze.setTextSize(16);
        snooze.setBackgroundColor(0xFF1E293B);
        LinearLayout.LayoutParams snoozeLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        snoozeLp.setMargins(0, (int) (32 * getResources().getDisplayMetrics().density), 0, 0);
        root.addView(snooze, snoozeLp);

        Button dismiss = new Button(this);
        dismiss.setText("Dismiss");
        dismiss.setTextColor(0xFFFFFFFF);
        dismiss.setTextSize(16);
        dismiss.setBackgroundColor(0xFF6366F1);
        LinearLayout.LayoutParams dismissLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        dismissLp.setMargins(0, (int) (16 * getResources().getDisplayMetrics().density), 0, 0);
        root.addView(dismiss, dismissLp);

        dismiss.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (session != null) {
                    SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                    prefs.edit().putString(KEY_DISMISSED, session).apply();
                }
                stopSound();
                finish();
            }
        });
        snooze.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                stopSound();
                finish();
            }
        });

        setContentView(root);
        startSound();
    }

    private void startSound() {
        try {
            player = MediaPlayer.create(this, RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM));
            if (player == null) {
                player = MediaPlayer.create(this, RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION));
            }
            if (player != null) {
                player.setLooping(true);
                player.start();
            }
        } catch (Exception ignored) {
        }
        vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        if (vibrator != null && vibrator.hasVibrator()) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createWaveform(
                        new long[]{0, 800, 400, 800, 400, 1200}, 0));
            } else {
                vibrator.vibrate(new long[]{0, 800, 400, 800, 400, 1200}, 0);
            }
        }
    }

    private void stopSound() {
        try {
            if (player != null) {
                player.stop();
                player.release();
                player = null;
            }
        } catch (Exception ignored) {
        }
        if (vibrator != null) {
            vibrator.cancel();
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        stopSound();
    }
}
