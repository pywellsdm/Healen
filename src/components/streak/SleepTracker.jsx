import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Moon, Sunrise, Check, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  startSleepSession,
  wakeUp,
  abandonSleepSession,
  sleepElapsedMin,
  formatDuration,
  SLEEP_MAX_MINUTES,
  SLEEP_STALE_MINUTES,
} from "@/lib/streakUtils";

export default function SleepTracker({ streak, onRefresh }) {
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const sleeping = !!streak?.sleep_session_start;
  const elapsed = sleeping ? sleepElapsedMin(streak) : 0;
  const overMax = sleeping && elapsed >= SLEEP_MAX_MINUTES;

  useEffect(() => {
    if (!sleeping) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [sleeping]);

  // Recover abandoned sessions (e.g. started yesterday, never ended) so the
  // "Start Sleep" button always works instead of showing a stale timer.
  useEffect(() => {
    if (!sleeping) return;
    if (elapsed < SLEEP_STALE_MINUTES) return;
    (async () => {
      try {
        await abandonSleepSession(streak);
        if (onRefresh) await onRefresh();
      } catch (e) {
        /* ignore */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resultTimer = useRef(null);
  const showResult = (msg, kind) => {
    setResult({ msg, kind });
    clearTimeout(resultTimer.current);
    resultTimer.current = setTimeout(() => setResult(null), 6000);
  };

  const handleStart = async () => {
    setBusy(true);
    try {
      await startSleepSession(streak);
      if (onRefresh) await onRefresh();
    } catch (e) {
      showResult(e.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const handleWake = async () => {
    setBusy(true);
    try {
      const { status, durationMin, streak: next } = await wakeUp(streak);
      if (onRefresh) await onRefresh();
      setNow(Date.now());
      if (status === "success") {
        showResult(`Nice — ${formatDuration(durationMin)} of real rest. Your sleep streak is now ${next.sleep_current_streak_days} night${next.sleep_current_streak_days === 1 ? "" : "s"}.`, "success");
      } else if (status === "short") {
        showResult(`${formatDuration(durationMin)} is under 7 hours — it doesn't count toward your streak. Try to get a full night tonight.`, "warn");
      } else if (status === "overslept") {
        showResult(`${formatDuration(durationMin)} is over 9 hours — oversleeping isn't healthy and doesn't count. Aim for 7-9 hours.`, "warn");
      }
    } catch (e) {
      showResult(e.message, "error");
    } finally {
      setBusy(false);
    }
  };

  if (!streak) return null;

  if (sleeping) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
            <Moon className="w-5 h-5 text-indigo-300" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Sleeping now</p>
            <p className="text-xs text-slate-400">You started at {new Date(streak.sleep_session_start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
          </div>
        </div>

        <div className="text-center py-2 mb-3">
          <p className={cn("text-4xl font-black tabular-nums", overMax ? "text-rose-400" : "text-white")}>
            {formatDuration(elapsed)}
          </p>
          <p className="text-xs text-slate-400 mt-1">time asleep</p>
        </div>

        {overMax && (
          <div className="flex items-center gap-2 mb-3 rounded-xl bg-rose-950/30 border border-rose-800/30 px-3 py-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <p className="text-[11px] text-rose-300">Over 9 hours. Oversleeping won't count toward your streak — time to get up.</p>
          </div>
        )}

        <motion.button
          onClick={handleWake}
          disabled={busy}
          whileTap={{ scale: 0.97 }}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Sunrise className="w-4 h-4" />
          {busy ? "Waking up..." : "I woke up"}
        </motion.button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
          <Moon className="w-5 h-5 text-indigo-300" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">Sleep Tonight</p>
          <p className="text-xs text-slate-400">Tap before bed — wake up when you're done</p>
        </div>
      </div>

      <p className="text-xs text-slate-400 mb-4 leading-relaxed">
        Sleep <span className="text-slate-200 font-medium">7-9 hours</span> to count toward your streak.
        Under 7 hours resets it; over 9 is too much.
      </p>

      {typeof streak?.sleep_last_duration_min === "number" && (
        <p className="text-xs text-slate-400 mb-4">
          Last night: <span className="text-white font-medium">{formatDuration(streak.sleep_last_duration_min)}</span>
          {streak.sleep_total_resets > 0 ? ` · ${streak.sleep_total_resets} missed night${streak.sleep_total_resets === 1 ? "" : "s"}` : ""}
        </p>
      )}

      <motion.button
        onClick={handleStart}
        disabled={busy}
        whileTap={{ scale: 0.97 }}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        <Moon className="w-4 h-4" />
        {busy ? "Starting..." : "Start Sleep"}
      </motion.button>

      {result && (
        <p className={cn(
          "mt-3 text-[11px] leading-relaxed",
          result.kind === "success" ? "text-emerald-400/80" : result.kind === "error" ? "text-rose-400/80" : "text-amber-400/80"
        )}>
          <Check className="w-3 h-3 inline mr-1" />
          {result.msg}
        </p>
      )}
    </div>
  );
}
