package com.healen.app;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.os.Build;

public class ReminderReceiver extends BroadcastReceiver {
    private static final String CHANNEL_ID = "daily_checkin";
    private static final String ALARM_CHANNEL_ID = "sleep_alarm";

    @Override
    public void onReceive(Context ctx, Intent intent) {
        boolean isAlarm = intent.getAction() != null && intent.getAction().equals("com.healen.app.ALARM");
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        String channelId;
        String channelName;
        String title;
        String text;
        int id;
        if (isAlarm) {
            channelId = ALARM_CHANNEL_ID;
            channelName = "Sleep Alarm";
            title = "Time to wake up";
            text = "Your Healen alarm is ringing. Rise and shine!";
            id = 1002;
        } else {
            channelId = CHANNEL_ID;
            channelName = "Daily Check-in";
            title = "Time to check in";
            text = "How's your streak doing today?";
            id = 1001;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(
                    channelId, channelName,
                    isAlarm ? NotificationManager.IMPORTANCE_MAX : NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription(isAlarm ? "Wake-up alarm for sleep mode" : "Daily reminder to check in with your streak");
            if (isAlarm) {
                // A real alarm: loud system alarm tone, repeated vibration.
                ch.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM),
                        new AudioAttributes.Builder()
                                .setUsage(AudioAttributes.USAGE_ALARM)
                                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                                .build());
                ch.enableVibration(true);
                ch.setVibrationPattern(new long[]{0, 800, 400, 800, 400, 1200});
            } else {
                ch.enableVibration(true);
            }
            nm.createNotificationChannel(ch);
        }

        Intent open = new Intent(ctx, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(ctx, 0, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? new Notification.Builder(ctx, channelId)
                : new Notification.Builder(ctx);
        Notification n = builder
                .setContentTitle(title)
                .setContentText(text)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentIntent(pi)
                .setAutoCancel(true)
                .build();
        nm.notify(id, n);

        if (isAlarm) return; // one-shot alarm — do not reschedule

        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am != null) {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,
                    System.currentTimeMillis() + AlarmManager.INTERVAL_DAY,
                    nextPending(ctx));
        }
    }

    private PendingIntent nextPending(Context ctx) {
        Intent i = new Intent(ctx, ReminderReceiver.class);
        return PendingIntent.getBroadcast(ctx, LocalNotificationPlugin.REQ_CODE, i,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
