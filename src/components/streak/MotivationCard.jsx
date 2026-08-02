import { Sparkles } from "lucide-react";
import { getMotivation } from "@/lib/motivation";
import { useMemo } from "react";

export default function MotivationCard({ tone = "gentle", type = "daily", customText }) {
  const message = useMemo(() => {
    if (customText && customText.trim()) return customText;
    return getMotivation(tone, type);
  }, [tone, type, customText]);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950/60 to-purple-950/40 border border-indigo-500/20 p-5">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-indigo-300" />
          <span className="text-xs uppercase tracking-wider text-indigo-300/80 font-semibold">
            {type === "relapse" ? "Get Back Up" : type === "panic" ? "Stay Strong" : "Daily Fuel"}
          </span>
        </div>
        <p className="text-base leading-relaxed text-slate-100 font-light">
          "{message}"
        </p>
      </div>
    </div>
  );
}