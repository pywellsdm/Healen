import { Link, useLocation } from "react-router-dom";
import { Home, BarChart3, Settings, Shield, Users, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/statistics", label: "Stats", icon: BarChart3 },
  { to: "/panic", label: "Panic", icon: Shield, highlight: true },
  { to: "/community", label: "Tribe", icon: Users },
  { to: "/ai-coach", label: "AI", icon: Bot },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 px-3 pb-3 pt-2">
      <div className="glass-strong glass-sheen rounded-2xl shadow-2xl shadow-black/40 flex items-center justify-around px-1.5 py-1.5">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.to || (item.to !== "/" && location.pathname.startsWith(item.to));
          const Icon = item.icon;

          if (item.highlight) {
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 px-2.5 py-1.5 rounded-xl transition-all duration-200",
                  isActive ? "text-rose-400" : "text-rose-500/70 hover:text-rose-400"
                )}
              >
                <Icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[9px] font-medium">Panic</span>
              </Link>
            );
          }

          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-2.5 py-1.5 rounded-xl transition-all duration-200",
                isActive ? "text-white light:text-slate-900" : "text-slate-500 hover:text-slate-300"
              )}
            >
              <Icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[9px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}