// Builds a context string from the user's recovery data for the AI coach
import { db } from "@/lib/store";
import { ensureStreakRecord, calculateStreakDays } from "@/lib/streakUtils";
import { TRIGGER_LABELS, MOOD_LABELS } from "@/lib/motivation";

export async function buildAIContext() {
  const streak = await ensureStreakRecord();
  const currentDays = calculateStreakDays(streak.streak_start_date);
  const [checkIns, relapses] = await Promise.all([
    db.entities.CheckIn.filter({}, "-checkin_date", 30),
    db.entities.Relapse.filter({}, "-relapse_date", 50),
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

  return {
    streak,
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
- Times tried quitting: ${streak.times_tried || "not specified"}
- Daily check-in streak: ${streak.daily_goal_streak || 0}

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