import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Lock, Star, X, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { MILESTONES, TIER_COLORS, getProgressToNext, getNextMilestone } from "@/lib/milestones";
import { formatRemaining } from "@/lib/streakUtils";
import {
  Sparkles, Sun, Leaf, Flame, Shield, Zap, Crown, Brain, Trophy, Gem, Award,
  Moon, CloudMoon, Stars, BedDouble, Clock, HeartPulse, Bed,
} from "lucide-react";

const ICON_MAP = {
  Sparkles, Sun, Leaf, Flame, Shield, Zap, Crown, Brain, Trophy, Gem, Award,
  Moon, CloudMoon, Stars, BedDouble, Clock, HeartPulse, Bed,
};

const TIER_LABEL = {
  start: "The Start",
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
  diamond: "Diamond",
  legend: "Legend",
};

export default function MilestoneTracker({ currentDays, progressDays, list = MILESTONES }) {
  const days = typeof progressDays === "number" ? progressDays : currentDays;
  const next = getNextMilestone(days, list);
  const progress = getProgressToNext(days, list);
  const recent = [...list].reverse().find((m) => m.days <= days) || list[0];
  const remaining = Math.max(next.days - days, 0);

  const [selected, setSelected] = useState(null);

  const open = (m) => setSelected(m);
  const close = () => setSelected(null);

  return (
    <div className="space-y-4">
      {/* Next milestone progress */}
      <motion.button
        onClick={() => open(next)}
        whileTap={{ scale: 0.98 }}
        className="w-full text-left bg-white/5 border border-white/10 rounded-2xl p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
            Next Milestone
          </span>
          <span className="text-xs text-indigo-300 font-medium">
            {remaining > 0 ? `${formatRemaining(remaining)} to go` : "Next up!"} · {Math.round(progress * 100)}%
          </span>
        </div>
        <div className="flex items-center gap-3 mb-3">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border",
            TIER_COLORS[next.tier].bg, TIER_COLORS[next.tier].border)}>
            {(() => {
              const Icon = ICON_MAP[next.icon] || Star;
              return <Icon className={cn("w-5 h-5", TIER_COLORS[next.tier].text)} />;
            })()}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">{next.title}</p>
            <p className="text-xs text-slate-400">Tap to read more</p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.max(progress * 100, progress > 0 ? 4 : 0)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] text-slate-500">
          <span>{recent.days} days</span>
          <span>{next.days} days</span>
        </div>
      </motion.button>

      {/* Milestone list */}
      <div className="space-y-2">
        {list.map((m) => {
          const achieved = days >= m.days;
          const tier = TIER_COLORS[m.tier];
          const Icon = ICON_MAP[m.icon] || Star;
          return (
            <motion.button
              key={m.days}
              onClick={() => open(m)}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "w-full flex items-center gap-3 rounded-xl p-3 border text-left transition-all",
                achieved
                  ? cn(tier.bg, tier.border, "opacity-100")
                  : "bg-white/5 border-white/10 opacity-60"
              )}
            >
              <div className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center border shrink-0",
                achieved ? cn(tier.bg, tier.border) : "bg-white/5 border-white/5"
              )}>
                {achieved ? (
                  <Icon className={cn("w-4 h-4", tier.text)} />
                ) : (
                  <Lock className="w-4 h-4 text-slate-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium truncate", achieved ? "text-white" : "text-slate-500")}>
                  {m.title}
                </p>
              </div>
              <span className={cn("text-xs font-bold tabular-nums", achieved ? tier.text : "text-slate-600")}>
                {m.days}d
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Detail modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0" onClick={close} />
            <motion.div
              initial={{ y: 24, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 24, opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
              className="relative w-full max-w-md bg-[#0E0F1A] rounded-3xl border border-white/10 p-6 max-h-[85vh] overflow-y-auto overscroll-contain"
            >
              <button
                onClick={close}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center border shrink-0",
                  TIER_COLORS[selected.tier].bg, TIER_COLORS[selected.tier].border
                )}>
                  {(() => {
                    const Icon = ICON_MAP[selected.icon] || Star;
                    return <Icon className={cn("w-7 h-7", TIER_COLORS[selected.tier].text)} />;
                  })()}
                </div>
                <div>
                  <p className={cn("text-[10px] uppercase tracking-[0.2em] font-semibold mb-0.5",
                    TIER_COLORS[selected.tier].text)}>
                    {TIER_LABEL[selected.tier] || selected.tier}
                  </p>
                  <p className="text-lg font-bold text-white">{selected.title}</p>
                </div>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed mb-4">{selected.desc}</p>

              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-xs text-slate-400 font-medium">
                  {days >= selected.days
                    ? "Achieved"
                    : `${Math.ceil(selected.days - days)} days to go`}
                </span>
                <span className="text-xs font-bold text-white tabular-nums">{selected.days} days</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    days >= selected.days
                      ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                      : "bg-gradient-to-r from-indigo-500 to-purple-500"
                  )}
                  style={{ width: `${Math.min((days / selected.days) * 100, 100)}%` }}
                />
              </div>

              {days >= selected.days ? (
                <p className="text-xs text-emerald-400/80 mt-3">You reached this milestone. Keep going.</p>
              ) : (
                <p className="text-xs text-slate-500 mt-3">
                  {Math.ceil(selected.days - days)} more day{Math.ceil(selected.days - days) === 1 ? "" : "s"} until this one unlocks.
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
