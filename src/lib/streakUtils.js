import { db } from "@/lib/store";

// Ensure a Streak record exists for the current user; create if missing
export async function ensureStreakRecord() {
  const existing = await db.entities.Streak.filter({}, "-created_date", 1);
  if (existing && existing.length > 0) {
    const record = existing[0];
    try {
      // Self-heal: keep "total nights" equal to every logged session (not just
      // successful ones) so it never mirrors the best streak.
      const sleeps = await db.entities.Sleep.filter({}, "-start_date", 100000);
      if ((record.sleep_total_nights || 0) !== sleeps.length) {
        const updated = await db.entities.Streak.update(record.id, {
          sleep_total_nights: sleeps.length,
        });
        Object.assign(record, updated);
      }
    } catch (e) {
      /* non-fatal */
    }
    return record;
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
    sleep_session_start: null,
    sleep_current_streak_days: 0,
    sleep_longest_streak_days: 0,
    sleep_total_nights: 0,
    sleep_total_resets: 0,
    sleep_last_success_date: null,
    sleep_last_duration_min: null,
    alarm_enabled: false,
    alarm_duration_min: 480,
    alarm_sound: "default",
    alarm_last_fired_session: null,
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

// Lifetime days the user has been on the app, counted from when their streak
// record was created. This is a monotonic "time since install" counter, meant
// to be shown as "Total Days" — independent of current/best streak.
export function getTotalAppDays(streak) {
  if (!streak?.created_date) return streak?.total_clean_days || 0;
  const created = new Date(streak.created_date).getTime();
  return Math.max(0, Math.floor((Date.now() - created) / 86400000)) + 1;
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

// ---------------- Sleep tracking ----------------
export const SLEEP_MIN_MINUTES = 7 * 60; // 7 hours
export const SLEEP_MAX_MINUTES = 9 * 60; // 9 hours
export const SLEEP_STALE_MINUTES = 20 * 60; // a session older than 20h is abandoned

export function localDateStr(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function startSleepSession(record) {
  if (record?.sleep_session_start) return record;
  return db.entities.Streak.update(record.id, {
    sleep_session_start: new Date().toISOString(),
  });
}

export function abandonSleepSession(record) {
  if (!record?.sleep_session_start) return record;
  return db.entities.Streak.update(record.id, {
    sleep_session_start: null,
  });
}

export function sleepElapsedMin(record) {
  if (!record?.sleep_session_start) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(record.sleep_session_start).getTime()) / 60000));
}

export function formatDuration(min) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export async function wakeUp(record) {
  if (!record?.sleep_session_start) return { status: "none", streak: record };
  const end = new Date().toISOString();
  const start = new Date(record.sleep_session_start);
  const durationMin = Math.max(0, Math.round((new Date(end).getTime() - start.getTime()) / 60000));

  let status = "success";
  if (durationMin < SLEEP_MIN_MINUTES) status = "short";
  else if (durationMin > SLEEP_MAX_MINUTES) status = "overslept";

  const today = localDateStr(end);
  const last = record.sleep_last_success_date || null;
  const yesterday = localDateStr(new Date(Date.now() - 86400000).toISOString());

  let current = record.sleep_current_streak_days || 0;
  if (status === "success") {
    if (last === today) {
      // already counted today — keep current
    } else if (last === yesterday) {
      current += 1;
    } else if (!last) {
      current = 1;
    } else {
      current = 1; // a night was skipped — restart
    }
  } else {
    current = 0;
  }

  const resets = (record.sleep_total_resets || 0) + (status === "success" ? 0 : 1);
  const longest = Math.max(record.sleep_longest_streak_days || 0, current);
  // Every completed sleep session counts toward the lifetime total, not just
  // successful ones — "total nights on the app" shouldn't mirror the best streak.
  const nights = (record.sleep_total_nights || 0) + 1;

  const next = await db.entities.Streak.update(record.id, {
    sleep_session_start: null,
    sleep_current_streak_days: current,
    sleep_longest_streak_days: longest,
    sleep_total_nights: nights,
    sleep_total_resets: resets,
    sleep_last_success_date: status === "success" ? today : record.sleep_last_success_date,
    sleep_last_duration_min: durationMin,
  });

  await db.entities.Sleep.create({
    start_date: record.sleep_session_start,
    end_date: end,
    duration_min: durationMin,
    status,
  });

  return { status, durationMin, streak: next };
}