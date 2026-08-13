import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BellRing, Sunrise, Pause } from "lucide-react";
import {
  getAlarmSettings,
  saveAlarmSettings,
  getAlarmAudioSrc,
  isAlarmDue,
  alarmTargetMs,
  formatAlarmTime,
  durationLabel,
} from "@/lib/alarm";
import { ensureStreakRecord } from "@/lib/streakUtils";
import { LocalNotification } from "@/lib/localNotifications";
import { IS_NATIVE } from "@/lib/appInfo";

const SNOOZE_MINUTES = 5;
const STREAK_POLL_MS = 15000;

const AlarmContext = createContext(null);

export function useAlarm() {
  return useContext(AlarmContext);
}

export default function AlarmSystem({ children }) {
  const [settings, setSettings] = useState(null);
  const [streak, setStreak] = useState(null);
  const [ringing, setRinging] = useState(false);
  const [snoozeUntil, setSnoozeUntil] = useState(null);
  const settingsRef = useRef(null);
  const streakRef = useRef(null);
  const snoozeUntilRef = useRef(null);
  const audioRef = useRef(null);
  const ringingRef = useRef(false);

  useEffect(() => {
    ringingRef.current = ringing;
  }, [ringing]);

  const refresh = useCallback(async () => {
    try {
      const [s, st] = await Promise.all([getAlarmSettings(), ensureStreakRecord()]);
      settingsRef.current = s;
      streakRef.current = st;
      setSettings(s);
      setStreak(st);
    } catch (e) {
      /* not authenticated yet — skip */
    }
  }, []);

  const save = useCallback(async (patch) => {
    await saveAlarmSettings(patch);
    const next = { ...settingsRef.current, ...patch };
    settingsRef.current = next;
    setSettings(next);
  }, []);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Keep the sleep session fresh so the alarm knows when the night starts/ends
  useEffect(() => {
    const poll = () => {
      ensureStreakRecord()
        .then((st) => {
          streakRef.current = st;
          setStreak(st);
        })
        .catch(() => {});
    };
    const t = setInterval(poll, STREAK_POLL_MS);
    const onVisible = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [refresh]);

  // Keep refs in sync
  useEffect(() => {
    snoozeUntilRef.current = snoozeUntil;
  }, [snoozeUntil]);

  const getAudio = () => {
    if (!audioRef.current) audioRef.current = new Audio();
    return audioRef.current;
  };

  const stopAudio = useCallback(() => {
    const a = getAudio();
    a.pause();
    a.currentTime = 0;
  }, []);

  const ring = useCallback(async () => {
    if (IS_NATIVE) {
      LocalNotification.cancelAlarm().catch(() => {});
    }
    const audio = getAudio();
    try {
      audio.src = await getAlarmAudioSrc(settingsRef.current);
    } catch (e) {
      audio.src = "/audio/default-ringtone.mp3";
    }
    audio.loop = true;
    audio.volume = 1;
    audio.play().catch(() => {});
    setSnoozeUntil(null);
    setRinging(true);
  }, []);

  const dismiss = useCallback(async () => {
    stopAudio();
    setRinging(false);
    // Fired for this session — it won't ring again tonight.
    const session = streakRef.current?.sleep_session_start;
    if (session) {
      try {
        await save({ lastFiredSession: session });
      } catch (e) {
        /* ignore */
      }
    }
  }, [save, stopAudio]);

  const snooze = useCallback(() => {
    stopAudio();
    setSnoozeUntil(Date.now() + SNOOZE_MINUTES * 60000);
    setRinging(false);
  }, [stopAudio]);

  // Native backup: schedule a one-shot system alarm at the alarm target so it
  // rings even if the app is in the background or the screen is locked.
  const sessionStart = streak?.sleep_session_start;
  useEffect(() => {
    if (!IS_NATIVE) return;
    if (settings?.enabled && sessionStart) {
      LocalNotification.scheduleAlarmOnce({
        timestamp: alarmTargetMs(sessionStart, settings.durationMin),
        session: sessionStart,
      }).catch(() => {});
    } else {
      LocalNotification.cancelAlarm().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [IS_NATIVE, settings?.enabled, settings?.durationMin, sessionStart]);

  // If the native full-screen alarm was dismissed (app was backgrounded), mark
  // that session as fired so the in-app alarm doesn't ring again when reopened.
  useEffect(() => {
    if (!IS_NATIVE) return;
    LocalNotification.getAlarmDismissedSession()
      .then((res) => {
        const dismissed = res?.session;
        const session = streakRef.current?.sleep_session_start;
        if (dismissed && session && dismissed === session) {
          return save({ lastFiredSession: session }).then(() =>
            LocalNotification.clearAlarmDismissed()
          );
        }
        return null;
      })
      .catch(() => {});
  }, [IS_NATIVE, sessionStart, save]);

  // Watcher: every second, check whether the alarm should ring.
  useEffect(() => {
    const t = setInterval(() => {
      const s = settingsRef.current;
      const st = streakRef.current;
      if (!s || ringingRef.current) return;
      if (snoozeUntilRef.current && Date.now() < snoozeUntilRef.current) return;
      if (!isAlarmDue(s, st)) return;
      ring();
    }, 1000);
    return () => clearInterval(t);
  }, [ring]);

  const value = {
    settings,
    streak,
    refresh,
    save,
    dismiss,
    snooze,
    ringing,
  };

  return (
    <AlarmContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {ringing && (
          <AlarmOverlay
            settings={settings}
            streak={streak}
            onDismiss={dismiss}
            onSnooze={snooze}
          />
        )}
      </AnimatePresence>
    </AlarmContext.Provider>
  );
}

function AlarmOverlay({ settings, streak, onDismiss, onSnooze }) {
  const ringTime = formatAlarmTime(streak?.sleep_session_start, settings?.durationMin);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[400] overflow-hidden bg-gradient-to-b from-indigo-950 via-[#0E0F1A] to-black flex items-center justify-center p-6"
    >
      {/* pulsing rings behind the bell */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="absolute w-72 h-72 rounded-full border border-indigo-400/30 animate-ping-slow" />
        <div className="absolute w-56 h-56 rounded-full border border-purple-400/30 animate-ping-slow" style={{ animationDelay: "0.6s" }} />
        <div className="absolute w-40 h-40 rounded-full border border-indigo-300/40 animate-ping-slow" style={{ animationDelay: "1.2s" }} />
      </div>

      <div className="relative text-center text-white z-10 w-full max-w-xs">
        <motion.div
          initial={{ scale: 0.4, rotate: -12 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 14 }}
          className="w-24 h-24 mx-auto mb-6 rounded-full bg-indigo-500/20 border-2 border-indigo-300/50 flex items-center justify-center shadow-2xl shadow-indigo-500/40"
        >
          <BellRing className="w-12 h-12 text-indigo-200 animate-glow" />
        </motion.div>

        <p className="text-[10px] uppercase tracking-[0.3em] text-indigo-300/80 font-semibold mb-1">
          Good morning
        </p>
        <h2 className="text-3xl font-black text-white mb-2">Time to wake up</h2>
        <p className="text-sm text-slate-300 mb-1">Your Healen alarm is ringing</p>
        <p className="text-xs text-slate-500 mb-8">
          {ringTime ? `Ringing at ${ringTime} — ${durationLabel(settings?.durationMin)} of rest` : "Rise and shine"}
        </p>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onSnooze}
            className="py-3.5 rounded-xl bg-white/10 border border-white/15 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-white/15 transition-colors"
          >
            <Pause className="w-4 h-4" />
            Snooze 5 min
          </button>
          <button
            onClick={onDismiss}
            className="py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            <Sunrise className="w-4 h-4" />
            Dismiss
          </button>
        </div>
      </div>
    </motion.div>
  );
}
