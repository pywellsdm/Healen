import { useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { db } from "@/lib/store";
import { calculateStreakDays } from "@/lib/streakUtils";

const MOODS = [
  { key: "great", label: "Great", emoji: "💪", color: "emerald" },
  { key: "good", label: "Good", emoji: "🙂", color: "green" },
  { key: "okay", label: "Okay", emoji: "😐", color: "yellow" },
  { key: "struggling", label: "Hard", emoji: "😤", color: "orange" },
  { key: "hard", label: "Crisis", emoji: "🔥", color: "rose" },
];

export default function DailyCheckIn({ streak, onCompleted }) {
  const [selectedMood, setSelectedMood] = useState(null);
  const [urgeLevel, setUrgeLevel] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const alreadyCheckedIn = streak?.last_checkin_date === today;

  const handleSubmit = async () => {
    if (!selectedMood) return;
    setSubmitting(true);
    try {
      await db.entities.CheckIn.create({
        checkin_date: today,
        mood: selectedMood,
        urge_level: urgeLevel,
        checkin_type: "daily",
      });

      // Update streak — increment counters only after the first full clean day
      // (a check-in on the streak start day isn't a completed day yet)
      const newGoalStreak = (streak.daily_goal_streak || 0) + 1;
      const newLongest = Math.max(streak.longest_streak_days || 0, newGoalStreak);
      await db.entities.Streak.update(streak.id, {
        last_checkin_date: today,
        daily_goal_streak: calculateStreakDays(streak.streak_start_date) > 0 ? newGoalStreak : 0,
        current_streak_days: calculateStreakDays(streak.streak_start_date),
        longest_streak_days: calculateStreakDays(streak.streak_start_date) > 0 ? newLongest : streak.longest_streak_days,
        total_clean_days:
          calculateStreakDays(streak.streak_start_date) > 0
            ? (streak.total_clean_days || 0) + 1
            : streak.total_clean_days,
      });

      setDone(true);
      onCompleted?.();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  if (done || alreadyCheckedIn) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <Check className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-emerald-200">Checked in for today</p>
          <p className="text-xs text-emerald-400/70">See you tomorrow. One day at a time.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">Daily Check-In</h3>
        <span className="text-xs text-slate-500">{today}</span>
      </div>

      <p className="text-xs text-slate-400 mb-3">How are you feeling today?</p>
      <div className="flex justify-between gap-1 mb-4">
        {MOODS.map((m) => (
          <motion.button
            key={m.key}
            onClick={() => setSelectedMood(m.key)}
            whileTap={{ scale: 0.92 }}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border transition-all",
              selectedMood === m.key
                ? "bg-white/10 border-white/30 scale-105"
                : "bg-white/[0.02] border-white/5"
            )}
          >
            <span className="text-xl">{m.emoji}</span>
            <span className={cn("text-[10px] font-medium", selectedMood === m.key ? "text-white" : "text-slate-500")}>
              {m.label}
            </span>
          </motion.button>
        ))}
      </div>

      <div className="mb-4">
        <div className="flex justify-between mb-1">
          <span className="text-xs text-slate-400">Urge level today</span>
          <span className="text-xs text-indigo-300 font-medium">{urgeLevel}/10</span>
        </div>
        <input
          type="range"
          min="0"
          max="10"
          value={urgeLevel}
          onChange={(e) => setUrgeLevel(Number(e.target.value))}
          className="w-full accent-indigo-500"
        />
      </div>

      <motion.button
        onClick={handleSubmit}
        disabled={!selectedMood || submitting}
        whileTap={selectedMood ? { scale: 0.97 } : undefined}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium text-sm disabled:opacity-40 hover:opacity-90 transition-opacity"
      >
        {submitting ? "Saving..." : "Complete Check-In"}
      </motion.button>
    </div>
  );
}