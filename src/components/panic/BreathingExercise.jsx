import { useEffect, useState, useRef } from "react";
import { X } from "lucide-react";

const PHASES = [
  { name: "Breathe In", duration: 4, scale: 1.3, text: "Inhale..." },
  { name: "Hold", duration: 7, scale: 1.3, text: "Hold..." },
  { name: "Breathe Out", duration: 8, scale: 0.7, text: "Exhale..." },
];

export default function BreathingExercise({ onClose }) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [countdown, setCountdown] = useState(PHASES[0].duration);
  const [cycles, setCycles] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setPhaseIndex((pi) => {
            const next = (pi + 1) % PHASES.length;
            if (next === 0) setCycles((c) => c + 1);
            return next;
          });
          return PHASES[(phaseIndex + 1) % PHASES.length].duration;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phaseIndex]);

  const phase = PHASES[phaseIndex];

  return (
    <div className="fixed inset-0 z-[100] bg-[#060710] flex flex-col items-center justify-center">
      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[100px] transition-all duration-[3000ms]" />
      </div>

      <button
        onClick={onClose}
        className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors z-10"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="relative flex flex-col items-center">
        {/* Breathing circle */}
        <div className="relative w-64 h-64 flex items-center justify-center mb-8">
          <div
            className="absolute w-48 h-48 rounded-full bg-gradient-to-br from-indigo-500/30 to-purple-600/20 border border-indigo-400/30 transition-all ease-in-out"
            style={{
              transform: `scale(${phase.scale})`,
              transitionDuration: `${phase.duration}s`,
            }}
          />
          <div
            className="absolute w-32 h-32 rounded-full bg-gradient-to-br from-indigo-400/40 to-purple-500/30 border border-indigo-300/40 transition-all ease-in-out"
            style={{
              transform: `scale(${phase.scale})`,
              transitionDuration: `${phase.duration}s`,
            }}
          />
          <div className="relative z-10 text-center">
            <p className="text-2xl font-light text-white mb-1">{phase.text}</p>
            <p className="text-5xl font-bold tabular-nums text-indigo-200">{countdown}</p>
          </div>
        </div>

        <p className="text-slate-400 text-sm mb-1">
          Cycle {cycles + 1} · {phase.name}
        </p>
        <p className="text-slate-500 text-xs text-center max-w-xs">
          Follow the circle. Breathe slowly. The urge is already fading.
        </p>

        {cycles >= 3 && (
          <button
            onClick={onClose}
            className="mt-8 px-8 py-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium text-sm hover:opacity-90 transition-opacity"
          >
            I Feel Better →
          </button>
        )}
      </div>
    </div>
  );
}