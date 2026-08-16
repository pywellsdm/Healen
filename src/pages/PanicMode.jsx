import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Wind, Gamepad2, BookOpen, Zap, Brain, Moon, Music, Sunset } from "lucide-react";
import BreathingExercise from "@/components/panic/BreathingExercise";
import ChessGame from "@/components/panic/ChessGame";
import MotivationCard from "@/components/streak/MotivationCard";
import { db } from "@/lib/store";
import { ensureStreakRecord } from "@/lib/streakUtils";
import { useMode } from "@/lib/ModeContext";
import { useEffect } from "react";

export default function PanicMode() {
  const { mode } = useMode();
  const sleeping = mode === "sleeping";
  const [view, setView] = useState("menu"); // menu | breathing | chess | coldwater | exercise | bodyscan | sound | winddown
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
        checkin_type: sleeping ? "sleep_help_used" : "panic_used",
        mood: sleeping ? "okay" : "struggling",
        urge_level: sleeping ? 0 : 8,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const tools = sleeping
    ? [
        {
          icon: Wind,
          title: "Breathe",
          desc: "4-7-8 breathing to slow your racing mind",
          color: "from-indigo-500/20 to-blue-600/10",
          border: "border-indigo-400/20",
          iconColor: "text-indigo-300",
          action: () => {
            logPanicUse();
            setView("breathing");
          },
        },
        {
          icon: Moon,
          title: "Body Scan",
          desc: "Relax each muscle, toes to crown",
          color: "from-violet-500/20 to-purple-600/10",
          border: "border-violet-400/20",
          iconColor: "text-violet-300",
          action: () => {
            logPanicUse();
            setView("bodyscan");
          },
        },
        {
          icon: Music,
          title: "White Noise",
          desc: "Rain, fans, or brown noise to mask thoughts",
          color: "from-cyan-500/20 to-sky-600/10",
          border: "border-cyan-400/20",
          iconColor: "text-cyan-300",
          action: () => {
            logPanicUse();
            setView("sound");
          },
        },
        {
          icon: Sunset,
          title: "Wind Down",
          desc: "Dim lights, cool room, warm drink",
          color: "from-amber-500/20 to-orange-600/10",
          border: "border-amber-400/20",
          iconColor: "text-amber-300",
          action: () => {
            logPanicUse();
            setView("winddown");
          },
        },
      ]
    : [
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
          title: "Chess",
          desc: "Beat the AI — refocus your mind",
          color: "from-rose-500/20 to-red-600/10",
          border: "border-rose-400/20",
          iconColor: "text-rose-400",
          action: () => {
            logPanicUse();
            setView("chess");
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

  if (view === "chess") {
    return <ChessGame onClose={() => setView("menu")} />;
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

  if (view === "bodyscan") {
    return (
      <div className="fixed inset-0 z-[100] bg-[#060710] flex flex-col items-center justify-center px-6 text-center">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-500/30 to-purple-600/20 border border-violet-400/30 flex items-center justify-center mb-6 animate-pulse">
          <Moon className="w-12 h-12 text-violet-300" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Body Scan</h2>
        <p className="text-slate-400 text-sm mb-6 max-w-xs leading-relaxed">
          Lie down and close your eyes. Slowly tense and release each muscle, starting at your toes:
          feet, calves, thighs, belly, hands, arms, shoulders, jaw, eyes. Breathe out with each release.
        </p>
        <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4 mb-8 max-w-xs">
          <p className="text-xs text-violet-200/90 leading-relaxed">
            💡 Tension and stress are stored in the body. Releasing it muscle by muscle tells your
            nervous system it's safe to power down.
          </p>
        </div>
        <button
          onClick={() => setView("menu")}
          className="px-8 py-3 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 text-white font-medium text-sm"
        >
          I'm Relaxed →
        </button>
      </div>
    );
  }

  if (view === "sound") {
    return (
      <div className="fixed inset-0 z-[100] bg-[#060710] flex flex-col items-center justify-center px-6 text-center">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500/30 to-sky-600/20 border border-cyan-400/30 flex items-center justify-center mb-6">
          <Music className="w-12 h-12 text-cyan-300" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">White Noise</h2>
        <p className="text-slate-400 text-sm mb-6 max-w-xs leading-relaxed">
          Put on rain sounds, a fan, or brown noise — whatever fades into the background. Set it for
          20–30 minutes and focus only on the sound, not your thoughts.
        </p>
        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4 mb-8 max-w-xs">
          <p className="text-xs text-cyan-200/90 leading-relaxed">
            💡 Steady background noise gives your wandering mind something neutral to hold onto,
            instead of the day's replay loop.
          </p>
        </div>
        <button
          onClick={() => setView("menu")}
          className="px-8 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-sky-500 text-white font-medium text-sm"
        >
          Playing →
        </button>
      </div>
    );
  }

  if (view === "winddown") {
    return (
      <div className="fixed inset-0 z-[100] bg-[#060710] flex flex-col items-center justify-center px-6 text-center">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-500/30 to-orange-600/20 border border-amber-400/30 flex items-center justify-center mb-6">
          <Sunset className="w-12 h-12 text-amber-300" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Wind Down</h2>
        <p className="text-slate-400 text-sm mb-6 max-w-xs leading-relaxed">
          Dim the lights, put your phone face-down and out of reach, drop the room temperature a few
          degrees, and sip something warm. Give your body every signal it's bedtime.
        </p>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-8 max-w-xs">
          <p className="text-xs text-amber-200/90 leading-relaxed">
            💡 Falling asleep is a wind-down process, not a switch. Darkness, cool air, and warmth
            trigger melatonin and lower your heart rate.
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
          <h1 className="text-xl font-bold text-white">{sleeping ? "Can't Sleep?" : "Panic Mode"}</h1>
          <p className="text-xs text-slate-500">
            {sleeping ? "Your body is ready. Let's help your mind catch up." : "The urge will pass. Let's get through it together."}
          </p>
        </div>
      </div>

      {/* Urgency banner */}
      <div
        className={`bg-gradient-to-r rounded-2xl p-4 mb-6 text-center border ${
          sleeping ? "from-indigo-950/40 to-purple-950/30 border-indigo-800/30" : "from-rose-950/40 to-purple-950/30 border-rose-800/30"
        }`}
      >
        <p className={`text-sm font-medium mb-1 ${sleeping ? "text-indigo-200" : "text-rose-200"}`}>
          {sleeping ? "Your brain won't stop racing." : "You're stronger than this urge."}
        </p>
        <p className="text-xs text-slate-400">
          {sleeping
            ? "That's the day leaking in. Pick a tool below — any one will slow things down."
            : "Pick a tool below. Any one of them will weaken the urge within minutes."}
        </p>
      </div>

      {/* Motivation */}
      <div className="mb-6">
        <MotivationCard tone={streak?.motivation_tone || "gentle"} type={sleeping ? "sleep" : "panic"} customText="" />
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
            <p className="text-xs font-semibold text-white uppercase tracking-wider">
              {sleeping ? "The 20-Minute Rule" : "The 15-Minute Rule"}
            </p>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            {sleeping
              ? "If you can't fall asleep within about 20 minutes, get out of bed. Do something calm and boring in dim light until you feel drowsy, then try again. Don't lie there fighting."
              : "Urges rarely last more than 15 minutes. If you can delay for just 15 minutes — using any tool above — the urge will fade. You don't have to resist forever. Just right now."}
          </p>
        </div>
      </div>
    </div>
  );
}
