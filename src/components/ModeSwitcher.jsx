import { motion } from "framer-motion";
import { useMode } from "@/lib/ModeContext";
import { Flame, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ModeSwitcher() {
  const { mode, setMode } = useMode();

  const options = [
    { value: "gooning", label: "Gooning", Icon: Flame },
    { value: "sleeping", label: "Sleeping", Icon: Moon },
  ];

  return (
    <div className="flex bg-white/5 border border-white/10 rounded-full p-1 mb-5">
      {options.map(({ value, label, Icon }) => {
        const active = mode === value;
        return (
          <button
            key={value}
            onClick={() => setMode(value)}
            className={cn(
              "relative flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-semibold transition-colors",
              active ? "text-white" : "text-slate-400 hover:text-slate-300"
            )}
          >
            {active && (
              <motion.span
                layoutId="mode-pill"
                className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <Icon className="w-3.5 h-3.5" /> {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
