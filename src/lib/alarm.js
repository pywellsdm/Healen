import { db } from "@/lib/store";
import { ensureStreakRecord } from "@/lib/streakUtils";

export const DEFAULT_ALARM_AUDIO = "/audio/default-ringtone.mp3";

// Healthy sleep window: the alarm can only wake you 7-9 hours after sleep starts.
export const MIN_ALARM_MINUTES = 7 * 60; // 420
export const MAX_ALARM_MINUTES = 9 * 60; // 540
export const DEFAULT_ALARM_MINUTES = 8 * 60; // 480
export const ALARM_STALE_MINUTES = 20 * 60; // a session older than 20h never rings

export function clampDuration(min) {
  const n = Number(min);
  if (!Number.isFinite(n)) return DEFAULT_ALARM_MINUTES;
  return Math.min(MAX_ALARM_MINUTES, Math.max(MIN_ALARM_MINUTES, Math.round(n)));
}

// ---- settings storage (kept on the Streak record like the rest of settings) ----
export async function getAlarmSettings() {
  const s = await ensureStreakRecord();
  return {
    enabled: !!s.alarm_enabled,
    durationMin: clampDuration(s.alarm_duration_min ?? DEFAULT_ALARM_MINUTES),
    sound: s.alarm_sound || "default", // "default" | "custom"
    lastFiredSession: s.alarm_last_fired_session || null,
  };
}

export async function saveAlarmSettings(settings) {
  const s = await ensureStreakRecord();
  const update = {};
  if (settings.enabled !== undefined) update.alarm_enabled = !!settings.enabled;
  if (settings.durationMin !== undefined) update.alarm_duration_min = clampDuration(settings.durationMin);
  if (settings.sound !== undefined) update.alarm_sound = settings.sound;
  if (settings.lastFiredSession !== undefined) update.alarm_last_fired_session = settings.lastFiredSession;
  return db.entities.Streak.update(s.id, update);
}

// ---- custom audio (IndexedDB so even larger ringtones store reliably) ----
const AUDIO_DB_NAME = "healen-alarm";
const AUDIO_STORE = "audio";
const AUDIO_KEY = "custom-alarm";

function openAudioDb() {
  return new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(AUDIO_DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(AUDIO_STORE)) {
          req.result.createObjectStore(AUDIO_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch (e) {
      reject(e);
    }
  });
}

export async function readCustomAudio() {
  try {
    const idb = await openAudioDb();
    return await new Promise((resolve) => {
      const tx = idb.transaction(AUDIO_STORE, "readonly");
      const req = tx.objectStore(AUDIO_STORE).get(AUDIO_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

export async function saveCustomAudio(dataUrl) {
  try {
    const idb = await openAudioDb();
    await new Promise((resolve, reject) => {
      const tx = idb.transaction(AUDIO_STORE, "readwrite");
      tx.objectStore(AUDIO_STORE).put(dataUrl, AUDIO_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return true;
  } catch (e) {
    console.error("Failed to store custom alarm audio", e);
    return false;
  }
}

export async function clearCustomAudio() {
  try {
    const idb = await openAudioDb();
    await new Promise((resolve) => {
      const tx = idb.transaction(AUDIO_STORE, "readwrite");
      tx.objectStore(AUDIO_STORE).delete(AUDIO_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (e) {
    /* ignore */
  }
}

export async function hasCustomAudio() {
  return !!(await readCustomAudio());
}

export async function getAlarmAudioSrc(settings) {
  if (settings?.sound === "custom") {
    const custom = await readCustomAudio();
    if (custom) return custom;
  }
  return DEFAULT_ALARM_AUDIO;
}

// ---- timing ----
// Absolute ms the alarm should ring for a given sleep session.
export function alarmTargetMs(sleepStartIso, durationMin) {
  return new Date(new Date(sleepStartIso).getTime() + clampDuration(durationMin) * 60000).getTime();
}

// Is the alarm due RIGHT NOW for this streak + settings?
// It only applies to an active sleep session, only fires once per session, and
// never rings for an abandoned (stale) session.
export function isAlarmDue(settings, streak, now = new Date()) {
  if (!settings?.enabled) return false;
  const session = streak?.sleep_session_start;
  if (!session) return false;
  const start = new Date(session).getTime();
  if (now.getTime() - start > ALARM_STALE_MINUTES * 60000) return false;
  if (settings.lastFiredSession === session) return false;
  return now.getTime() >= alarmTargetMs(session, settings.durationMin);
}

export function minutesUntilAlarm(settings, streak, now = new Date()) {
  if (!settings?.enabled || !streak?.sleep_session_start) return null;
  const target = alarmTargetMs(streak.sleep_session_start, settings.durationMin);
  return Math.max(0, Math.round((target - now.getTime()) / 60000));
}

export function formatAlarmTime(sleepStartIso, durationMin) {
  if (!sleepStartIso) return null;
  return new Date(alarmTargetMs(sleepStartIso, durationMin)).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function durationLabel(min) {
  const h = clampDuration(min) / 60;
  return `${h} hours`;
}
