import { ensureStreakRecord } from "@/lib/streakUtils";
import { LocalNotification } from "@/lib/localNotifications";
import { IS_NATIVE } from "@/lib/appInfo";

let timer = null;
let lastFired = "";

const TICK_MS = 30000;

export async function requestNotificationPermission() {
  if (IS_NATIVE) {
    try {
      await LocalNotification.requestPermission();
      return "granted";
    } catch (e) {
      return "denied";
    }
  }
  if (!("Notification" in window)) return "unsupported";
  return Notification.requestPermission();
}

async function nativeSchedule() {
  try {
    const s = await ensureStreakRecord();
    if (s.daily_reminder_enabled) {
      const [h, m] = (s.daily_reminder_time || "09:00").split(":").map(Number);
      await LocalNotification.scheduleDaily({ hour: h, minute: m });
    } else {
      await LocalNotification.cancel();
    }
  } catch (e) {
    console.error(e);
  }
}

export async function rescheduleReminder() {
  if (IS_NATIVE) await nativeSchedule();
}

async function checkReminder() {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  let s;
  try {
    s = await ensureStreakRecord();
  } catch (e) {
    return;
  }
  if (!s.daily_reminder_enabled) return;

  const now = new Date();
  const hm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const target = s.daily_reminder_time || "09:00";
  const stamp = `${now.toDateString()}:${hm}`;
  if (hm !== target || lastFired === stamp) return;
  lastFired = stamp;

  try {
    new Notification("Healen", {
      body: "Time to check in. How's your streak doing today?",
      tag: "daily-checkin",
    });
  } catch (e) {
    /* ignore */
  }
}

export function startReminderWatcher() {
  if (IS_NATIVE) {
    nativeSchedule();
    return;
  }
  if (timer) return;
  lastFired = "";
  timer = setInterval(checkReminder, TICK_MS);
}

export function stopReminderWatcher() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
