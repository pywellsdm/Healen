import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ensureStreakRecord, calculateStreakDays, calculateStreakProgress, getNextGoal, getTotalAppDays } from "@/lib/streakUtils";
import { getRecentMilestone, SLEEP_MILESTONES } from "@/lib/milestones";
import StreakCounter from "@/components/streak/StreakCounter";
import MotivationCard from "@/components/streak/MotivationCard";
import DailyCheckIn from "@/components/streak/DailyCheckIn";
import MilestoneTracker from "@/components/streak/MilestoneTracker";
import SleepTracker from "@/components/streak/SleepTracker";
import ModeSwitcher from "@/components/ModeSwitcher";
import RelapseModal from "@/components/streak/RelapseModal";
import RelapseRecovery from "@/components/streak/RelapseRecovery";
import Celebration from "@/components/Celebration";
import { AlertTriangle, TrendingUp, Flame, Moon, Calendar, ChevronRight, Target, AlarmClock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { db } from "@/lib/store";
import { useMode } from "@/lib/ModeContext";
import { useAlarm } from "@/components/AlarmSystem";
import { formatAlarmTime, minutesUntilAlarm, durationLabel } from "@/lib/alarm";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const navigate = useNavigate();
  const { mode } = useMode();
  const sleeping = mode === "sleeping";
  const [streak, setStreak] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRelapse, setShowRelapse] = useState(false);
  const [recoveryData, setRecoveryData] = useState(null);
  const [currentDays, setCurrentDays] = useState(0);
  const [progressDays, setProgressDays] = useState(0);
  const [celebration, setCelebration] = useState(null);
  const { settings: alarm, save: saveAlarm } = useAlarm();
  const [alarmTick, setAlarmTick] = useState(Date.now());

  // Persisted marker of the last streak day a celebration was shown for, so a
  // day rollover overnight still celebrates even if the app was closed.
  const DAY_MARKER_KEY = "healen:celebrated-day";
  const getCelebratedDay = () => {
    try {
      return parseInt(localStorage.getItem(DAY_MARKER_KEY) || "0", 10) || 0;
    } catch {
      return 0;
    }
  };
  const setCelebratedDay = (d) => {
    try {
      localStorage.setItem(DAY_MARKER_KEY, String(d));
    } catch {
      /* ignore */
    }
  };

  const loadStreak = async () => {
    const s = await ensureStreakRecord();
    const current = calculateStreakDays(s.streak_start_date);
    const progress = calculateStreakProgress(s.streak_start_date);

    // Self-heal: a check-in on the start day used to over-count Total/Best by 1
    if (
      current > 0 &&
      (s.daily_goal_streak || 0) === (s.total_clean_days || 0) &&
      (s.total_clean_days || 0) === current + 1
    ) {
      const fixedLongest =
        (s.longest_streak_days || 0) === current + 1
          ? current
          : Math.max(s.longest_streak_days || 0, current);
      await db.entities.Streak.update(s.id, {
        daily_goal_streak: current,
        total_clean_days: current,
        longest_streak_days: fixedLongest,
      });
      s.daily_goal_streak = current;
      s.total_clean_days = current;
      s.longest_streak_days = fixedLongest;
    }

    let goalCelebration = null;
    let updated = s;
    if (progress >= (s.current_goal_days || 30)) {
      const next = getNextGoal(s.current_goal_days || 30);
      if (next !== (s.current_goal_days || 30)) {
        updated = await db.entities.Streak.update(s.id, { current_goal_days: next });
        goalCelebration = { type: "goal", day: Math.floor(progress), nextGoal: next };
      }
    }

    let milestoneCelebration = null;
    const recent = getRecentMilestone(current);
    if (!goalCelebration && recent.days > (updated.last_awarded_milestone || 0)) {
      await db.entities.Streak.update(updated.id, { last_awarded_milestone: recent.days });
      milestoneCelebration = { type: "milestone", day: current, milestone: recent };
    }

    setStreak(updated);
    setCurrentDays(current);
    setProgressDays(progress);
    return { streak: updated, celebration: goalCelebration || milestoneCelebration, day: current };
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await loadStreak();
        if (res.streak.onboarding_completed !== true) {
          navigate("/onboarding", { replace: true });
        } else {
          const day = res.day;
          const celebrated = getCelebratedDay();
          const nextCelebration =
            res.celebration ||
            (day > celebrated && !sleeping
              ? { type: "checkin", day: Math.max(day, 1) }
              : null);
          if (nextCelebration) {
            setCelebration(nextCelebration);
            setCelebratedDay(Math.max(day, 1));
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Keep the alarm countdown fresh
  useEffect(() => {
    const t = setInterval(() => setAlarmTick(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  // Celebrate the moment a new streak day rolls over — even without a check-in.
  const lastNotifiedDayRef = useRef(null);
  useEffect(() => {
    if (!streak?.streak_start_date) return;
    lastNotifiedDayRef.current = calculateStreakDays(streak.streak_start_date);
    if (calculateStreakDays(streak.streak_start_date) < getCelebratedDay()) {
      setCelebratedDay(0);
    }
  }, [streak?.streak_start_date]);

  useEffect(() => {
    if (!streak?.streak_start_date) return;
    const t = setInterval(() => {
      const days = calculateStreakDays(streak.streak_start_date);
      const prev = lastNotifiedDayRef.current;
      if (prev == null) {
        lastNotifiedDayRef.current = days;
        return;
      }
      if (days > prev || (days > getCelebratedDay() && days > prev)) {
        lastNotifiedDayRef.current = days;
        if (!sleeping) {
          setCelebratedDay(days);
          loadStreak()
            .then((res) => {
              setCelebration(res.celebration || { type: "checkin", day: Math.max(days, 1) });
            })
            .catch(() => {});
        }
      }
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streak?.streak_start_date, sleeping]);

  const handleRelapseComplete = (data) => {
    setShowRelapse(false);
    setRecoveryData(data);
  };

  const handleRecoveryClose = async () => {
    setRecoveryData(null);
    await loadStreak();
  };

  const handleCheckInComplete = async () => {
    // Celebrate every successful check-in — the streak just got updated.
    // Milestones and goals take priority when they're also hit.
    const res = await loadStreak();
    setCelebratedDay(Math.max(res.day, res.streak?.daily_goal_streak || 0, 1));
    if (res.celebration) {
      setCelebration(res.celebration);
    } else {
      setCelebration({
        type: "checkin",
        day: Math.max(res.day, res.streak?.daily_goal_streak || 0, 1),
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-slate-700 border-t-indigo-400 rounded-full animate-spin" />
      </div>
    );
  }

  const bestDays = Math.max(streak?.longest_streak_days || 0, currentDays);
  const sleepBest = Math.max(streak?.sleep_longest_streak_days || 0, streak?.sleep_current_streak_days || 0);
  const sleepDays = sleeping ? streak?.sleep_current_streak_days || 0 : 0;

  const sleepSessionStart = streak?.sleep_session_start;
  const ringTime = sleepSessionStart ? formatAlarmTime(sleepSessionStart, alarm?.durationMin) : null;
  const ringCountdown = alarm?.enabled && sleepSessionStart
    ? `${minutesUntilAlarm(alarm, streak, new Date(alarmTick)) ?? 0} min`
    : null;

  return (
    <motion.div
      className="px-5 pt-12 pb-4"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* Mode switcher */}
      <ModeSwitcher />

      <AnimatePresence mode="wait">
        <motion.div
          key={sleeping ? "sleeping" : "gooning"}
          initial={{ opacity: 0, x: sleeping ? 24 : -24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: sleeping ? -24 : 24 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">
                {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
              </p>
              <h1 className="text-xl font-bold text-white">
                {sleeping
                  ? (streak?.user_name ? `Sleep well, ${streak.user_name}` : "Your Sleep")
                  : (streak?.user_name ? `Stay strong, ${streak.user_name}` : "Your Recovery")}
              </h1>
            </div>
            {sleeping ? (
              <div className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-3 py-1.5">
                <Moon className="w-4 h-4 text-indigo-300" />
                <span className="text-sm font-bold text-indigo-200 tabular-nums">{sleepDays}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 rounded-full px-3 py-1.5">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-bold text-orange-300 tabular-nums">{currentDays}</span>
              </div>
            )}
          </div>

          {sleeping ? (
        <>
          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
              <TrendingUp className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
              <p className="text-lg font-bold text-white tabular-nums">{sleepBest}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Best</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
              <Calendar className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
              <p className="text-lg font-bold text-white tabular-nums">{streak?.sleep_total_nights || 0}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Total Nights</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
              <AlertTriangle className="w-4 h-4 text-rose-400 mx-auto mb-1" />
              <p className="text-lg font-bold text-white tabular-nums">{streak?.sleep_total_resets || 0}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Resets</p>
            </div>
          </div>

          {/* Sleep tracker (above Daily Fuel) */}
          <div className="mb-6">
            <SleepTracker
              streak={streak}
              onRefresh={loadStreak}
              onWakeSuccess={({ streak: next }) => {
                if (next?.sleep_current_streak_days > 0) {
                  setCelebration({
                    type: "sleep",
                    day: Math.max(next.sleep_current_streak_days, 1),
                  });
                }
              }}
            />
          </div>

          {/* Wake-up alarm */}
          <div className="mb-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
                  <AlarmClock className="w-5 h-5 text-indigo-300" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">Wake-up Alarm</p>
                  <p className="text-xs text-slate-400">
                    {alarm?.enabled
                      ? ringTime
                        ? `Rings at ${ringTime}`
                        : "Armed for tonight"
                      : "Alarm is off"}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    if (!alarm) return;
                    await saveAlarm({ enabled: !alarm.enabled });
                  }}
                  aria-label="Toggle alarm"
                  className={cn(
                    "w-12 h-7 rounded-full transition-colors relative shrink-0",
                    alarm?.enabled ? "bg-indigo-500" : "bg-white/10"
                  )}
                >
                  <div className={cn(
                    "absolute top-0.5 w-6 h-6 rounded-full bg-white transition-transform",
                    alarm?.enabled ? "translate-x-5" : "translate-x-0.5"
                  )} />
                </button>
              </div>

              {alarm?.enabled && (
                <div className="mb-2">
                  <div className="flex justify-between mb-1">
                    <label className="text-xs text-slate-400">Sleep goal</label>
                    <span className="text-xs font-bold text-indigo-300 tabular-nums">
                      {durationLabel(alarm.durationMin)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="420"
                    max="540"
                    step="15"
                    value={alarm.durationMin}
                    onChange={(e) => saveAlarm({ durationMin: Number(e.target.value) })}
                    className="w-full"
                  />
                  <p className="text-[10px] text-slate-500 mt-1 flex justify-between">
                    <span>7h</span>
                    <span>8h</span>
                    <span>9h</span>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    {ringTime
                      ? `${ringCountdown} until it rings`
                      : "Your alarm rings after 7-9 hours of rest, once per night."}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Daily Fuel */}
          <div className="mb-6">
            <MotivationCard tone={streak?.motivation_tone || "gentle"} type="daily" customText={streak?.custom_motivation} />
          </div>

          {/* Milestone preview */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-white">Sleep Milestones</h2>
              <Link to="/statistics" className="text-xs text-indigo-300 flex items-center gap-0.5 hover:text-indigo-200">
                See all <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <MilestoneTracker currentDays={sleepDays} progressDays={sleepDays} list={SLEEP_MILESTONES} />
          </div>
        </>
      ) : (
        <>
          {/* Streak counter */}
          <div className="mb-6">
            <StreakCounter startDate={streak?.streak_start_date} />
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
              <TrendingUp className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
              <p className="text-lg font-bold text-white tabular-nums">{bestDays}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Best</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
              <Calendar className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
              <p className="text-lg font-bold text-white tabular-nums">{getTotalAppDays(streak)}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Total Days</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
              <AlertTriangle className="w-4 h-4 text-rose-400 mx-auto mb-1" />
              <p className="text-lg font-bold text-white tabular-nums">{streak?.total_relapses || 0}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Resets</p>
            </div>
          </div>

          {/* Daily check-in */}
          <div className="mb-6">
            <DailyCheckIn streak={streak} onCompleted={handleCheckInComplete} />
          </div>

          {/* Goal progress */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-indigo-400" /> Your Goal
              </span>
              <span className="text-xs font-bold text-indigo-300 tabular-nums">
                {Math.min(Math.round((progressDays / (streak?.current_goal_days || 30)) * 100), 100)}%
              </span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(Math.min((progressDays / (streak?.current_goal_days || 30)) * 100, 100), progressDays > 0 ? 4 : 0)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              {progressDays >= (streak?.current_goal_days || 30)
                ? `Goal reached — ${Math.floor(progressDays)} days! Set a new one in Settings.`
                : `${Math.max(Math.ceil((streak?.current_goal_days || 30) - progressDays), 0)} days to your goal of ${streak?.current_goal_days || 30}.`}
            </p>
          </div>

          {/* Relapse button */}
          <div className="mb-6">
            <motion.button
              onClick={() => setShowRelapse(true)}
              whileTap={{ scale: 0.97 }}
              className="w-full py-4 rounded-2xl bg-rose-950/30 border border-rose-800/30 text-rose-300 font-medium text-sm hover:bg-rose-950/50 transition-colors flex items-center justify-center gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              I Relapsed — Reset My Streak
            </motion.button>
            <p className="text-center text-xs text-slate-600 mt-2">
              No shame. Reporting it is how you grow stronger.
            </p>
          </div>

          {/* Daily Fuel */}
          <div className="mb-6">
            <MotivationCard tone={streak?.motivation_tone || "gentle"} type="daily" customText={streak?.custom_motivation} />
          </div>

          {/* Milestone preview */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-white">Milestones</h2>
              <Link to="/statistics" className="text-xs text-indigo-300 flex items-center gap-0.5 hover:text-indigo-200">
                See all <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <MilestoneTracker currentDays={currentDays} progressDays={progressDays} />
          </div>
        </>
      )}
        </motion.div>
      </AnimatePresence>

      {/* Modals */}
      <RelapseModal
        open={showRelapse}
        onClose={() => setShowRelapse(false)}
        streak={streak}
        onCompleted={handleRelapseComplete}
      />
      <RelapseRecovery data={recoveryData} onClose={handleRecoveryClose} />
      <Celebration celebration={celebration} onClose={() => setCelebration(null)} />
    </motion.div>
  );
}