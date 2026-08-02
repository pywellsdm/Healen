import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Wind, Gamepad2, BookOpen, Zap, Brain } from "lucide-react";
import BreathingExercise from "@/components/panic/BreathingExercise";
import MiniGame from "@/components/panic/MiniGame";
import MotivationCard from "@/components/streak/MotivationCard";
import { db } from "@/lib/store";
import { ensureStreakRecord } from "@/lib/streakUtils";
import { useEffect } from "react";

export default function PanicMode() {
  const [view, setView] = useState("menu"); // menu | breathing | game
  const [streak, setStreak] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const s = await ensureStreakRecord();
        setStreak(s);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const logPanicUse = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      await db.entities.CheckIn.create({
        checkin_date: today,
        checkin_type: "panic_used",
        mood: "struggling",
        urge_level: 8,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const tools = [
    {
      icon: Wind,
      title: "Breathe",
      desc: "4-7-8 breathing to calm your nervous system",
      color: "from-cyan-500/20 to-blue-600/10",
      border: "border-cyan-400/20",
      iconColor: "text-cyan-400",
      action: () => {
        logPanicUse();
        setView("breathing");
      },
    },
    {
      icon: Gamepad2,
      title: "Mini Game",
      desc: "Extinguish urges — redirect your focus",
      color: "from-rose-500/20 to-red-600/10",
      border: "border-rose-400/20",
      iconColor: "text-rose-400",
      action: () => {
        logPanicUse();
        setView("game");
      },
    },
    {
      icon: Brain,
      title: "Cold Water",
      desc: "Splash cold water — triggers mammalian dive reflex",
      color: "from-indigo-500/20 to-purple-600/10",
      border: "border-indigo-400/20",
      iconColor: "text-indigo-400",
      action: () => {
        logPanicUse();
        setView("coldwater");
      },
    },
    {
      icon: Zap,
      title: "Push-Ups",
      desc: "Burn the energy — 20 push-ups right now",
      color: "from-amber-500/20 to-orange-600/10",
      border: "border-amber-400/20",
      iconColor: "text-amber-400",
      action: () => {
        logPanicUse();
        setView("exercise");
      },
    },
  ];

  if (view === "breathing") {
    return <BreathingExercise onClose={() => setView("menu")} />;
  }

  if (view === "game") {
    return <MiniGame onClose={() => setView("menu")} />;
  }

  if (view === "coldwater") {
    return (
      <div className="fixed inset-0 z-[100] bg-[#060710] flex flex-col items-center justify-center px-6 text-center">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-600/20 border border-cyan-400/30 flex items-center justify-center mb-6 animate-pulse">
          <Brain className="w-12 h-12 text-cyan-300" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Cold Water Reset</h2>
        <p className="text-slate-400 text-sm mb-6 max-w-xs leading-relaxed">
          Go splash cold water on your face right now. Hold it for 30 seconds. This triggers the
          mammalian dive reflex, instantly calming your nervous system and reducing the urge.
        </p>
        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4 mb-8 max-w-xs">
          <p className="text-xs text-cyan-200/90 leading-relaxed">
            💡 The vagus nerve activates, heart rate drops, and the prefrontal cortex regains control.
            It's a biological reset button.
          </p>
        </div>
        <button
          onClick={() => setView("menu")}
          className="px-8 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium text-sm"
        >
          I Did It →
        </button>
      </div>
    );
  }

  if (view === "exercise") {
    return (
      <div className="fixed inset-0 z-[100] bg-[#060710] flex flex-col items-center justify-center px-6 text-center">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-500/30 to-orange-600/20 border border-amber-400/30 flex items-center justify-center mb-6">
          <Zap className="w-12 h-12 text-amber-300" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Move Your Body</h2>
        <p className="text-slate-400 text-sm mb-6 max-w-xs leading-relaxed">
          Right now: drop and do 20 push-ups. Or 20 jumping jacks. Or a 60-second plank.
          Burn the nervous energy — your body can't hold the urge at peak intensity.
        </p>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-8 max-w-xs">
          <p className="text-xs text-amber-200/90 leading-relaxed">
            💡 Exercise releases endorphins and redirects blood flow from the reward system to your muscles.
            The urge weakens within minutes.
          </p>
        </div>
        <button
          onClick={() => setView("menu")}
          className="px-8 py-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium text-sm"
        >
          Done →
        </button>
      </div>
    );
  }

  return (
    <div className="px-5 pt-12 pb-4 min-h-screen flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/" className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">Panic Mode</h1>
          <p className="text-xs text-slate-500">The urge will pass. Let's get through it together.</p>
        </div>
      </div>

      {/* Urgency banner */}
      <div className="bg-gradient-to-r from-rose-950/40 to-purple-950/30 border border-rose-800/30 rounded-2xl p-4 mb-6 text-center">
        <p className="text-sm text-rose-200 font-medium mb-1">
          You're stronger than this urge.
        </p>
        <p className="text-xs text-slate-400">
          Pick a tool below. Any one of them will weaken the urge within minutes.
        </p>
      </div>

      {/* Motivation */}
      <div className="mb-6">
        <MotivationCard tone={streak?.motivation_tone || "gentle"} type="panic" customText="" />
      </div>

      {/* Tools */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.title}
              onClick={tool.action}
              className={`text-left bg-gradient-to-br ${tool.color} border ${tool.border} rounded-2xl p-4 hover:scale-[1.02] transition-transform`}
            >
              <Icon className={`w-7 h-7 ${tool.iconColor} mb-3`} />
              <p className="text-sm font-semibold text-white mb-0.5">{tool.title}</p>
              <p className="text-[11px] text-slate-400 leading-snug">{tool.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Emergency principle */}
      <div className="mt-auto">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <p className="text-xs font-semibold text-white uppercase tracking-wider">The 15-Minute Rule</p>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Urges rarely last more than 15 minutes. If you can delay for just 15 minutes — using any tool above —
            the urge will fade. You don't have to resist forever. Just right now.
          </p>
        </div>
      </div>
    </div>
  );
}