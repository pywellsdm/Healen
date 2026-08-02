// Milestone definitions for the recovery journey
export const MILESTONES = [
  { days: 0, title: "The Decision", desc: "You chose to fight. That's where it begins.", icon: "Sparkles", tier: "start" },
  { days: 1, title: "First Day Free", desc: "24 hours of choosing yourself.", icon: "Sun", tier: "bronze" },
  { days: 3, title: "Three Days Strong", desc: "The fog starts to lift.", icon: "Leaf", tier: "bronze" },
  { days: 7, title: "One Week Warrior", desc: "Your brain is already rewiring.", icon: "Flame", tier: "silver" },
  { days: 14, title: "Two Weeks Unchained", desc: "You've broken the daily loop.", icon: "Shield", tier: "silver" },
  { days: 21, title: "Habit Breaker", desc: "Science says habits start shifting at 21 days.", icon: "Zap", tier: "gold" },
  { days: 30, title: "One Month Reborn", desc: "You survived the hardest month. You are proof it's possible.", icon: "Crown", tier: "gold" },
  { days: 45, title: "Deep Reset", desc: "Your dopamine baseline is healing.", icon: "Brain", tier: "gold" },
  { days: 60, title: "Two Months Transformed", desc: "Discipline is now identity.", icon: "Star", tier: "platinum" },
  { days: 90, title: "90 Days Rebooted", desc: "The brain rewiring milestone. You're unrecognizable.", icon: "Trophy", tier: "diamond" },
  { days: 180, title: "Half Year Sovereign", desc: "Six months of mastery over yourself.", icon: "Gem", tier: "diamond" },
  { days: 365, title: "One Year Legend", desc: "You did what most never will. Legend.", icon: "Award", tier: "legend" },
];

export const TIER_COLORS = {
  start: { bg: "bg-slate-700/40", border: "border-slate-500/30", text: "text-slate-300", glow: "shadow-slate-500/20" },
  bronze: { bg: "bg-amber-900/30", border: "border-amber-600/30", text: "text-amber-400", glow: "shadow-amber-600/20" },
  silver: { bg: "bg-slate-800/40", border: "border-slate-400/30", text: "text-slate-200", glow: "shadow-slate-300/20" },
  gold: { bg: "bg-yellow-900/30", border: "border-yellow-500/30", text: "text-yellow-400", glow: "shadow-yellow-500/20" },
  platinum: { bg: "bg-cyan-900/30", border: "border-cyan-500/30", text: "text-cyan-300", glow: "shadow-cyan-400/20" },
  diamond: { bg: "bg-indigo-900/30", border: "border-indigo-400/30", text: "text-indigo-300", glow: "shadow-indigo-400/20" },
  legend: { bg: "bg-purple-900/30", border: "border-purple-400/40", text: "text-purple-300", glow: "shadow-purple-400/30" },
};

export function getMilestonesForStreak(currentDays) {
  return MILESTONES.map((m) => ({
    ...m,
    achieved: currentDays >= m.days,
    isNext: MILESTONES.find((x) => x.days > currentDays)?.days === m.days,
  }));
}

export function getNextMilestone(currentDays) {
  return MILESTONES.find((m) => m.days > currentDays) || MILESTONES[MILESTONES.length - 1];
}

export function getRecentMilestone(currentDays) {
  const achieved = MILESTONES.filter((m) => m.days <= currentDays);
  return achieved[achieved.length - 1] || MILESTONES[0];
}

export function getProgressToNext(currentDays) {
  const next = getNextMilestone(currentDays);
  const recent = getRecentMilestone(currentDays);
  const range = next.days - recent.days;
  const progress = range === 0 ? 1 : (currentDays - recent.days) / range;
  return Math.min(progress, 1);
}