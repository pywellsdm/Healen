import { useMode } from "@/lib/ModeContext";
import { Flame, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ModeSwitcher() {
  const { mode, setMode } = useMode();
  return (
    <div className="flex bg-white/5 border border-white/10 rounded-full p-1 mb-5">
      <button
        onClick={() => setMode("gooning")}
        className={cn(
          "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-semibold transition-all",
          mode === "gooning"
            ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow"
            : "text-slate-400 hover:text-slate-300"
        )}
      >
        <Flame className="w-3.5 h-3.5" /> Gooning
      </button>
      <button
        onClick={() => setMode("sleeping")}
        className={cn(
          "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-semibold transition-all",
          mode === "sleeping"
            ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow"
            : "text-slate-400 hover:text-slate-300"
        )}
      >
        <Moon className="w-3.5 h-3.5" /> Sleeping
      </button>
    </div>
  );
}
