import { Lock, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { MILESTONES, TIER_COLORS, getProgressToNext, getNextMilestone } from "@/lib/milestones";
import { formatRemaining } from "@/lib/streakUtils";
import {
  Sparkles, Sun, Leaf, Flame, Shield, Zap, Crown, Brain, Trophy, Gem, Award,
} from "lucide-react";

const ICON_MAP = {
  Sparkles, Sun, Leaf, Flame, Shield, Zap, Crown, Brain, Trophy, Gem, Award,
};

export default function MilestoneTracker({ currentDays, progressDays }) {
  const days = typeof progressDays === "number" ? progressDays : currentDays;
  const next = getNextMilestone(days);
  const progress = getProgressToNext(days);
  const recent = [...MILESTONES].reverse().find((m) => m.days <= days) || MILESTONES[0];
  const remaining = Math.max(next.days - days, 0);

  return (
    <div className="space-y-4">
      {/* Next milestone progress */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
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
            <p className="text-xs text-slate-400">{next.desc}</p>
          </div>
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
      </div>

      {/* Milestone list */}
      <div className="space-y-2">
        {MILESTONES.map((m) => {
          const achieved = days >= m.days;
          const tier = TIER_COLORS[m.tier];
          const Icon = ICON_MAP[m.icon] || Star;
          return (
            <div
              key={m.days}
              className={cn(
                "flex items-center gap-3 rounded-xl p-3 border transition-all",
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
                <p className={cn("text-sm font-medium", achieved ? "text-white" : "text-slate-500")}>
                  {m.title}
                </p>
                <p className="text-xs text-slate-500 truncate">{m.desc}</p>
              </div>
              <span className={cn("text-xs font-bold tabular-nums", achieved ? tier.text : "text-slate-600")}>
                {m.days}d
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}