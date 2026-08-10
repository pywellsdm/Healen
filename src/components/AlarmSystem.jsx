import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BellRing, Sunrise, Pause } from "lucide-react";
import {
  getAlarmSettings,
  saveAlarmSettings,
  getAlarmAudioSrc,
  isAlarmDue,
  alreadyFired,
  todayStr,
  formatAlarmTime,
} from "@/lib/alarm";
import { LocalNotification } from "@/lib/localNotifications";
import { IS_NATIVE } from "@/lib/appInfo";

const SNOOZE_MINUTES = 5;

const AlarmContext = createContext(null);

export function useAlarm() {
  return useContext(AlarmContext);
}

export default function AlarmSystem({ children }) {
  const [settings, setSettings] = useState(null);
  const [ringing, setRinging] = useState(false);
  const [snoozeUntil, setSnoozeUntil] = useState(null);
  const settingsRef = useRef(null);
  const snoozeUntilRef = useRef(null);
  const audioRef = useRef(null);
  const ringingRef = useRef(false);

  useEffect(() => {
    ringingRef.current = ringing;
  }, [ringing]);

  const refresh = useCallback(async () => {
    try {
      const s = await getAlarmSettings();
      settingsRef.current = s;
      setSettings(s);
    } catch (e) {
      /* not authenticated yet — skip */
    }
  }, []);

  const save = useCallback(async (patch) => {
    const updated = await saveAlarmSettings(patch);
    const next = { ...settingsRef.current, ...patch };
    settingsRef.current = next;
    setSettings(next);
    return updated;
  }, []);

  // Initial load
  useEffect(() => {
    refresh();
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

  const ring = useCallback(() => {
    if (IS_NATIVE) {
      LocalNotification.cancelAlarm().catch(() => {});
    }
    const audio = getAudio();
    audio.src = getAlarmAudioSrc(settingsRef.current);
    audio.loop = true;
    audio.volume = 1;
    audio.play().catch(() => {});
    setSnoozeUntil(null);
    setRinging(true);
  }, []);

  const dismiss = useCallback(async () => {
    stopAudio();
    setRinging(false);
    // Test mode: mark fired for today so it won't re-ring until re-armed.
    try {
      await save({ lastFired: todayStr() });
    } catch (e) {
      /* ignore */
    }
  }, [save, stopAudio]);

  const snooze = useCallback(() => {
    stopAudio();
    setSnoozeUntil(Date.now() + SNOOZE_MINUTES * 60000);
    setRinging(false);
  }, [stopAudio]);

  // Re-arm helper (used by UI toggles): clears today's fired marker.
  const rearm = useCallback(async () => {
    try {
      await save({ enabled: true, lastFired: null });
    } catch (e) {
      /* ignore */
    }
  }, [save]);

  // Native backup: schedule a one-shot system notification at the alarm time
  // so the alarm still rings even if the app is in the background.
  useEffect(() => {
    if (!settings || !IS_NATIVE) return;
    if (settings.enabled) {
      const [h, m] = String(settings.time || "07:00").split(":").map(Number);
      const d = new Date();
      d.setHours(h || 0, m || 0, 0, 0);
      if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
      LocalNotification.scheduleAlarmOnce(d.getTime()).catch(() => {});
    } else {
      LocalNotification.cancelAlarm().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.enabled, settings?.time]);

  // Watcher: every second, check whether the alarm should ring.
  useEffect(() => {
    const t = setInterval(() => {
      const s = settingsRef.current;
      if (!s || !s.enabled || ringingRef.current) return;
      if (alreadyFired(s)) return;
      if (snoozeUntilRef.current && Date.now() < snoozeUntilRef.current) return;
      if (!isAlarmDue(s)) return;
      ring();
    }, 1000);
    return () => clearInterval(t);
  }, [ring]);

  const triggerNow = useCallback(() => {
    ring();
  }, [ring]);

  const value = {
    settings,
    refresh,
    save,
    rearm,
    triggerNow,
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
            time={settings?.time}
            onDismiss={dismiss}
            onSnooze={snooze}
          />
        )}
      </AnimatePresence>
    </AlarmContext.Provider>
  );
}

function AlarmOverlay({ time, onDismiss, onSnooze }) {
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
          {time ? `Set for ${formatAlarmTime(time)}` : "Rise and shine"}
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
