import { registerPlugin } from "@capacitor/core";

export const LocalNotification = registerPlugin("LocalNotification", {
  requestPermission: () => Promise.resolve("denied"),
  scheduleDaily: () => Promise.resolve({ scheduled: false }),
  cancel: () => Promise.resolve(),
});
