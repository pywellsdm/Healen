// Builds a context string from the user's recovery data for the AI coach
import { db } from "@/lib/store";
import { ensureStreakRecord, calculateStreakDays, sleepElapsedMin, formatDuration } from "@/lib/streakUtils";
import { getAlarmSettings, alarmTargetMs, formatAlarmTime } from "@/lib/alarm";
import { getNextMilestone } from "@/lib/milestones";
import { TRIGGER_LABELS, MOOD_LABELS } from "@/lib/motivation";

export const SLEEP_PLAN_LABELS = {
  under6: "under 6 hours",
  six_seven: "6–7 hours",
  seven_eight: "7–8 hours",
  eight_nine: "8–9 hours",
};

export async function buildAIContext() {
  const streak = await ensureStreakRecord();
  const currentDays = calculateStreakDays(streak.streak_start_date);
  const [checkIns, relapses, alarm] = await Promise.all([
    db.entities.CheckIn.filter({}, "-checkin_date", 30),
    db.entities.Relapse.filter({}, "-relapse_date", 50),
    getAlarmSettings(),
  ]);

  const recentRelapses = (relapses || []).slice(0, 5).map((r) =>
    `${r.relapse_date ? new Date(r.relapse_date).toLocaleDateString() : "?"} — trigger: ${TRIGGER_LABELS[r.trigger] || r.trigger}, mood: ${r.mood}, streak lost: ${r.streak_before_relapse}d`
  );

  const recentCheckIns = (checkIns || []).slice(0, 7).map((c) =>
    `${c.checkin_date} — mood: ${MOOD_LABELS[c.mood] || c.mood}, urge: ${c.urge_level}/10`
  );

  const triggerCounts = (relapses || []).reduce((acc, r) => {
    acc[r.trigger] = (acc[r.trigger] || 0) + 1;
    return acc;
  }, {});
  const topTriggers = Object.entries(triggerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t, c]) => `${TRIGGER_LABELS[t] || t} (${c}x)`);

  // Live sleep + alarm state
  const sessionStart = streak.sleep_session_start;
  let sleepState = "not currently in a sleep session";
  let alarmLine = `- Alarm: ${alarm.enabled ? `on, rings ${formatAlarmTime(sessionStart, alarm.durationMin)}` : "off"}`;
  if (sessionStart) {
    const elapsed = sleepElapsedMin(streak);
    sleepState = `currently in a sleep session (started, ${formatDuration(elapsed)} elapsed)`;
    if (alarm.enabled) {
      const remaining = Math.max(0, Math.round((alarmTargetMs(sessionStart, alarm.durationMin) - Date.now()) / 60000));
      alarmLine = `- Alarm: on, rings ${formatAlarmTime(sessionStart, alarm.durationMin)} (in about ${formatDuration(remaining)})`;
    }
  }

  // Next milestone context
  const nextM = getNextMilestone(currentDays);
  const milestoneLine = nextM && nextM.days > currentDays
    ? `- Next milestone: ${nextM.title} at ${nextM.days} days (${nextM.days - currentDays} days away)`
    : "- Next milestone: none remaining";

  return {
    streak,
    alarm,
    currentDays,
    sleepState,
    contextText: `USER RECOVERY DATA:
- Current streak: ${currentDays} days
- Longest streak: ${streak.longest_streak_days || 0} days
- Total clean days: ${streak.total_clean_days || 0}
- Total relapses: ${streak.total_relapses || 0}
- Current goal: ${streak.current_goal_days || 30} days
- Motivation tone preference: ${streak.motivation_tone || "gentle"}
- User name: ${streak.user_name || "friend"}
- Gender: ${streak.gender || "not specified"}
- Age: ${streak.age || "not specified"}
- Gooning quit attempts: ${streak.gooning_attempts || "not specified"}
- Sleep plan (hours per night): ${SLEEP_PLAN_LABELS[streak.sleep_plan] || streak.sleep_plan || "not specified"}
- Sleep streak: ${streak.sleep_current_streak_days || 0} nights
- Best sleep streak: ${streak.sleep_longest_streak_days || 0} nights
- Total nights slept: ${streak.sleep_total_nights || 0}
- Sleep resets: ${streak.sleep_total_resets || 0}
- Sleep state: ${sleepState}
- Daily check-in streak: ${streak.daily_goal_streak || 0}
${alarmLine}
${milestoneLine}

RECENT CHECK-INS (last 7):
${recentCheckIns.length ? recentCheckIns.join("\n") : "No check-ins yet"}

RECENT RELAPSES (last 5):
${recentRelapses.length ? recentRelapses.join("\n") : "No relapses recorded"}

TOP TRIGGERS:
${topTriggers.length ? topTriggers.join(", ") : "No trigger data yet"}`,
  };
}

export const AI_PERSONAS = {
  mentor: {
    name: "Mentor",
    desc: "Wise, guiding, patient",
    system: "You are a wise, patient recovery mentor. You speak with warmth and authority. You reference the user's actual data to give personalized guidance. Keep responses concise (2-4 short paragraphs). Use their name if known. Be encouraging but honest.",
  },
  friend: {
    name: "Friend",
    desc: "Casual, supportive, real",
    system: "You are a supportive friend who's been through recovery themselves. You speak casually, like a text from a buddy who gets it. Keep it real, short, and warm. Reference their data naturally. Use their name if known.",
  },
  coach: {
    name: "Coach",
    desc: "Direct, motivating, action-oriented",
    system: "You are a no-nonsense recovery coach. You're direct, motivating, and action-oriented. You give specific, actionable advice based on their data. Keep responses punchy and short. Push them to be their best. Use their name if known.",
  },
  therapist: {
    name: "Therapist",
    desc: "Reflective, empathetic, insightful",
    system: "You are a thoughtful therapist specializing in addiction recovery. You ask reflective questions, validate feelings, and help the user understand their patterns. Reference their data to build insight. Keep responses gentle and concise. Use their name if known.",
  },
  custom: {
    name: "Custom",
    desc: "Your own personality",
    system: "You are a supportive recovery companion with a custom personality.",
  },
};