import { useState, useEffect } from "react";
import { ensureStreakRecord, calculateStreakDays, calculateStreakProgress, getNextGoal } from "@/lib/streakUtils";
import { getNextMilestone, getRecentMilestone } from "@/lib/milestones";
import StreakCounter from "@/components/streak/StreakCounter";
import MotivationCard from "@/components/streak/MotivationCard";
import DailyCheckIn from "@/components/streak/DailyCheckIn";
import MilestoneTracker from "@/components/streak/MilestoneTracker";
import RelapseModal from "@/components/streak/RelapseModal";
import RelapseRecovery from "@/components/streak/RelapseRecovery";
import Celebration from "@/components/Celebration";
import { AlertTriangle, TrendingUp, Flame, Calendar, ChevronRight, Target } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { db } from "@/lib/store";

export default function Dashboard() {
  const navigate = useNavigate();
  const [streak, setStreak] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRelapse, setShowRelapse] = useState(false);
  const [recoveryData, setRecoveryData] = useState(null);
  const [currentDays, setCurrentDays] = useState(0);
  const [progressDays, setProgressDays] = useState(0);
  const [celebration, setCelebration] = useState(null);

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
    return { streak: updated, celebration: goalCelebration || milestoneCelebration };
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await loadStreak();
        if (res.streak.onboarding_completed !== true) {
          navigate("/onboarding", { replace: true });
        } else if (res.celebration) {
          setCelebration(res.celebration);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleRelapseComplete = (data) => {
    setShowRelapse(false);
    setRecoveryData(data);
  };

  const handleRecoveryClose = async () => {
    setRecoveryData(null);
    await loadStreak();
  };

  const handleCheckInComplete = async () => {
    const res = await loadStreak();
    if (res.celebration) {
      setCelebration(res.celebration);
    } else {
      const day = calculateStreakDays(res.streak.streak_start_date);
      setCelebration({ type: "checkin", day });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-slate-700 border-t-indigo-400 rounded-full animate-spin" />
      </div>
    );
  }

  const nextMilestone = getNextMilestone(currentDays);
  const bestDays = Math.max(streak?.longest_streak_days || 0, currentDays);

  return (
    <div className="px-5 pt-12 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="text-xl font-bold text-white">
            {streak?.user_name ? `Stay strong, ${streak.user_name}` : "Your Recovery"}
          </h1>
        </div>
        <div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 rounded-full px-3 py-1.5">
          <Flame className="w-4 h-4 text-orange-400" />
          <span className="text-sm font-bold text-orange-300 tabular-nums">{currentDays}</span>
        </div>
      </div>

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
          <p className="text-lg font-bold text-white tabular-nums">{streak?.total_clean_days || 0}</p>
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

      {/* Motivation */}
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

      {/* Relapse button */}
      <div className="mb-4">
        <button
          onClick={() => setShowRelapse(true)}
          className="w-full py-4 rounded-2xl bg-rose-950/30 border border-rose-800/30 text-rose-300 font-medium text-sm hover:bg-rose-950/50 transition-colors flex items-center justify-center gap-2"
        >
          <AlertTriangle className="w-4 h-4" />
          I Relapsed — Reset My Streak
        </button>
        <p className="text-center text-xs text-slate-600 mt-2">
          No shame. Reporting it is how you grow stronger.
        </p>
      </div>

      {/* Modals */}
      <RelapseModal
        open={showRelapse}
        onClose={() => setShowRelapse(false)}
        streak={streak}
        onCompleted={handleRelapseComplete}
      />
      <RelapseRecovery data={recoveryData} onClose={handleRecoveryClose} />
      <Celebration celebration={celebration} onClose={() => setCelebration(null)} />
    </div>
  );
}