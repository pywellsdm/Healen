import { db } from "@/lib/store";

// Ensure a Streak record exists for the current user; create if missing
export async function ensureStreakRecord() {
  const existing = await db.entities.Streak.filter({}, "-created_date", 1);
  if (existing && existing.length > 0) {
    return existing[0];
  }
  const now = new Date().toISOString();
  return await db.entities.Streak.create({
    current_streak_days: 0,
    longest_streak_days: 0,
    streak_start_date: now,
    total_clean_days: 0,
    total_relapses: 0,
    daily_goal_streak: 0,
    current_goal_days: 30,
    motivation_tone: "gentle",
    daily_reminder_enabled: false,
    daily_reminder_time: "09:00",
    panic_button_enabled: true,
    journal_entries: [],
  });
}

export async function updateStreak(id, data) {
  return await db.entities.Streak.update(id, data);
}

export const GOAL_OPTIONS = [7, 14, 30, 45, 60, 90, 180, 365];

// Move to the next goal in the ladder; stay put if already at the top
export function getNextGoal(current) {
  const i = GOAL_OPTIONS.indexOf(current);
  if (i >= 0 && i < GOAL_OPTIONS.length - 1) return GOAL_OPTIONS[i + 1];
  return current;
}

// Calculate current streak days from start date (full 24-hour periods elapsed).
// A streak started at 8pm only reaches day 1 at 8pm the next day — never at midnight.
export function calculateStreakDays(startDate) {
  if (!startDate) return 0;
  const start = new Date(startDate).getTime();
  const elapsed = Math.max(0, Date.now() - start);
  return Math.floor(elapsed / 86400000);
}

// Calculate streak as a fractional number of days (for progress bars)
export function calculateStreakProgress(startDate) {
  if (!startDate) return 0;
  const start = new Date(startDate).getTime();
  const elapsed = Math.max(0, Date.now() - start);
  return elapsed / 86400000;
}

// Format a remaining time (in days, possibly fractional) as "Xd Yh" / "Yh Zm"
export function formatRemaining(days) {
  if (days <= 0) return "done";
  if (days >= 1) {
    const d = Math.floor(days);
    const h = Math.round((days - d) * 24);
    return `${d}d ${h}h`;
  }
  const h = Math.floor(days * 24);
  const m = Math.round((days * 24 - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// Get the time breakdown for display (counts up from the exact streak start,
// so a fresh relapse shows 00:00 and the clock matches "time since I gooned")
export function getStreakBreakdown(startDate) {
  if (!startDate) return { days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 };
  const elapsed = Math.max(0, Date.now() - new Date(startDate).getTime());
  const days = Math.floor(elapsed / 86400000);
  const msRemainder = elapsed - days * 86400000;
  const hours = Math.floor(msRemainder / 3600000);
  const minutes = Math.floor((msRemainder % 3600000) / 60000);
  const seconds = Math.floor((msRemainder % 60000) / 1000);
  return { days, hours, minutes, seconds, totalSeconds: Math.floor(elapsed / 1000) };
}

export function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTime(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}