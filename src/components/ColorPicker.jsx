import { useState, useRef, useCallback, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

function hsvToHex(h, s, v) {
  s /= 100;
  v /= 100;
  const f = (n) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
  };
  const r = Math.round(255 * f(0));
  const g = Math.round(255 * f(8));
  const b = Math.round(255 * f(4));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function hexToHsv(hex) {
  const m = String(hex || "#000000").replace(/^#/, "");
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const int = parseInt(full.slice(0, 6), 16);
  if (!Number.isFinite(int)) return { h: 210, s: 70, v: 100 };
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : Math.round((d / max) * 100);
  const v = Math.round(max * 100);
  return { h, s, v };
}

function hueToHex(hue) {
  return hsvToHex(hue, 70, 60);
}

export default function ColorPicker({ themeColor, setThemeColor }) {
  const isAuto = themeColor === "auto";
  // Determine initial hex from stored value
  let initialHex = "#6366f1";
  if (!isAuto) {
    if (String(themeColor).startsWith("#")) {
      initialHex = themeColor;
    } else {
      initialHex = hueToHex(Number(themeColor));
    }
  }
  const initialHsv = hexToHsv(initialHex);

  const [hsv, setHsv] = useState(initialHsv);
  const [hexInput, setHexInput] = useState(initialHex);
  const sqRef = useRef(null);
  const hueRef = useRef(null);
  const dragging = useRef(null);

  useEffect(() => {
    let h;
    if (isAuto) {
      h = "#6366f1";
    } else if (String(themeColor).startsWith("#")) {
      h = themeColor;
    } else {
      h = hueToHex(Number(themeColor));
    }
    setHsv(hexToHsv(h));
    setHexInput(h);
  }, [themeColor, isAuto]);

  const commitHsv = useCallback((newHsv) => {
    setHsv(newHsv);
    const hex = hsvToHex(newHsv.h, newHsv.s, newHsv.v);
    setHexInput(hex);
    // Pass hex directly to setThemeColor — ThemeContext stores it as hex
    setThemeColor(hex);
  }, [setThemeColor]);

  const onSqPointer = useCallback((e) => {
    const el = sqRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, ((e.clientX ?? e.touches?.[0]?.clientX ?? 0) - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, ((e.clientY ?? e.touches?.[0]?.clientY ?? 0) - rect.top) / rect.height));
    commitHsv({ h: hsv.h, s: Math.round(x * 100), v: Math.round((1 - y) * 100) });
  }, [hsv.h, commitHsv]);

  const onHuePointer = useCallback((e) => {
    const el = hueRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const y = Math.max(0, Math.min(1, ((e.clientY ?? e.touches?.[0]?.clientY ?? 0) - rect.top) / rect.height));
    commitHsv({ ...hsv, h: Math.round(y * 359) });
  }, [hsv, commitHsv]);

  useEffect(() => {
    if (dragging.current === null) return;
    const onMove = (e) => {
      e.preventDefault();
      if (dragging.current === "sq") onSqPointer(e);
      else if (dragging.current === "hue") onHuePointer(e);
    };
    const onUp = () => { dragging.current = null; };
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [onSqPointer, onHuePointer]);

  const currentHex = hsvToHex(hsv.h, hsv.s, hsv.v);

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        {/* Saturation-Brightness square */}
        <div
          ref={sqRef}
          className="relative w-44 h-44 rounded-xl overflow-hidden cursor-crosshair shrink-0 border border-white/10 touch-none"
          style={{ background: `hsl(${hsv.h}, 100%, 50%)` }}
          onPointerDown={(e) => { dragging.current = "sq"; onSqPointer(e); }}
        >
          <div className="absolute inset-0" style={{ background: "linear-gradient(to right, #fff, transparent)" }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent, #000)" }} />
          <div
            className="absolute w-4 h-4 rounded-full border-2 border-white shadow-lg -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ left: `${hsv.s}%`, top: `${100 - hsv.v}%` }}
          />
        </div>

        {/* Hue slider */}
        <div className="flex flex-col gap-1.5">
          <div
            ref={hueRef}
            className="relative w-7 flex-1 rounded-full overflow-hidden cursor-pointer border border-white/10 touch-none"
            style={{
              background: "linear-gradient(to bottom, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
            }}
            onPointerDown={(e) => { dragging.current = "hue"; onHuePointer(e); }}
          >
            <div
              className="absolute left-1/2 -translate-x-1/2 w-5 h-2 rounded-full border-2 border-white shadow pointer-events-none"
              style={{ top: `${(hsv.h / 359) * 100}%`, background: `hsl(${hsv.h}, 100%, 50%)` }}
            />
          </div>
        </div>

        {/* Preview + hex */}
        <div className="flex flex-col items-center gap-2">
          <div
            className="w-11 h-11 rounded-full border-2 border-white/20 shadow-inner"
            style={{ background: currentHex, boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.1), 0 0 8px ${currentHex}40` }}
          />
          <input
            type="text"
            value={hexInput}
            onChange={(e) => {
              const v = e.target.value;
              setHexInput(v);
              if (/^#[0-9a-f]{6}$/i.test(v)) {
                setHsv(hexToHsv(v));
                setThemeColor(v);
              }
            }}
            className="w-16 text-center text-[10px] font-mono bg-white/5 border border-white/10 rounded-lg px-1 py-1 text-slate-300 focus:outline-none focus:border-indigo-400/50"
          />
        </div>
      </div>

      {/* Auto button */}
      <button
        onClick={() => setThemeColor("auto")}
        className={cn(
          "w-full py-2.5 rounded-xl border text-xs font-medium transition-all flex items-center justify-center gap-1.5",
          isAuto
            ? "bg-indigo-500/15 border-indigo-400/40 text-indigo-200"
            : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
        )}
      >
        <Sparkles className="w-3.5 h-3.5" /> Auto (match wallpaper)
      </button>

      <p className="text-[11px] text-slate-500 leading-relaxed">
        {isAuto
          ? "Auto — your accent color matches your wallpaper's dominant hue."
          : `Custom color active. Tap "Auto" to match your wallpaper instead.`}
      </p>
    </div>
  );
}
