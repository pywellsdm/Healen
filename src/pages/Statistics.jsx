import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { db } from "@/lib/store";
import { ensureStreakRecord, calculateStreakDays, calculateStreakProgress, formatDate, formatDuration, getTotalAppDays } from "@/lib/streakUtils";
import MilestoneTracker from "@/components/streak/MilestoneTracker";
import { TRIGGER_LABELS, MOOD_EMOJI } from "@/lib/motivation";
import { SLEEP_MILESTONES } from "@/lib/milestones";
import { useMode } from "@/lib/ModeContext";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell,
  LineChart, Line, CartesianGrid, ReferenceArea,
} from "recharts";
import { TrendingUp, Calendar, Target, Flame, Award, Activity, Moon, AlertTriangle } from "lucide-react";

const PIE_COLORS = ["#6366f1", "#8b5cf6", "#a855f7", "#ec4899", "#f43f5e", "#f59e0b", "#10b981", "#06b6d4", "#3b82f6"];

const SLEEP_STATUS_COLORS = {
  success: "#818cf8",
  short: "#f59e0b",
  overslept: "#fb7185",
};

const TOOLTIP_STYLE = {
  background: "#0E0F1A",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 8,
  fontSize: 12,
  color: "#e2e8f0",
};
const TOOLTIP_LABEL_STYLE = { color: "#94a3b8", marginBottom: 4 };
const TOOLTIP_ITEM_STYLE = { color: "#f1f5f9" };

