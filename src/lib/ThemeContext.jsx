import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { db } from "@/lib/store";
import { ensureStreakRecord } from "@/lib/streakUtils";
import minecraftWallpaper from "@/assets/wallpapers/minecraft.png";

const ThemeContext = createContext(null);

export const DEFAULT_WALLPAPER = minecraftWallpaper;
export const DEFAULT_BLUR = 3;

function extractHue(imageUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = 24;
        c.height = 24;
        const ctx = c.getContext("2d", { willReadFrequently: true });
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, 24, 24);
        const { data } = ctx.getImageData(0, 0, 24, 24);
        // Weighted circular mean of the hue so red/blue mixes don't land on
        // a random intermediate hue (naive averaging breaks around 0/360).
        let x = 0;
        let y = 0;
        let weightSum = 0;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const l = (max + min) / 510;
          if (l < 0.18 || l > 0.92) continue;
          const d = max - min;
          const sat = d === 0 ? 0 : d / (255 - Math.abs(2 * l * 255 - 255));
          if (sat < 0.15) continue;
          let h;
          if (max === r) h = ((g - b) / d) % 6;
          else if (max === g) h = (b - r) / d + 2;
          else h = (r - g) / d + 4;
          h = h * 60;
          if (h < 0) h += 360;
          const rad = (h * Math.PI) / 180;
          const weight = sat * l;
          x += Math.cos(rad) * weight;
          y += Math.sin(rad) * weight;
          weightSum += weight;
        }
        resolve(weightSum === 0 ? null : ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = imageUrl;
  });
}

export function ThemeProvider({ children }) {
  const [wallpaperUrl, setWallpaperUrlState] = useState(() => localStorage.getItem("reclaim-wallpaper") || DEFAULT_WALLPAPER);
  const [wallpaperBlur, setWallpaperBlurState] = useState(() => Number(localStorage.getItem("reclaim-blur")) || DEFAULT_BLUR);
  const [themeColor, setThemeColorState] = useState(() => localStorage.getItem("reclaim-theme-color") || "auto");
  const [streakId, setStreakId] = useState(null);

  // Dark mode only — always apply the dark class
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("dark");
    root.classList.remove("light");
  }, []);

  // Match the accent color to the wallpaper's dominant hue,
  // unless the user picked a manual theme color.
  const applyAccentHue = useCallback(async (url) => {
    const manual = localStorage.getItem("reclaim-theme-color");
    if (manual && manual !== "auto") {
      document.documentElement.style.setProperty("--accent-hue", manual);
      return;
    }
    const hue = await extractHue(url);
    document.documentElement.style.setProperty("--accent-hue", hue == null ? "240" : String(hue.toFixed(0)));
  }, []);

  useEffect(() => {
    applyAccentHue(wallpaperUrl);
  }, [wallpaperUrl, themeColor, applyAccentHue]);

  // Sync wallpaper from streak record on mount
  useEffect(() => {
    (async () => {
      try {
        // No profile yet (e.g. Welcome page) — nothing to sync
        if (!localStorage.getItem("quit-gooning:profile")) return;
        const s = await ensureStreakRecord();
        setStreakId(s.id);
        if (s.wallpaper_url) {
          setWallpaperUrlState(s.wallpaper_url);
          localStorage.setItem("reclaim-wallpaper", s.wallpaper_url);
        }
        if (s.wallpaper_blur != null) {
          setWallpaperBlurState(s.wallpaper_blur);
          localStorage.setItem("reclaim-blur", String(s.wallpaper_blur));
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const setWallpaper = useCallback(async (url) => {
    if (!url || url === DEFAULT_WALLPAPER) {
      localStorage.removeItem("reclaim-wallpaper");
      setWallpaperUrlState(DEFAULT_WALLPAPER);
      if (streakId) {
        try {
          await db.entities.Streak.update(streakId, { wallpaper_url: null });
        } catch (e) {
          console.error(e);
        }
      }
      return;
    }
    setWallpaperUrlState(url);
    localStorage.setItem("reclaim-wallpaper", url);
    if (streakId) {
      try {
        await db.entities.Streak.update(streakId, { wallpaper_url: url });
      } catch (e) {
        console.error(e);
      }
    }
  }, [streakId]);

  const resetWallpaper = useCallback(async () => {
    await setWallpaper(DEFAULT_WALLPAPER);
    setWallpaperBlurState(DEFAULT_BLUR);
    localStorage.setItem("reclaim-blur", String(DEFAULT_BLUR));
    if (streakId) {
      try {
        await db.entities.Streak.update(streakId, { wallpaper_blur: DEFAULT_BLUR });
      } catch (e) {
        console.error(e);
      }
    }
  }, [setWallpaper, streakId]);

  const setBlur = useCallback(async (blur) => {
    setWallpaperBlurState(blur);
    localStorage.setItem("reclaim-blur", String(blur));
    if (streakId) {
      try {
        await db.entities.Streak.update(streakId, { wallpaper_blur: blur });
      } catch (e) {
        console.error(e);
      }
    }
  }, [streakId]);

  const setThemeColor = useCallback((color) => {
    setThemeColorState(color || "auto");
    if (!color || color === "auto") {
      localStorage.removeItem("reclaim-theme-color");
    } else {
      localStorage.setItem("reclaim-theme-color", String(color));
    }
  }, []);

  return (
    <ThemeContext.Provider value={{
      wallpaperUrl, setWallpaper, resetWallpaper,
      wallpaperBlur, setBlur,
      themeColor, setThemeColor,
      hasCustomWallpaper: !!localStorage.getItem("reclaim-wallpaper"),
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      wallpaperUrl: DEFAULT_WALLPAPER,
      setWallpaper: () => {},
      resetWallpaper: () => {},
      wallpaperBlur: DEFAULT_BLUR,
      setBlur: () => {},
      themeColor: "auto",
      setThemeColor: () => {},
      hasCustomWallpaper: false,
    };
  }
  return ctx;
}
