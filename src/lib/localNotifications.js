import { registerPlugin } from "@capacitor/core";

export const LocalNotification = registerPlugin("LocalNotification", {
  requestPermission: () => Promise.resolve("denied"),
  scheduleDaily: () => Promise.resolve({ scheduled: false }),
  cancel: () => Promise.resolve(),
  scheduleAlarmOnce: () => Promise.resolve({ scheduled: false }),
  cancelAlarm: () => Promise.resolve(),
});
