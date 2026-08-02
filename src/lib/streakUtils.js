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

// Calculate current streak days from start date
export function calculateStreakDays(startDate) {
  if (!startDate) return 0;
  const start = new Date(startDate);
  const now = new Date();
  const diffMs = now - start;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

// Calculate streak as a fractional number of days (for progress bars)
export function calculateStreakProgress(startDate) {
  if (!startDate) return 0;
  const start = new Date(startDate);
  const now = new Date();
  const diffMs = now - start;
  return Math.max(0, diffMs / (1000 * 60 * 60 * 24));
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

// Get the time breakdown for display
export function getStreakBreakdown(startDate) {
  if (!startDate) return { days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 };
  const start = new Date(startDate);
  const now = new Date();
  let diff = Math.floor((now - start) / 1000);
  if (diff < 0) diff = 0;
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;
  return { days, hours, minutes, seconds, totalSeconds: diff };
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