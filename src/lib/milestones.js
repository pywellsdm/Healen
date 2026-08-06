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

export const SLEEP_MILESTONES = [
  { days: 0, title: "First Rest", desc: "You decided to take your sleep seriously.", icon: "Sparkles", tier: "start" },
  { days: 1, title: "One Full Night", desc: "A complete night of real rest. Your body is grateful.", icon: "Moon", tier: "bronze" },
  { days: 3, title: "Resting Strong", desc: "Three nights in a row — your energy is coming back.", icon: "CloudMoon", tier: "bronze" },
  { days: 7, title: "Sleep Week", desc: "A full week of solid sleep. Your brain is repairing.", icon: "Stars", tier: "silver" },
  { days: 14, title: "Two Weeks Restored", desc: "Deep rest is becoming your habit.", icon: "BedDouble", tier: "silver" },
  { days: 21, title: "Rhythm Found", desc: "Your body clock is syncing. 21 nights strong.", icon: "Clock", tier: "gold" },
  { days: 30, title: "One Month Rested", desc: "30 nights of 7-9 hours. You are proof it's possible.", icon: "Crown", tier: "gold" },
  { days: 45, title: "Deep Recovery", desc: "Your memory, mood and immune system thank you.", icon: "HeartPulse", tier: "gold" },
  { days: 60, title: "Sleep Sovereign", desc: "Sleep is now a non-negotiable part of your life.", icon: "Bed", tier: "platinum" },
  { days: 90, title: "90 Nights of Rest", desc: "A quarter of a year of quality sleep. Unstoppable.", icon: "Trophy", tier: "diamond" },
  { days: 180, title: "Half Year of Rest", desc: "Six months of well-rested mornings.", icon: "Gem", tier: "diamond" },
  { days: 365, title: "One Year Restored", desc: "A full year of healing in your sleep. Legend.", icon: "Award", tier: "legend" },
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

export function getMilestonesForStreak(currentDays, list = MILESTONES) {
  return list.map((m) => ({
    ...m,
    achieved: currentDays >= m.days,
    isNext: list.find((x) => x.days > currentDays)?.days === m.days,
  }));
}

export function getNextMilestone(currentDays, list = MILESTONES) {
  return list.find((m) => m.days > currentDays) || list[list.length - 1];
}

export function getRecentMilestone(currentDays, list = MILESTONES) {
  const achieved = list.filter((m) => m.days <= currentDays);
  return achieved[achieved.length - 1] || list[0];
}

export function getProgressToNext(currentDays, list = MILESTONES) {
  const next = getNextMilestone(currentDays, list);
  const recent = getRecentMilestone(currentDays, list);
  const range = next.days - recent.days;
  const progress = range === 0 ? 1 : (currentDays - recent.days) / range;
  return Math.min(progress, 1);
}