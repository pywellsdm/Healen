import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getStreakBreakdown } from "@/lib/streakUtils";

export default function StreakCounter({ startDate }) {
  const [breakdown, setBreakdown] = useState(() => getStreakBreakdown(startDate));

  useEffect(() => {
    const interval = setInterval(() => {
      setBreakdown(getStreakBreakdown(startDate));
    }, 1000);
    return () => clearInterval(interval);
  }, [startDate]);

  const units = [
    { label: "Days", value: breakdown.days },
    { label: "Hours", value: breakdown.hours },
    { label: "Mins", value: breakdown.minutes },
    { label: "Secs", value: breakdown.seconds },
  ];

  return (
    <div className="flex flex-col items-center">
      {/* Large day counter — on a subtle opaque glass card so it stays crisp
          and readable no matter how light or busy the wallpaper is */}
      <div className="relative mb-6 w-full">
        <div className="absolute -inset-2 bg-indigo-500/15 blur-3xl rounded-full" />
        <div className="relative rounded-3xl bg-slate-950/55 backdrop-blur-md border border-white/10 px-6 py-5 text-center shadow-xl">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={breakdown.days}
              initial={{ y: 14, opacity: 0, scale: 1.08 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -14, opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="bg-gradient-to-br from-white to-indigo-300 light:from-slate-800 light:to-indigo-500 bg-clip-text text-transparent"
              style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.6))" }}
            >
              <span className="text-7xl font-bold tabular-nums">{breakdown.days}</span>
            </motion.div>
          </AnimatePresence>
          <p className="text-sm uppercase tracking-[0.3em] text-indigo-200 font-semibold mt-1">
            {breakdown.days === 1 ? "Day Clean" : "Days Clean"}
          </p>
        </div>
      </div>

      {/* Time breakdown */}
      <div className="grid grid-cols-3 gap-3 w-full">
        {units.slice(1).map((unit) => (
          <div
            key={unit.label}
            className="bg-white/5 border border-white/10 rounded-xl py-3 px-2 text-center backdrop-blur-sm"
          >
            <div className="text-2xl font-bold tabular-nums text-white">
              {String(unit.value).padStart(2, "0")}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 mt-0.5">
              {unit.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}