export default function Statistics() {
  const { mode } = useMode();
  const sleeping = mode === "sleeping";
  const [streak, setStreak] = useState(null);
  const [checkIns, setCheckIns] = useState([]);
  const [relapses, setRelapses] = useState([]);
  const [sleeps, setSleeps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    (async () => {
      try {
        const s = await ensureStreakRecord();
        setStreak(s);
        const [ci, rel, sl] = await Promise.all([
          db.entities.CheckIn.filter({}, "-checkin_date", 200),
          db.entities.Relapse.filter({}, "-relapse_date", 200),
          db.entities.Sleep.filter({}, "-start_date", 400),
        ]);
        setCheckIns(ci || []);
        setRelapses(rel || []);
        setSleeps(sl || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-slate-700 border-t-indigo-400 rounded-full animate-spin" />
      </div>
    );
  }

  const currentDays = calculateStreakDays(streak?.streak_start_date);
  const progressDays = calculateStreakProgress(streak?.streak_start_date);
  const bestDays = Math.max(streak?.longest_streak_days || 0, currentDays);

  // Trigger breakdown for pie chart
  const triggerData = Object.entries(
    relapses.reduce((acc, r) => {
      acc[r.trigger] = (acc[r.trigger] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name: TRIGGER_LABELS[name] || name, value }));

  // Last 7 days check-in data (mood over time)
  const last7 = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split("T")[0];
    const dayCheckins = checkIns.filter((c) => c.checkin_date === dateStr);
    const moodMap = { great: 5, good: 4, okay: 3, struggling: 2, hard: 1 };
    const avg = dayCheckins.length > 0
      ? dayCheckins.reduce((s, c) => s + (moodMap[c.mood] || 3), 0) / dayCheckins.length
      : 0;
    return {
      day: d.toLocaleDateString(undefined, { weekday: "short" }),
      mood: Math.round(avg * 10) / 10,
      checkins: dayCheckins.length,
    };
  });

  // Urge level over time
  const urgeData = [...Array(14)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const dateStr = d.toISOString().split("T")[0];
    const dayCheckins = checkIns.filter((c) => c.checkin_date === dateStr);
    const avg = dayCheckins.length > 0
      ? dayCheckins.reduce((s, c) => s + (c.urge_level || 0), 0) / dayCheckins.length
      : 0;
    return {
      day: `${d.getMonth() + 1}/${d.getDate()}`,
      urge: Math.round(avg * 10) / 10,
    };
  });

  const successRate = relapses.length > 0
    ? Math.round(((streak?.total_clean_days || 0) / ((streak?.total_clean_days || 0) + relapses.length)) * 100)
    : 100;

  // ---------------- Sleep stats ----------------
  const sleepDays = streak?.sleep_current_streak_days || 0;
  const sleepBest = Math.max(streak?.sleep_longest_streak_days || 0, sleepDays);
  const sleepEntries = [...sleeps].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  const sleepSuccess = sleepEntries.filter((s) => s.status === "success");
  const avgSleepMin = sleepEntries.length > 0
    ? Math.round(sleepEntries.reduce((sum, s) => sum + (s.duration_min || 0), 0) / sleepEntries.length)
    : 0;
  const sleepSuccessRate = sleepEntries.length > 0
    ? Math.round((sleepSuccess.length / sleepEntries.length) * 100)
    : 100;
  const sleepChart = sleepEntries.slice(-14).map((s) => ({
    day: new Date(s.start_date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    hours: Math.round(((s.duration_min || 0) / 60) * 10) / 10,
    color: SLEEP_STATUS_COLORS[s.status] || "#818cf8",
    status: s.status,
  }));
  const sleepStats = [
    { icon: Moon, label: "Current Streak", value: sleepDays, unit: "night", color: "text-indigo-400" },
    { icon: Award, label: "Longest Streak", value: sleepBest, unit: "night", color: "text-yellow-400" },
    { icon: Calendar, label: "Total Nights", value: sleepEntries.length, unit: "night", color: "text-emerald-400" },
    { icon: Activity, label: "Avg Duration", value: avgSleepMin > 0 ? formatDuration(avgSleepMin) : "—", unit: "per night", color: "text-cyan-400" },
    { icon: TrendingUp, label: "Success Rate", value: sleepSuccessRate, unit: "%", color: "text-indigo-300" },
    { icon: AlertTriangle, label: "Missed Nights", value: streak?.sleep_total_resets || 0, unit: "", color: "text-rose-400" },
  ];

  const stats = [
    { icon: Flame, label: "Current Streak", value: currentDays, unit: "days", color: "text-orange-400" },
    { icon: Award, label: "Longest Streak", value: bestDays, unit: "days", color: "text-yellow-400" },
    { icon: Calendar, label: "Total Days", value: getTotalAppDays(streak), unit: "days", color: "text-emerald-400" },
    { icon: Target, label: "Success Rate", value: successRate, unit: "%", color: "text-indigo-400" },
    { icon: TrendingUp, label: "Daily Check-Ins", value: streak?.daily_goal_streak || 0, unit: "streak", color: "text-cyan-400" },
    { icon: Activity, label: "Total Resets", value: streak?.total_relapses || 0, unit: "", color: "text-rose-400" },
  ];

  return (
    <div className="px-5 pt-12 pb-4">
      <h1 className="text-xl font-bold text-white mb-1">
        {sleeping ? "Your Sleep Statistics" : "Your Statistics"}
      </h1>
      <p className="text-xs text-slate-500 mb-6">
        {sleeping ? "Every night of rest is a win for your health." : "Every data point is a story of resilience."}
      </p>

      {/* Tab selector */}
      <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1 mb-6">
        {[
          { key: "overview", label: "Overview" },
          { key: "milestones", label: "Milestones" },
          { key: "history", label: "History" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
              tab === t.key ? "bg-white/10 text-white" : "text-slate-500"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {sleeping ? (
        tab === "overview" ? (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {sleepStats.map((s, idx) => {
                const Icon = s.icon;
                return (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                    whileTap={{ scale: 0.97 }}
                    className="bg-white/5 border border-white/10 rounded-2xl p-4"
                  >
                    <Icon className={`w-5 h-5 ${s.color} mb-2`} />
                    <p className="text-2xl font-bold text-white tabular-nums">
                      {s.value}<span className="text-sm text-slate-500 ml-1">{s.unit}</span>
                    </p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">{s.label}</p>
                  </motion.div>
                );
              })}
            </div>

            {/* Sleep duration chart */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
              <p className="text-sm font-semibold text-white mb-1">Sleep Duration — Last {sleepChart.length} Nights</p>
              <p className="text-xs text-slate-500 mb-4">
                Bars show hours slept each night. The amber band marks your <span className="text-amber-300">7-9h target</span> —
                bars below it were too short, bars above it were oversleep.
              </p>
              {sleepEntries.length === 0 ? (
                <div className="text-center py-10">
                  <Moon className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Start a sleep session from the Home tab to see your progress.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={sleepChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="day" stroke="#64748b" fontSize={8} tickLine={false} axisLine={false} interval={1} />
                    <YAxis domain={[0, 12]} stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} width={24} />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      labelStyle={TOOLTIP_LABEL_STYLE}
                      itemStyle={TOOLTIP_ITEM_STYLE}
                      cursor={{ fill: "rgba(255,255,255,0.03)" }}
                      formatter={(value, _name, item) => [`${value}h`, item.payload.status === "success" ? "Good sleep (7-9h)" : item.payload.status === "short" ? "Too short (<7h)" : "Overslept (>9h)"]}
                    />
                    <ReferenceArea y1={7} y2={9} fill="#f59e0b" fillOpacity={0.08} />
                    <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                      {sleepChart.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </>
        ) : tab === "milestones" ? (
          <MilestoneTracker currentDays={sleepDays} progressDays={sleepDays} list={SLEEP_MILESTONES} />
        ) : (
          <div className="space-y-3">
            {sleepEntries.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
                <Moon className="w-12 h-12 text-indigo-400 mx-auto mb-3" />
                <p className="text-sm font-semibold text-white">No sleep sessions yet</p>
                <p className="text-xs text-slate-500 mt-1">Your sleep log will appear here after your first night.</p>
              </div>
            ) : (
              [...sleeps]
                .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
                .map((s) => (
                  <div key={s.id} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-white">{formatDate(s.start_date)}</p>
                        <p className="text-[10px] text-slate-500">
                          {s.start_date ? new Date(s.start_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                          {" – "}
                          {s.end_date ? new Date(s.end_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-white">{formatDuration(s.duration_min || 0)}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                          s.status === "success"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : s.status === "short"
                              ? "bg-amber-500/10 text-amber-400"
                              : "bg-rose-500/10 text-rose-400"
                        }`}>
                          {s.status === "success" ? "Good sleep" : s.status === "short" ? "Too short" : "Overslept"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        )
      ) : (
        <>
      {tab === "overview" && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {stats.map((s, idx) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  whileTap={{ scale: 0.97 }}
                  className="bg-white/5 border border-white/10 rounded-2xl p-4"
                >
                  <Icon className={`w-5 h-5 ${s.color} mb-2`} />
                  <p className="text-2xl font-bold text-white tabular-nums">
                    {s.value}<span className="text-sm text-slate-500 ml-1">{s.unit}</span>
                  </p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">{s.label}</p>
                </motion.div>
              );
            })}
          </div>

          {/* Mood chart */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
            <p className="text-sm font-semibold text-white mb-1">Mood — Last 7 Days</p>
            <p className="text-xs text-slate-500 mb-4">Higher = feeling better</p>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={last7}>
                <XAxis dataKey="day" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 5]} stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} width={20} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelStyle={TOOLTIP_LABEL_STYLE}
                  itemStyle={TOOLTIP_ITEM_STYLE}
                />
                <Line type="monotone" dataKey="mood" stroke="#818cf8" strokeWidth={2} dot={{ fill: "#818cf8", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Urge level chart */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
            <p className="text-sm font-semibold text-white mb-1">Urge Intensity — Last 14 Days</p>
            <p className="text-xs text-slate-500 mb-4">Tracking your triggers over time</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={urgeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="day" stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} interval={1} />
                <YAxis domain={[0, 10]} stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} width={20} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelStyle={TOOLTIP_LABEL_STYLE}
                  itemStyle={TOOLTIP_ITEM_STYLE}
                  cursor={{ fill: "rgba(255,255,255,0.03)" }}
                />
                <Bar dataKey="urge" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Trigger pie chart */}
          {triggerData.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
              <p className="text-sm font-semibold text-white mb-1">Relapse Triggers</p>
              <p className="text-xs text-slate-500 mb-4">Know your patterns, break the cycle</p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={triggerData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                    {triggerData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    labelStyle={TOOLTIP_LABEL_STYLE}
                    itemStyle={TOOLTIP_ITEM_STYLE}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-1 mt-2">
                {triggerData.map((t, i) => (
                  <div key={t.name} className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <div className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="truncate">{t.name}</span>
                    <span className="text-slate-600 ml-auto">{t.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

          {tab === "milestones" && (
            <MilestoneTracker currentDays={currentDays} progressDays={progressDays} />
          )}

          {tab === "history" && (
            <div className="space-y-3">
              {relapses.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
                  <Award className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-white">No resets recorded</p>
                  <p className="text-xs text-slate-500 mt-1">Your record is clean. Keep it going.</p>
                </div>
              ) : (
                relapses.sort((a, b) => new Date(b.relapse_date ?? 0).getTime() - new Date(a.relapse_date ?? 0).getTime()).map((r) => (
                  <div key={r.id} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{MOOD_EMOJI[r.mood] || "⚪"}</span>
                        <div>
                          <p className="text-sm font-medium text-white">{formatDate(r.relapse_date)}</p>
                          <p className="text-[10px] text-slate-500 capitalize">{r.time_of_day}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Lost</p>
                        <p className="text-sm font-bold text-rose-400">{r.streak_before_relapse}d</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400">
                        {TRIGGER_LABELS[r.trigger] || r.trigger}
                      </span>
                      {r.notes && <span className="text-[10px] text-slate-500 truncate">"{r.notes}"</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}