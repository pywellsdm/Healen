import { useState } from "react";
import { motion } from "framer-motion";
import { X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { TRIGGER_LABELS } from "@/lib/motivation";
import { db } from "@/lib/store";
import { calculateStreakDays } from "@/lib/streakUtils";

const TRIGGERS = Object.keys(TRIGGER_LABELS);
const MOODS = [
  { key: "ashamed", label: "Ashamed", emoji: "😞" },
  { key: "disappointed", label: "Disappointed", emoji: "😔" },
  { key: "neutral", label: "Neutral", emoji: "😐" },
  { key: "hopeful", label: "Hopeful", emoji: "🙂" },
  { key: "determined", label: "Determined", emoji: "😤" },
];
const TIMES = [
  { key: "morning", label: "Morning" },
  { key: "afternoon", label: "Afternoon" },
  { key: "evening", label: "Evening" },
  { key: "night", label: "Night" },
];

export default function RelapseModal({ open, onClose, streak, onCompleted }) {
  const [step, setStep] = useState(0);
  const [trigger, setTrigger] = useState("boredom");
  const [mood, setMood] = useState("disappointed");
  const [timeOfDay, setTimeOfDay] = useState("night");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const daysLost = calculateStreakDays(streak?.streak_start_date);
      // Record the relapse
      await db.entities.Relapse.create({
        relapse_date: now,
        trigger,
        mood,
        time_of_day: timeOfDay,
        notes,
        streak_before_relapse: daysLost,
      });

      // Reset streak
      const newLongest = Math.max(streak.longest_streak_days || 0, daysLost);
      await db.entities.Streak.update(streak.id, {
        current_streak_days: 0,
        streak_start_date: now,
        last_relapse_date: now,
        total_relapses: (streak.total_relapses || 0) + 1,
        longest_streak_days: newLongest,
        daily_goal_streak: 0,
      });

      onCompleted({ trigger, mood, streakLost: daysLost });
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setStep(0);
    setTrigger("boredom");
    setMood("disappointed");
    setTimeOfDay("night");
    setNotes("");
  };

  const close = () => {
    reset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center overflow-y-auto">
      <div className="w-full max-w-md bg-[#0E0F1A] rounded-t-3xl sm:rounded-3xl sm:border sm:border-white/10 h-full sm:h-auto sm:max-h-[92vh] overflow-y-auto pb-[env(safe-area-inset-bottom)]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            <h2 className="text-base font-semibold text-white">Report Relapse</h2>
          </div>
          <button onClick={close} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 py-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn("h-1.5 rounded-full transition-all", i <= step ? "w-6 bg-rose-400" : "w-1.5 bg-white/10")}
            />
          ))}
        </div>

        <div className="px-5 pb-5">
          {step === 0 && (
            <>
              <p className="text-sm text-slate-300 mb-3 text-center">What triggered it?</p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {TRIGGERS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTrigger(t)}
                    className={cn(
                      "px-3 py-2.5 rounded-xl text-xs font-medium border transition-all text-left",
                      trigger === t
                        ? "bg-rose-500/20 border-rose-400/50 text-rose-200"
                        : "bg-white/5 border-white/5 text-slate-400"
                    )}
                  >
                    {TRIGGER_LABELS[t]}
                  </button>
                ))}
              </div>
              <motion.button
                onClick={() => setStep(1)}
                whileTap={{ scale: 0.97 }}
                className="w-full py-3 rounded-xl bg-white/10 text-white font-medium text-sm hover:bg-white/15"
              >
                Continue
              </motion.button>
            </>
          )}

          {step === 1 && (
            <>
              <p className="text-sm text-slate-300 mb-3 text-center">How do you feel right now?</p>
              <div className="space-y-2 mb-4">
                {MOODS.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setMood(m.key)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all",
                      mood === m.key
                        ? "bg-rose-500/20 border-rose-400/50"
                        : "bg-white/5 border-white/5"
                    )}
                  >
                    <span className="text-2xl">{m.emoji}</span>
                    <span className={cn("text-sm font-medium", mood === m.key ? "text-rose-200" : "text-slate-400")}>
                      {m.label}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-sm text-slate-300 mb-2 text-center">When did it happen?</p>
              <div className="grid grid-cols-4 gap-1.5 mb-4">
                {TIMES.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTimeOfDay(t.key)}
                    className={cn(
                      "px-2 py-2 rounded-lg text-xs font-medium border transition-all",
                      timeOfDay === t.key
                        ? "bg-rose-500/20 border-rose-400/50 text-rose-200"
                        : "bg-white/5 border-white/5 text-slate-400"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <motion.button
                  onClick={() => setStep(0)}
                  whileTap={{ scale: 0.97 }}
                  className="flex-1 py-3 rounded-xl bg-white/5 text-slate-400 font-medium text-sm"
                >
                  Back
                </motion.button>
                <motion.button
                  onClick={() => setStep(2)}
                  whileTap={{ scale: 0.97 }}
                  className="flex-1 py-3 rounded-xl bg-white/10 text-white font-medium text-sm"
                >
                  Continue
                </motion.button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-sm text-slate-300 mb-3 text-center">
                Anything you want to note for next time?
              </p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What could you do differently next time? What was the warning sign?"
                className="w-full h-24 bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-slate-600 resize-none focus:outline-none focus:border-rose-400/50 mb-4"
              />
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-4">
                <p className="text-xs text-amber-200/90 leading-relaxed">
                  Your streak will reset to 0, but your {calculateStreakDays(streak?.streak_start_date)} days aren't erased —
                  they're part of your {streak?.total_clean_days || 0}+ total clean days. This is data, not failure.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 rounded-xl bg-white/5 text-slate-400 font-medium text-sm"
                >
                  Back
                </button>
                <motion.button
                  onClick={handleSubmit}
                  disabled={submitting}
                  whileTap={{ scale: 0.97 }}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 text-white font-medium text-sm disabled:opacity-50"
                >
                  {submitting ? "Recording..." : "Reset & Learn"}
                </motion.button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}