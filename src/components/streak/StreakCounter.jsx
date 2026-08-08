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
      {/* Large day counter */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/10 blur-3xl rounded-full" />
        <div className="relative text-center">
          <div className="flex items-baseline justify-center gap-2">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={breakdown.days}
                initial={{ y: 18, opacity: 0, scale: 1.1 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -18, opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 280, damping: 26 }}
                className="text-7xl font-bold bg-gradient-to-br from-white via-indigo-100 to-indigo-300 light:from-slate-800 light:via-indigo-700 light:to-indigo-500 bg-clip-text text-transparent tabular-nums"
              >
                {breakdown.days}
              </motion.span>
            </AnimatePresence>
          </div>
          <p className="text-sm uppercase tracking-[0.3em] text-indigo-300/70 font-semibold mt-1">
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