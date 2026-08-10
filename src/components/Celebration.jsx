import { useEffect, useMemo } from "react";
import { Flame, Trophy, Target, X } from "lucide-react";
import { TIER_COLORS } from "@/lib/milestones";

const ICON_MAP = {
  Sparkles: "✨", Sun: "☀️", Leaf: "🍃", Flame: "🔥", Shield: "🛡️",
  Zap: "⚡", Crown: "👑", Brain: "🧠", Star: "⭐", Trophy: "🏆",
  Gem: "💎", Award: "🏅",
};

const CONFETTI_COLORS = ["#f472b6", "#fb923c", "#facc15", "#4ade80", "#38bdf8", "#a78bfa", "#f87171", "#34d399"];

export default function Celebration({ celebration, onClose }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 6 + Math.random() * 8,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        dur: 2.4 + Math.random() * 2,
        delay: Math.random() * 0.6,
        drift: (Math.random() - 0.5) * 160,
        round: Math.random() > 0.5,
      })),
    []
  );

  const pieceStyles = useMemo(
    () =>
      pieces.map((p) => {
        const style = /** @type {React.CSSProperties} */ ({
          left: `${p.left}%`,
          width: p.size,
          height: p.size * (p.round ? 1 : 0.45),
          backgroundColor: p.color,
          borderRadius: p.round ? "50%" : "2px",
          "--dur": `${p.dur}s`,
          "--drift": `${p.drift}px`,
          animationDelay: `${p.delay}s`,
        });
        return style;
      }),
    [pieces]
  );

  useEffect(() => {
    if (!celebration) return;
    const t = setTimeout(() => onClose?.(), 3600);
    return () => clearTimeout(t);
  }, [celebration, onClose]);

  if (!celebration) return null;

  const { type, day, milestone, nextGoal } = celebration;

  let title = "";
  let subtitle = "";
  let emoji = "🔥";
  let accent = { ring: "ring-indigo-400/40", glow: "rgba(99,102,241,0.5)", bar: "from-indigo-500 to-purple-500" };

  if (type === "checkin") {
    title = `Day ${day} Clean!`;
    subtitle = "Another day won. Your streak is growing. 🔥";
    emoji = "🔥";
  } else if (type === "milestone" && milestone) {
    title = milestone.title;
    subtitle = milestone.desc;
    emoji = ICON_MAP[milestone.icon] || "🏆";
    const tier = TIER_COLORS[milestone.tier];
    accent = {
      ring: tier.border,
      glow: "rgba(250,204,21,0.5)",
      bar: "from-yellow-400 to-orange-500",
    };
  } else if (type === "goal") {
    title = `Goal Reached — ${day} days! 🎉`;
    subtitle = `Amazing. You leveled up. Next goal: ${nextGoal} days.`;
    emoji = "🎯";
  } else if (type === "sleep") {
    title = `Night ${day} Rested!`;
    subtitle = "A full night of real sleep. Your streak is growing. 🌙";
    emoji = "🌙";
  }

  return (
    <div className="fixed inset-0 z-[300] overflow-hidden pointer-events-none">
      {/* Confetti */}
      {pieces.map((p, i) => (
        <span
          key={p.id}
          className="animate-confetti"
          style={pieceStyles[i]}
        />
      ))}

      {/* Card */}
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="pointer-events-auto w-full max-w-xs">
          <div className={`animate-pop-in animate-glow bg-[#0E0F1A]/95 border border-white/15 rounded-3xl p-6 text-center shadow-2xl ${accent.ring} ring-1`}>
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-slate-400"
              aria-label="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <div className="text-6xl mb-3">{emoji}</div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-indigo-300/80 font-semibold mb-1">
              {type === "checkin" ? "Streak update" : type === "goal" ? "Level up" : type === "sleep" ? "Sleep streak update" : "Milestone unlocked"}
            </p>
            <h2 className="text-xl font-bold text-white mb-1.5">{title}</h2>
            <p className="text-xs text-slate-400 leading-relaxed">{subtitle}</p>
            {type === "goal" && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <Target className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold text-emerald-300">Next goal: {nextGoal} days</span>
              </div>
            )}
            {type === "milestone" && milestone && (
              <div className="mt-4 flex items-center justify-center gap-1.5">
                <Trophy className="w-4 h-4 text-yellow-400" />
                <span className="text-xs text-slate-300">{milestone.days} days clean</span>
              </div>
            )}
            {type === "checkin" && (
              <div className="mt-4 flex items-center justify-center gap-1.5">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-xs text-slate-300">You're building something real</span>
              </div>
            )}
            {type === "sleep" && (
              <div className="mt-4 flex items-center justify-center gap-1.5">
                <Flame className="w-4 h-4 text-indigo-400" />
                <span className="text-xs text-slate-300">Your body is healing while you rest</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
