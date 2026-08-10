import { db } from "@/lib/store";
import { ensureStreakRecord } from "@/lib/streakUtils";

export const DEFAULT_ALARM_AUDIO = "/audio/default-ringtone.mp3";
export const CUSTOM_AUDIO_KEY = "healen:alarm:audio";
export const ALARM_STALE_MINUTES = 30;

// ---- settings storage (kept on the Streak record like the rest of settings) ----
export async function getAlarmSettings() {
  const s = await ensureStreakRecord();
  return {
    enabled: !!s.alarm_enabled,
    time: s.alarm_time || "07:00",
    sound: s.alarm_sound || "default", // "default" | "custom"
    lastFired: s.alarm_last_fired_date || null,
  };
}

export async function saveAlarmSettings(settings) {
  const s = await ensureStreakRecord();
  const update = {};
  if (settings.enabled !== undefined) update.alarm_enabled = !!settings.enabled;
  if (settings.time !== undefined) update.alarm_time = settings.time;
  if (settings.sound !== undefined) update.alarm_sound = settings.sound;
  if (settings.lastFired !== undefined) update.alarm_last_fired_date = settings.lastFired;
  return db.entities.Streak.update(s.id, update);
}

export function readCustomAudio() {
  try {
    return localStorage.getItem(CUSTOM_AUDIO_KEY) || null;
  } catch (e) {
    return null;
  }
}

export function saveCustomAudio(dataUrl) {
  try {
    localStorage.setItem(CUSTOM_AUDIO_KEY, dataUrl);
    return true;
  } catch (e) {
    console.error("Failed to store custom alarm audio", e);
    return false;
  }
}

export function clearCustomAudio() {
  try {
    localStorage.removeItem(CUSTOM_AUDIO_KEY);
  } catch (e) {
    /* ignore */
  }
}

export function getAlarmAudioSrc(settings) {
  if (settings?.sound === "custom") {
    const custom = readCustomAudio();
    if (custom) return custom;
  }
  return DEFAULT_ALARM_AUDIO;
}

export function isAlarmDue(settings, now = new Date()) {
  if (!settings?.enabled) return false;
  const [h, m] = String(settings.time || "07:00").split(":").map(Number);
  const target = new Date(now);
  target.setHours(h || 0, m || 0, 0, 0);
  return now.getTime() >= target.getTime();
}

// Fire only once per calendar day (test mode): once dismissed it won't re-fire
// until the user re-arms it (or the day changes).
export function alreadyFired(settings, now = new Date()) {
  if (!settings?.lastFired) return false;
  const d = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return settings.lastFired === d;
}

export function todayStr(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function formatAlarmTime(timeStr) {
  const [h, m] = String(timeStr || "07:00").split(":").map(Number);
  const hour = h % 24;
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(m || 0).padStart(2, "0")} ${ampm}`;
}

export function minutesUntilAlarm(settings, now = new Date()) {
  const [h, m] = String(settings?.time || "07:00").split(":").map(Number);
  const target = new Date(now);
  target.setHours(h || 0, m || 0, 0, 0);
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
  return Math.max(0, Math.round((target.getTime() - now.getTime()) / 60000));
}
