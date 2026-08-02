import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { db } from "@/lib/store";
import { ensureStreakRecord } from "@/lib/streakUtils";
import minecraftWallpaper from "@/assets/wallpapers/minecraft.png";

const ThemeContext = createContext(null);

export const DEFAULT_WALLPAPER = minecraftWallpaper;
export const DEFAULT_BLUR = 3;

export function ThemeProvider({ children }) {
  const [wallpaperUrl, setWallpaperUrlState] = useState(() => localStorage.getItem("reclaim-wallpaper") || DEFAULT_WALLPAPER);
  const [wallpaperBlur, setWallpaperBlurState] = useState(() => Number(localStorage.getItem("reclaim-blur")) || DEFAULT_BLUR);
  const [streakId, setStreakId] = useState(null);

  // Dark mode only — always apply the dark class
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("dark");
    root.classList.remove("light");
  }, []);

  // Sync wallpaper from streak record on mount
  useEffect(() => {
    (async () => {
      try {
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

  return (
    <ThemeContext.Provider value={{
      wallpaperUrl, setWallpaper, resetWallpaper,
      wallpaperBlur, setBlur,
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
      hasCustomWallpaper: false,
    };
  }
  return ctx;
}
