import { RotateCcw, Heart, TrendingUp } from "lucide-react";
import MotivationCard from "@/components/streak/MotivationCard";

export default function RelapseRecovery({ data, onClose }) {
  if (!data) return null;

  return (
    <div className="fixed inset-0 z-[150] bg-[#060710] overflow-y-auto">
      <div className="min-h-full flex flex-col items-center justify-center px-6 py-12 max-w-md mx-auto">
        {/* Icon */}
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-rose-500/20 to-purple-600/10 border border-rose-400/20 flex items-center justify-center mb-6">
          <RotateCcw className="w-10 h-10 text-rose-300" />
        </div>

        <h1 className="text-2xl font-bold text-white text-center mb-2">
          Streak Reset
        </h1>
        <p className="text-slate-400 text-sm text-center mb-6">
          You lasted <span className="text-white font-semibold">{data.streakLost} days</span>. That time counts.
        </p>

        {/* Motivation */}
        <div className="w-full mb-6">
          <MotivationCard tone="gentle" type="relapse" />
        </div>

        {/* Reframe */}
        <div className="w-full space-y-3 mb-8">
          <div className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
            <Heart className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-white">You showed up to report it</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Most people hide their relapses. You faced yours. That's accountability — the foundation of recovery.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
            <TrendingUp className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-white">This is data, not defeat</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Trigger: {data.trigger?.replace(/_/g, " ")}. Now you know. Next time this pattern appears, you'll recognize it before it takes hold.
              </p>
            </div>
          </div>
        </div>

        {/* Call to action */}
        <div className="text-center mb-6">
          <p className="text-slate-300 text-sm mb-1">Day 0 starts now.</p>
          <p className="text-indigo-300 text-sm font-medium">But this time, you're wiser.</p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          I'm Ready to Start Again →
        </button>

        <p className="text-slate-600 text-xs mt-4 text-center">
          Be proud that you're still here. That's everything.
        </p>
      </div>
    </div>
  );
}