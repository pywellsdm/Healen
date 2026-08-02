import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ensureStreakRecord, updateStreak } from "@/lib/streakUtils";
import { Sparkles, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import Background from "@/components/Background";

const EASE = [0.22, 1, 0.36, 1];

const GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say"];
const ATTEMPTS = ["Never tried", "1–2 times", "3–5 times", "Lost count"];
const GOALS = [7, 14, 30, 45, 60, 90, 180, 365];

const STEPS = [
  { key: "gender", title: "Let's personalize your journey", sub: "First, a few quick questions to build your plan." },
  { key: "age", title: "How old are you?", sub: "This helps us tailor the right advice for you." },
  { key: "attempts", title: "How many times have you tried quitting?", sub: "Every attempt counts — it's all part of the path." },
  { key: "goal", title: "What's your goal streak?", sub: "We'll help you get there, one day at a time." },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [attempts, setAttempts] = useState("");
  const [goal, setGoal] = useState(30);
  const [saving, setSaving] = useState(false);

  const current = STEPS[step];

  const canNext = () => {
    if (current.key === "gender") return !!gender;
    if (current.key === "age") return /^\d{1,3}$/.test(age.trim());
    if (current.key === "attempts") return !!attempts;
    return true;
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else finish();
  };

  const finish = async () => {
    setSaving(true);
    try {
      const s = await ensureStreakRecord();
      await updateStreak(s.id, {
        gender,
        age: parseInt(age, 10) || null,
        times_tried: attempts,
        current_goal_days: goal,
        onboarding_completed: true,
      });
      navigate("/", { replace: true });
    } catch (e) {
      console.error(e);
      setSaving(false);
    }
  };

  return (
    <div
      className="min-h-screen relative overflow-hidden flex items-center justify-center px-4 py-10"
      style={{ background: "var(--app-bg)", color: "var(--text-primary)" }}
    >
      <Background />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/40 mb-4">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-indigo-300/80 mb-2">UnGoonify</p>
          <AnimatePresence mode="wait">
            <motion.div key={current.key}>
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="text-2xl font-bold text-white"
              >
                {current.title}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="text-slate-400 mt-1.5 text-sm"
              >
                {current.sub}
              </motion.p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="glass-strong glass-sheen rounded-3xl p-6 shadow-2xl shadow-black/50">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.key}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              {current.key === "gender" && (
                <div className="space-y-2">
                  {GENDERS.map((g) => (
                    <button
                      key={g}
                      onClick={() => setGender(g)}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left",
                        gender === g ? "bg-indigo-500/15 border-indigo-400/40" : "bg-white/5 border-white/5"
                      )}
                    >
                      <span className={cn("text-sm font-medium", gender === g ? "text-indigo-200" : "text-slate-300")}>{g}</span>
                      <span className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", gender === g ? "border-indigo-400 bg-indigo-500/30" : "border-white/20")}>
                        {gender === g && <div className="w-2 h-2 rounded-full bg-indigo-300" />}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {current.key === "age" && (
                <div>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="Your age"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center text-2xl font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-400/50"
                  />
                </div>
              )}

              {current.key === "attempts" && (
                <div className="space-y-2">
                  {ATTEMPTS.map((a) => (
                    <button
                      key={a}
                      onClick={() => setAttempts(a)}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left",
                        attempts === a ? "bg-indigo-500/15 border-indigo-400/40" : "bg-white/5 border-white/5"
                      )}
                    >
                      <span className={cn("text-sm font-medium", attempts === a ? "text-indigo-200" : "text-slate-300")}>{a}</span>
                      <span className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", attempts === a ? "border-indigo-400 bg-indigo-500/30" : "border-white/20")}>
                        {attempts === a && <div className="w-2 h-2 rounded-full bg-indigo-300" />}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {current.key === "goal" && (
                <div>
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {GOALS.map((g) => (
                      <button
                        key={g}
                        onClick={() => setGoal(g)}
                        className={cn(
                          "py-3 rounded-xl text-sm font-bold border transition-all",
                          goal === g ? "bg-indigo-500/20 border-indigo-400/50 text-indigo-200" : "bg-white/5 border-white/5 text-slate-400"
                        )}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                  <p className="text-center text-[11px] text-slate-500">
                    {goal === 90 ? "90 days — the full brain rewiring milestone." : goal === 30 ? "Survive the hardest month." : `${goal} days of mastery.`}
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center gap-2 mt-6">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="w-12 h-12 rounded-full bg-white/5 border border-white/10 text-slate-300 flex items-center justify-center shrink-0 hover:bg-white/10 transition-colors"
                aria-label="Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={next}
              disabled={!canNext() || saving}
              className="flex-1 h-12 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {saving ? (
                <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving...</>
              ) : step === STEPS.length - 1 ? (
                <><Check className="w-4 h-4" /> Start my journey</>
              ) : (
                <><ArrowRight className="w-4 h-4" /> Next</>
              )}
            </button>
          </div>

          <div className="flex justify-center gap-1.5 mt-4">
            {STEPS.map((s, i) => (
              <span key={s.key} className={cn("h-1.5 rounded-full transition-all", i === step ? "w-6 bg-indigo-400" : "w-1.5 bg-white/20", i < step && "bg-indigo-400/50")} />
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
