import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { db } from "@/lib/store";
import { ensureStreakRecord } from "@/lib/streakUtils";
import minecraftWallpaper from "@/assets/wallpapers/minecraft.png";
import { applyThemeToRoot, hslToHex } from "@/lib/themeEngine";

const ThemeContext = createContext(null);

export const DEFAULT_WALLPAPER = minecraftWallpaper;
export const DEFAULT_BLUR = 3;

// ---- video wallpaper storage (IndexedDB so even larger videos store reliably) ----
const VIDEO_DB_NAME = "healen-video";
const VIDEO_STORE = "video";
const VIDEO_KEY = "wallpaper";

function openVideoDb() {
  return new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(VIDEO_DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(VIDEO_STORE)) {
          req.result.createObjectStore(VIDEO_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch (e) {
      reject(e);
    }
  });
}

async function readVideoWallpaper() {
  try {
    const idb = await openVideoDb();
    return await new Promise((resolve) => {
      const tx = idb.transaction(VIDEO_STORE, "readonly");
      const req = tx.objectStore(VIDEO_STORE).get(VIDEO_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

async function saveVideoWallpaper(dataUrl) {
  try {
    const idb = await openVideoDb();
    await new Promise((resolve, reject) => {
      const tx = idb.transaction(VIDEO_STORE, "readwrite");
      tx.objectStore(VIDEO_STORE).put(dataUrl, VIDEO_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return true;
  } catch (e) {
    return false;
  }
}

async function clearVideoWallpaper() {
  try {
    const idb = await openVideoDb();
    await new Promise((resolve) => {
      const tx = idb.transaction(VIDEO_STORE, "readwrite");
      tx.objectStore(VIDEO_STORE).delete(VIDEO_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (e) {
    /* ignore */
  }
}

function hueFromCanvas(c) {
  try {
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    const { data } = ctx.getImageData(0, 0, c.width, c.height);
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
    return weightSum === 0 ? null : ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  } catch {
    return null;
  }
}

function extractHue(imageUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = 24;
      c.height = 24;
      c.getContext("2d").drawImage(img, 0, 0, 24, 24);
      resolve(hueFromCanvas(c));
    };
    img.onerror = () => resolve(null);
    img.src = imageUrl;
  });
}

// Dominant hue from a video: seek to a mid frame and read it like an image.
function extractVideoHue(videoUrl) {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.onloadeddata = () => {
      try {
        video.currentTime = Math.min(0.5, (video.duration || 1) / 2);
      } catch {
        /* seek may fail on some encodes — fall through */
      }
    };
    video.onseeked = () => {
      const c = document.createElement("canvas");
      c.width = 24;
      c.height = 24;
      try {
        c.getContext("2d").drawImage(video, 0, 0, 24, 24);
        resolve(hueFromCanvas(c));
      } catch {
        resolve(null);
      }
    };
    video.onerror = () => resolve(null);
    video.src = videoUrl;
  });
}

export const DEFAULT_WALLPAPER_ZOOM = 1;
export const DEFAULT_WALLPAPER_POS_X = 50;
export const DEFAULT_WALLPAPER_POS_Y = 50;

function readNum(key, fallback) {
  const raw = localStorage.getItem(key);
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function ThemeProvider({ children }) {
  const [wallpaperUrl, setWallpaperUrlState] = useState(() => localStorage.getItem("reclaim-wallpaper") || DEFAULT_WALLPAPER);
  const [wallpaperBlur, setWallpaperBlurState] = useState(() => Number(localStorage.getItem("reclaim-blur")) || DEFAULT_BLUR);
  const [themeColor, setThemeColorState] = useState(() => localStorage.getItem("reclaim-theme-color-hex") || localStorage.getItem("reclaim-theme-color") || "auto");
  const [videoWallpaperUrl, setVideoWallpaperUrlState] = useState(() => localStorage.getItem("reclaim-video-wallpaper") || null);
  const [wallpaperZoom, setWallpaperZoomState] = useState(() => readNum("reclaim-wallpaper-zoom", DEFAULT_WALLPAPER_ZOOM));
  const [wallpaperPosX, setWallpaperPosXState] = useState(() => readNum("reclaim-wallpaper-posx", DEFAULT_WALLPAPER_POS_X));
  const [wallpaperPosY, setWallpaperPosYState] = useState(() => readNum("reclaim-wallpaper-posy", DEFAULT_WALLPAPER_POS_Y));
  const [streakId, setStreakId] = useState(null);

  const persistCrop = useCallback((zoom, posX, posY) => {
    localStorage.setItem("reclaim-wallpaper-zoom", String(zoom));
    localStorage.setItem("reclaim-wallpaper-posx", String(posX));
    localStorage.setItem("reclaim-wallpaper-posy", String(posY));
    if (streakId) {
      db.entities.Streak.update(streakId, {
        wallpaper_zoom: zoom,
        wallpaper_pos_x: posX,
        wallpaper_pos_y: posY,
      }).catch((e) => console.error(e));
    }
  }, [streakId]);

  // Dark mode only — always apply the dark class
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("dark");
    root.classList.remove("light");
  }, []);

  // Apply the full accent theme. Manual hex colors (incl. black/white/gray)
  // are honored as-is; "auto" matches the wallpaper's dominant hue.
  const applyAccentHue = useCallback(async (url, videoUrl) => {
    const manualHex = localStorage.getItem("reclaim-theme-color-hex");
    const manualHue = localStorage.getItem("reclaim-theme-color");
    let baseHex = "#6366f1";
    if (manualHex) {
      baseHex = manualHex;
    } else if (manualHue && manualHue !== "auto") {
      baseHex = hslToHex(Number(manualHue), 70, 60);
    } else {
      let hue = null;
      if (videoUrl) hue = await extractVideoHue(videoUrl);
      if (hue == null) hue = await extractHue(url);
      baseHex = hslToHex(hue == null ? 240 : Math.round(hue.toFixed(0)), 70, 60);
    }
    applyThemeToRoot(document.documentElement, baseHex);
  }, []);

  useEffect(() => {
    applyAccentHue(wallpaperUrl, videoWallpaperUrl);
  }, [wallpaperUrl, videoWallpaperUrl, themeColor, applyAccentHue]);

  // Load stored video wallpaper data on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!localStorage.getItem("reclaim-video-wallpaper")) return;
      const vid = await readVideoWallpaper();
      if (!cancelled && vid) setVideoWallpaperUrlState(vid);
    })();
    return () => { cancelled = true; };
  }, []);

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
        if (s.video_wallpaper_url) {
          const vid = await readVideoWallpaper();
          if (vid) {
            setVideoWallpaperUrlState(vid);
            localStorage.setItem("reclaim-video-wallpaper", "1");
          }
        }
        if (s.wallpaper_zoom != null) {
          setWallpaperZoomState(Number(s.wallpaper_zoom));
          localStorage.setItem("reclaim-wallpaper-zoom", String(s.wallpaper_zoom));
        }
        if (s.wallpaper_pos_x != null) {
          setWallpaperPosXState(Number(s.wallpaper_pos_x));
          localStorage.setItem("reclaim-wallpaper-posx", String(s.wallpaper_pos_x));
        }
        if (s.wallpaper_pos_y != null) {
          setWallpaperPosYState(Number(s.wallpaper_pos_y));
          localStorage.setItem("reclaim-wallpaper-posy", String(s.wallpaper_pos_y));
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
    setWallpaperZoomState(DEFAULT_WALLPAPER_ZOOM);
    setWallpaperPosXState(DEFAULT_WALLPAPER_POS_X);
    setWallpaperPosYState(DEFAULT_WALLPAPER_POS_Y);
    persistCrop(DEFAULT_WALLPAPER_ZOOM, DEFAULT_WALLPAPER_POS_X, DEFAULT_WALLPAPER_POS_Y);
    if (streakId) {
      try {
        await db.entities.Streak.update(streakId, { wallpaper_blur: DEFAULT_BLUR });
      } catch (e) {
        console.error(e);
      }
    }
  }, [setWallpaper, streakId, persistCrop]);

  const setVideoWallpaper = useCallback(async (dataUrl) => {
    if (!dataUrl) {
      await clearVideoWallpaper();
      setVideoWallpaperUrlState(null);
      if (streakId) {
        try {
          await db.entities.Streak.update(streakId, { video_wallpaper_url: null });
        } catch (e) {
          console.error(e);
        }
      }
      return;
    }
    await saveVideoWallpaper(dataUrl);
    setVideoWallpaperUrlState(dataUrl);
    localStorage.setItem("reclaim-video-wallpaper", "1");
    if (streakId) {
      try {
        await db.entities.Streak.update(streakId, { video_wallpaper_url: "1" });
      } catch (e) {
        console.error(e);
      }
    }
  }, [streakId]);

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
      localStorage.removeItem("reclaim-theme-color-hex");
      localStorage.removeItem("reclaim-theme-color");
    } else if (String(color).startsWith("#")) {
      // Store as hex directly — preserves black/white/desaturated colors
      localStorage.setItem("reclaim-theme-color-hex", String(color));
      localStorage.removeItem("reclaim-theme-color");
    } else {
      // Legacy hue value
      localStorage.setItem("reclaim-theme-color", String(color));
      localStorage.removeItem("reclaim-theme-color-hex");
    }
  }, []);

  const setWallpaperZoom = useCallback((zoom) => {
    const z = Math.max(1, Math.min(3, Number(zoom) || 1));
    setWallpaperZoomState(z);
    persistCrop(z, wallpaperPosX, wallpaperPosY);
  }, [wallpaperPosX, wallpaperPosY, persistCrop]);

  const setWallpaperPosX = useCallback((x) => {
    const v = Math.max(0, Math.min(100, Number(x) || 0));
    setWallpaperPosXState(v);
    persistCrop(wallpaperZoom, v, wallpaperPosY);
  }, [wallpaperZoom, wallpaperPosY, persistCrop]);

  const setWallpaperPosY = useCallback((y) => {
    const v = Math.max(0, Math.min(100, Number(y) || 0));
    setWallpaperPosYState(v);
    persistCrop(wallpaperZoom, wallpaperPosX, v);
  }, [wallpaperZoom, wallpaperPosX, persistCrop]);

  const resetCrop = useCallback(() => {
    setWallpaperZoomState(DEFAULT_WALLPAPER_ZOOM);
    setWallpaperPosXState(DEFAULT_WALLPAPER_POS_X);
    setWallpaperPosYState(DEFAULT_WALLPAPER_POS_Y);
    persistCrop(DEFAULT_WALLPAPER_ZOOM, DEFAULT_WALLPAPER_POS_X, DEFAULT_WALLPAPER_POS_Y);
  }, [persistCrop]);

  // Unified "upload wallpaper" — accepts an image OR video file and uses
  // whichever was chosen (replacing the other), so there's a single upload.
  const uploadWallpaper = useCallback(async (file) => {
    if (!file) return { type: null };
    const isVideo = file.type?.startsWith("video/") || /\.(mp4|webm|mov|m4v|ogv)$/i.test(file.name || "");
    if (isVideo) {
      if (file.size > 50 * 1024 * 1024) {
        throw new Error("Please use a video under 50 MB.");
      }
      const dataUrl = await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.onerror = () => reject(fr.error);
        fr.readAsDataURL(file);
      });
      // A video replaces any image wallpaper
      localStorage.removeItem("reclaim-wallpaper");
      setWallpaperUrlState(DEFAULT_WALLPAPER);
      if (streakId) {
        try {
          await db.entities.Streak.update(streakId, { wallpaper_url: null });
        } catch (e) { console.error(e); }
      }
      await setVideoWallpaper(dataUrl);
      return { type: "video", url: dataUrl };
    }
    // Image — replace any video wallpaper
    await clearVideoWallpaper();
    setVideoWallpaperUrlState(null);
    localStorage.removeItem("reclaim-video-wallpaper");
    if (streakId) {
      try {
        await db.entities.Streak.update(streakId, { video_wallpaper_url: null });
      } catch (e) { console.error(e); }
    }
    const { file_url } = await db.integrations.Core.UploadFile({ file });
    await setWallpaper(file_url);
    return { type: "image", url: file_url };
  }, [streakId, setVideoWallpaper, setWallpaper]);

  const removeWallpaper = useCallback(async () => {
    await setVideoWallpaper(null);
    resetWallpaper();
  }, [setVideoWallpaper, resetWallpaper]);

  const hasCustom = !!localStorage.getItem("reclaim-wallpaper") || !!localStorage.getItem("reclaim-video-wallpaper");
  const isVideoCustom = !!videoWallpaperUrl;

  return (
    <ThemeContext.Provider value={{
      wallpaperUrl, setWallpaper, resetWallpaper,
      wallpaperBlur, setBlur,
      themeColor, setThemeColor,
      videoWallpaperUrl, setVideoWallpaper,
      wallpaperZoom, setWallpaperZoom,
      wallpaperPosX, setWallpaperPosX,
      wallpaperPosY, setWallpaperPosY,
      resetCrop,
      uploadWallpaper, removeWallpaper,
      isVideoCustom,
      hasCustomWallpaper: hasCustom,
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
      videoWallpaperUrl: null,
      setVideoWallpaper: () => {},
      wallpaperZoom: DEFAULT_WALLPAPER_ZOOM,
      setWallpaperZoom: () => {},
      wallpaperPosX: DEFAULT_WALLPAPER_POS_X,
      setWallpaperPosX: () => {},
      wallpaperPosY: DEFAULT_WALLPAPER_POS_Y,
      setWallpaperPosY: () => {},
      resetCrop: () => {},
      uploadWallpaper: () => {},
      removeWallpaper: () => {},
      isVideoCustom: false,
      hasCustomWallpaper: false,
    };
  }
  return ctx;
}
