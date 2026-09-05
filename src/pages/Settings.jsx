import { useState, useEffect, useRef } from "react";
import { db, AI_PROVIDERS } from "@/lib/store";
import { ensureStreakRecord, updateStreak } from "@/lib/streakUtils";
import { useToast } from "@/components/ui/use-toast";
import { useTheme } from "@/lib/ThemeContext";
import { requestNotificationPermission } from "@/lib/notifications";
import { IS_NATIVE } from "@/lib/appInfo";
import { AI_PERSONAS } from "@/lib/aiContext";
import { useAlarm } from "@/components/AlarmSystem";
import { getAlarmAudioSrc, saveCustomAudio, clearCustomAudio, hasCustomAudio as hasCustomAudioStored, durationLabel } from "@/lib/alarm";
import { LocalNotification } from "@/lib/localNotifications";
import {
  User, Bell, Heart, Target, Save, Sparkles, Trash2,
  Palette, Image, Bot, Upload, Copy, Check,
  Wifi, WifiOff, Download, ArchiveRestore, FileUp, Bitcoin, Wallet,
  AlarmClock, Volume2, Music, Crop, Move, RotateCcw,
  Moon, Plus, Pencil, Camera,
} from "lucide-react";
import { exportBackup, importBackup } from "@/lib/backup";
import { cn } from "@/lib/utils";

const TONES = [
  { key: "gentle", label: "Gentle & Kind", desc: "Warm, supportive, forgiving" },
  { key: "tough", label: "Tough Love", desc: "Direct, no-nonsense, motivational" },
  { key: "spiritual", label: "Spiritual", desc: "Soulful, mindful, transcendent" },
  { key: "scientific", label: "Scientific", desc: "Brain-based, factual, logical" },
];

const GOALS = [7, 14, 30, 45, 60, 90, 180, 365];

const TABS = [
  { key: "ai", label: "AI", icon: Bot },
  { key: "customize", label: "Customization", icon: Palette },
  { key: "reminders", label: "Reminders & Alarm", icon: AlarmClock },
  { key: "data", label: "Backup & Data", icon: ArchiveRestore },
];

// Convert a stored hue (0–360) into a hex value for the <input type="color">.
function hslToHex(hue) {
  const h = (((Number(hue) % 360) + 360) % 360) / 360;
  const s = 0.7;
  const l = 0.6;
  const f = (n) => {
    const k = (n + h * 12) % 12;
    const c = l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(255 * c).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Extract the dominant hue (0–360) from a hex color for the manual theme color.
function hueFromHex(hex) {
  const m = String(hex || "").replace(/^#/, "");
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const int = parseInt(full.slice(0, 6), 16);
  if (!Number.isFinite(int)) return "auto";
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return "auto";
  let h;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h = Math.round(h * 60);
  if (h < 0) h += 360;
  return String(h);
}

export default function Settings() {
  const { toast } = useToast();
  const { wallpaperUrl, wallpaperBlur, setBlur, themeColor, setThemeColor, hasCustomWallpaper, videoWallpaperUrl, wallpaperZoom, setWallpaperZoom, wallpaperPosX, setWallpaperPosX, wallpaperPosY, setWallpaperPosY, resetCrop, uploadWallpaper, removeWallpaper, isVideoCustom } = useTheme();
  const [streak, setStreak] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [aiPersona, setAiPersona] = useState("mentor");
  const fileRef = useRef(null);
  const restoreRef = useRef(null);
  const dragRef = useRef(null);
  const charFileRef = useRef(null);
  const [backupCode, setBackupCode] = useState("");
  const [restoreCode, setRestoreCode] = useState("");
  const [backupMsg, setBackupMsg] = useState("");
  const [restoreMsg, setRestoreMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState("ai");
  const [characters, setCharacters] = useState([]);
  const [charForm, setCharForm] = useState(null);

  // AI provider form state
  const [aiConfig, setAiConfig] = useState({ provider: "local", apiKey: "", baseUrl: "", model: "" });
  const [aiSaving, setAiSaving] = useState(false);
  const [aiTesting, setAiTesting] = useState(false);
  const [aiSaved, setAiSaved] = useState(false);
  const [wallpaperMsg, setWallpaperMsg] = useState("");
  const [resetMsg, setResetMsg] = useState("");

  // Local form state
  const [name, setName] = useState("");
  const [tone, setTone] = useState("gentle");
  const [goal, setGoal] = useState(30);
  const [sleepGoal, setSleepGoal] = useState(30);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("09:00");
  const [customMotivation, setCustomMotivation] = useState("");

  // Removed password/recovery state
  const [notifState, setNotifState] = useState("default");
  const [copiedAddr, setCopiedAddr] = useState("");

  // Alarm state
  const { settings: alarm, save: saveAlarm } = useAlarm();
  const alarmAudioRef = useRef(null);
  const alarmFileRef = useRef(null);
  const [alarmTesting, setAlarmTesting] = useState(false);
  const [hasCustomAudio, setHasCustomAudio] = useState(false);

  const stopAlarmTest = () => {
    if (alarmAudioRef.current) {
      alarmAudioRef.current.pause();
      alarmAudioRef.current.currentTime = 0;
    }
    setAlarmTesting(false);
  };

  const playAlarmTest = async () => {
    if (!alarm) return;
    stopAlarmTest();
    const a = new Audio();
    try {
      a.src = await getAlarmAudioSrc(alarm);
    } catch (e) {
      toast({ title: "Playback failed", description: "Could not load this audio.", variant: "destructive" });
      setAlarmTesting(false);
      return;
    }
    alarmAudioRef.current = a;
    a.loop = false;
    a.volume = 1;
    a.play().catch((e) => {
      toast({ title: "Playback failed", description: "Could not play this audio.", variant: "destructive" });
      setAlarmTesting(false);
    });
    setAlarmTesting(true);
    a.onended = () => setAlarmTesting(false);
  };

  const copyText = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAddr(key);
      setTimeout(() => setCopiedAddr(""), 1500);
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopiedAddr(key);
      setTimeout(() => setCopiedAddr(""), 1500);
    }
  };

  const updateDragFromEvent = (e) => {
    const el = dragRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX ?? e.touches?.[0]?.clientX ?? 0) - rect.left) / rect.width * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY ?? e.touches?.[0]?.clientY ?? 0) - rect.top) / rect.height * 100));
    setWallpaperPosX(x);
    setWallpaperPosY(y);
  };

  const startDrag = (e) => {
    e.preventDefault();
    dragRef.current = e.currentTarget;
    updateDragFromEvent(e);
    const move = (ev) => updateDragFromEvent(ev);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      dragRef.current = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  const onDrag = (e) => {
    if (dragRef.current) {
      e.preventDefault();
      updateDragFromEvent(e);
    }
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  useEffect(() => {
    (async () => {
      try {
        const s = await ensureStreakRecord();
        setStreak(s);
        setName(s.user_name || "");
        setTone(s.motivation_tone || "gentle");
        setGoal(s.current_goal_days || 30);
        setSleepGoal(s.sleep_goal_days || 30);
        setReminderEnabled(s.daily_reminder_enabled ?? false);
        setReminderTime(s.daily_reminder_time || "09:00");
        setCustomMotivation(s.custom_motivation || "");
        setAiPersona(s.ai_persona || "mentor");
        setNotifState("Notification" in window ? Notification.permission : "denied");
        const [cfg, chars] = await Promise.all([db.ai.getConfig(), db.ai.getChars()]);
        setAiConfig(cfg);
        setCharacters(chars);
        setHasCustomAudio(await hasCustomAudioStored());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Stop any in-progress test sound when leaving settings
  useEffect(() => {
    return () => {
      if (alarmAudioRef.current) {
        alarmAudioRef.current.pause();
        alarmAudioRef.current = null;
      }
    };
  }, []);

  const selectAIConfig = (cfg) => {
    setAiConfig(cfg);
    setAiSaved(false);
  };

  const saveAIConfig = async () => {
    setAiSaving(true);
    setAiSaved(false);
    try {
      const cleaned = {
        ...aiConfig,
        apiKey: (aiConfig.apiKey || "").trim(),
      };
      if (cleaned.provider !== "custom") {
        cleaned.baseUrl = AI_PROVIDERS[cleaned.provider].baseUrl;
      }
      await db.ai.saveConfig(cleaned);
      setAiConfig(cleaned);
      setAiSaved(true);
      setTimeout(() => setAiSaved(false), 2500);
    } catch (e) {
      console.error(e);
    } finally {
      setAiSaving(false);
    }
  };

  const testAIConfig = async () => {
    setAiTesting(true);
    try {
      const cleaned = {
        ...aiConfig,
        apiKey: (aiConfig.apiKey || "").trim(),
      };
      if (cleaned.provider !== "custom") {
        cleaned.baseUrl = AI_PROVIDERS[cleaned.provider].baseUrl;
      }
      await db.ai.test(cleaned);
      toast({ title: "Connection works", description: "Your AI provider is reachable." });
    } catch (e) {
      toast({ title: "Connection failed", description: e.message, variant: "destructive" });
    } finally {
      setAiTesting(false);
    }
  };

  const handleSave = async (data) => {
    try {
      const updated = await updateStreak(streak.id, data);
      setStreak(updated);
    } catch (e) {
      console.error(e);
    }
  };

  const sanitizePersona = (p) => {
    if (AI_PERSONAS[p]) return p;
    if (characters.some((c) => `char:${c.id}` === p)) return p;
    return "mentor";
  };
  const activePersona = sanitizePersona(aiPersona);

  const selectCharPersona = async (c) => {
    const p = `char:${c.id}`;
    setAiPersona(p);
    try {
      const s = await ensureStreakRecord();
      await db.entities.Streak.update(s.id, { ai_persona: p });
    } catch (e) {
      console.error(e);
    }
  };

  const saveChar = async () => {
    if (!charForm || !charForm.name.trim()) return;
    const now = new Date().toISOString();
    const char = {
      id: charForm.id || `char_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      name: charForm.name.trim(),
      persona: (charForm.persona || "").trim(),
      avatar: charForm.avatar || null,
      createdAt: charForm.createdAt || now,
      updatedAt: now,
    };
    try {
      await db.ai.saveChar(char);
      setCharacters(await db.ai.getChars());
      setCharForm(null);
      toast({ title: charForm.id ? "Character updated" : "Character created", description: `"${char.name}" is ready in your AI coach.` });
    } catch (err) {
      toast({ title: "Could not save character", description: err?.message, variant: "destructive" });
    }
  };

  const deleteChar = async (c) => {
    if (!confirm(`Delete "${c.name}"? This can't be undone.`)) return;
    try {
      await db.ai.deleteChar(c.id);
      setCharacters(await db.ai.getChars());
      if (aiPersona === `char:${c.id}`) {
        setAiPersona("mentor");
        const s = await ensureStreakRecord();
        await db.entities.Streak.update(s.id, { ai_persona: "mentor" });
      }
      toast({ title: "Character deleted", description: `"${c.name}" was removed.` });
    } catch (e) {
      toast({ title: "Could not delete character", description: e?.message, variant: "destructive" });
    }
  };

  const handleCharAvatar = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Please use an image under 4 MB.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        const size = 256;
        const scale = Math.min(1, size / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(img.width * scale));
        c.height = Math.max(1, Math.round(img.height * scale));
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        const dataUrl = c.toDataURL("image/jpeg", 0.82);
        setCharForm((f) => (f ? { ...f, avatar: dataUrl } : f));
      };
      img.onerror = () => toast({ title: "Could not read image", description: "That file doesn't look like a picture.", variant: "destructive" });
      const src = typeof reader.result === "string" ? reader.result : "";
      if (!src) return;
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  // Auto-save: settings persist automatically as you change them
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!streak) return;
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      return;
    }
    const t = setTimeout(() => {
      handleSave({
        user_name: name,
        motivation_tone: tone,
        current_goal_days: goal,
        sleep_goal_days: sleepGoal,
        daily_reminder_enabled: reminderEnabled,
        daily_reminder_time: reminderTime,
        custom_motivation: customMotivation,
      });
    }, 400);
    return () => clearTimeout(t);
  }, [name, tone, goal, sleepGoal, reminderEnabled, reminderTime, customMotivation]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-slate-700 border-t-indigo-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-5 pt-12 pb-4">
      <h1 className="text-xl font-bold text-white light:text-slate-800 mb-1">Settings</h1>
      <p className="text-xs text-slate-500 mb-4">Make this app yours. Customize everything.</p>

      {/* Tab bar */}
      <div className="flex gap-1.5 overflow-x-auto pb-3 mb-3 -mx-5 px-5 scrollbar-hide">
        {TABS.map((t) => {
          const Ic = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key);
              }}
              className={cn(
                "shrink-0 px-3.5 py-2 rounded-full text-xs font-medium border flex items-center gap-1.5 transition-all",
                tab === t.key
                  ? "bg-indigo-500/20 border-indigo-400/40 text-indigo-200"
                  : "bg-white/5 border-white/5 text-slate-400"
              )}
            >
              <Ic className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "ai" && (<>
      {/* AI Provider */}
      <Section icon={Bot} title="AI Provider">
        <p className="text-xs text-slate-400 mb-3 leading-relaxed">
          Pick who powers your AI coach. Your key is stored only on this device. The offline coach works everywhere, free and private.
        </p>
        <div className="space-y-2 mb-4">
          {Object.entries(AI_PROVIDERS).map(([key, p]) => (
            <button
              key={key}
              onClick={() => selectAIConfig({
                ...aiConfig,
                provider: key,
                apiKey: aiConfig.apiKey || "",
                baseUrl: aiConfig.baseUrl || p.baseUrl,
                model: aiConfig.model || p.model,
              })}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left",
                aiConfig.provider === key
                  ? "bg-indigo-500/15 border-indigo-400/40"
                  : "bg-white/5 border-white/5"
              )}
            >
              <div className="flex items-center gap-3">
                {p.needsKey ? (
                  <Wifi className={cn("w-4 h-4", aiConfig.provider === key ? "text-indigo-300" : "text-slate-500")} />
                ) : (
                  <WifiOff className={cn("w-4 h-4", aiConfig.provider === key ? "text-indigo-300" : "text-slate-500")} />
                )}
                <div>
                  <p className={cn("text-sm font-medium", aiConfig.provider === key ? "text-indigo-200" : "text-slate-300")}>{p.name}</p>
                  <p className="text-[11px] text-slate-500">{p.desc}</p>
                </div>
              </div>
              <div className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                aiConfig.provider === key ? "border-indigo-400 bg-indigo-500/30" : "border-white/20"
              )}>
                {aiConfig.provider === key && <div className="w-2 h-2 rounded-full bg-indigo-300" />}
              </div>
            </button>
          ))}
        </div>

        {aiConfig.provider !== "local" && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">API Key</label>
              <input
                type="password"
                value={aiConfig.apiKey}
                onChange={(e) => selectAIConfig({ ...aiConfig, apiKey: e.target.value })}
                placeholder="sk-..."
                autoComplete="off"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-400/50"
              />
              <p className="text-[10px] text-slate-500 mt-1">Never sent anywhere except directly to {AI_PROVIDERS[aiConfig.provider].name}.</p>
            </div>
            {aiConfig.provider === "custom" && (
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Base URL</label>
                <input
                  type="text"
                  value={aiConfig.baseUrl}
                  onChange={(e) => selectAIConfig({ ...aiConfig, baseUrl: e.target.value })}
                  placeholder="https://your-api.example.com/v1"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-400/50"
                />
              </div>
            )}
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Model</label>
              <input
                type="text"
                value={aiConfig.model}
                onChange={(e) => selectAIConfig({ ...aiConfig, model: e.target.value })}
                placeholder={AI_PROVIDERS[aiConfig.provider].model || "model name"}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-400/50"
              />
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <button
            onClick={testAIConfig}
            disabled={aiTesting || aiConfig.provider === "local"}
            className={cn(
              "flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors",
              aiConfig.provider === "local"
                ? "bg-white/5 border-white/5 text-slate-500"
                : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
            )}
          >
            {aiTesting ? (
              <><div className="w-3.5 h-3.5 border-2 border-slate-500 border-t-indigo-400 rounded-full animate-spin inline-block mr-1.5 align-middle" /> Testing...</>
            ) : (
              "Test connection"
            )}
          </button>
          <button
            onClick={saveAIConfig}
            disabled={aiSaving}
            className="flex-1 py-2.5 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-sm font-medium hover:bg-indigo-500/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {aiSaving ? (
              <><div className="w-3.5 h-3.5 border-2 border-indigo-300 border-t-transparent rounded-full animate-spin" /> Saving...</>
            ) : (
              <><Save className="w-3.5 h-3.5" /> {aiSaved ? "Saved" : "Save"}</>
            )}
          </button>
        </div>
        {aiSaved && (
          <p className="text-[11px] text-emerald-400/80 mt-2 flex items-center gap-1">
            <Check className="w-3 h-3" /> AI provider saved. Your coach will use it now.
          </p>
        )}
      </Section>

      {/* AI Coach Persona */}
      <Section icon={Bot} title="AI Coach Persona">
        <p className="text-xs text-slate-400 mb-3">Choose how your AI coach talks to you</p>
        <div className="space-y-2">
          {Object.entries(AI_PERSONAS).map(([key, p]) => (
            <button
              key={key}
              onClick={async () => {
                setAiPersona(key);
                try {
                  const s = await ensureStreakRecord();
                  await db.entities.Streak.update(s.id, { ai_persona: key });
                } catch (e) { console.error(e); }
              }}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left",
                activePersona === key ? "bg-indigo-500/15 border-indigo-400/40" : "bg-white/5 border-white/5"
              )}
            >
              <div>
                <p className={cn("text-sm font-medium", activePersona === key ? "text-indigo-200" : "text-slate-300")}>{p.name}</p>
                <p className="text-[11px] text-slate-500">{p.desc}</p>
              </div>
              <div className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                activePersona === key ? "border-indigo-400 bg-indigo-500/30" : "border-white/20"
              )}>
                {activePersona === key && <div className="w-2 h-2 rounded-full bg-indigo-300" />}
              </div>
            </button>
          ))}
        </div>

        {/* Your Own Characters — replaces the old Custom persona */}
        <div className="mt-5 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-slate-300">Your Own Characters</p>
            <button
              onClick={() => setCharForm({ id: null, name: "", persona: "", avatar: null })}
              className="text-[11px] text-indigo-300 flex items-center gap-1 hover:text-indigo-200"
            >
              <Plus className="w-3.5 h-3.5" /> Add character
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
            Build your own AI characters — a name, a personality prompt, and a profile
            picture. They appear in the AI coach under "Characters".
          </p>

          {characters.length === 0 && (
            <p className="text-[11px] text-slate-500 bg-white/5 rounded-xl px-3 py-2.5">
              No characters yet. Tap "Add character" to create your first one.
            </p>
          )}

          <div className="space-y-2">
            {characters.map((c) => {
              const active = `char:${c.id}` === activePersona;
              return (
                <div
                  key={c.id}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-3 py-2.5",
                    active ? "bg-indigo-500/10 border-indigo-400/30" : "bg-white/5 border-white/5"
                  )}
                >
                  {c.avatar ? (
                    <img src={c.avatar} alt={c.name} className="w-10 h-10 rounded-full object-cover border border-white/10" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500/30 to-purple-500/20 border border-indigo-400/20 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-indigo-300" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{c.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {c.persona ? c.persona.replace(/\s+/g, " ").trim() : "No personality prompt yet"}
                    </p>
                    {active && <p className="text-[9px] text-indigo-300 mt-0.5">Active in AI coach</p>}
                  </div>
                  <button
                    onClick={() => deleteChar(c)}
                    className="w-8 h-8 rounded-full text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center shrink-0"
                    aria-label={`Delete ${c.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setCharForm(c)}
                    className="w-8 h-8 rounded-full text-slate-400 hover:text-indigo-300 hover:bg-indigo-500/10 flex items-center justify-center shrink-0"
                    aria-label={`Edit ${c.name}`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => selectCharPersona(c)}
                    className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                      active ? "border-indigo-400 bg-indigo-500/30" : "border-white/20"
                    )}
                    aria-label={`Use ${c.name} in AI coach`}
                  >
                    {active && <div className="w-2 h-2 rounded-full bg-indigo-300" />}
                  </button>
                </div>
              );
            })}
          </div>

          {charForm && (
            <div className="mt-3 rounded-xl bg-black/20 border border-white/10 p-3 space-y-3">
              <div className="flex items-center gap-2">
                {charForm.avatar ? (
                  <img src={charForm.avatar} alt="" className="w-11 h-11 rounded-full object-cover border border-white/10" />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500/30 to-purple-500/20 border border-indigo-400/20 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-indigo-300" />
                  </div>
                )}
                <button
                  onClick={() => charFileRef.current?.click()}
                  className="text-[11px] text-indigo-300 flex items-center gap-1 hover:text-indigo-200"
                >
                  <Camera className="w-3.5 h-3.5" /> {charForm.avatar ? "Change photo" : "Add photo"}
                </button>
                {charForm.avatar && (
                  <button onClick={() => setCharForm((f) => (f ? { ...f, avatar: null } : f))} className="text-[11px] text-slate-500 hover:text-slate-400">
                    Remove
                  </button>
                )}
                <input
                  ref={charFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCharAvatar}
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Character name</label>
                <input
                  value={charForm.name}
                  onChange={(e) => setCharForm((f) => (f ? { ...f, name: e.target.value } : f))}
                  placeholder="e.g. Nazuna Nanakusa"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-400/50"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Personality prompt</label>
                <textarea
                  value={charForm.persona}
                  onChange={(e) => setCharForm((f) => (f ? { ...f, persona: e.target.value } : f))}
                  placeholder={'Describe who they are and how they coach you. Example: "You are Nazuna Nanakusa from Call of the Night. Lay-back, playful, a bit teasing, but deeply caring about helping me quit gooning. Stay in character with a relaxed, anime-girl tone."'}
                  className="w-full h-28 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 resize-none focus:outline-none focus:border-indigo-400/50"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Your AI will fully role-play this personality while coaching you.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={saveChar}
                  disabled={!charForm.name.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-medium hover:bg-indigo-500/30 transition-colors disabled:opacity-50"
                >
                  {charForm.id ? "Save changes" : "Add character"}
                </button>
                <button
                  onClick={() => setCharForm(null)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-xs font-medium hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </Section>
      </>)}
      {tab === "customize" && (<>

      {/* Appearance */}
      <Section icon={Palette} title="Appearance">
        <p className="text-xs text-slate-400 mb-2">Wallpaper</p>
        <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
          Upload one wallpaper — an image or a looping video. It's shown everywhere,
          and your accent color auto-matches its dominant hue (or pick your own below).
        </p>
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <><div className="w-4 h-4 border-2 border-slate-600 border-t-indigo-400 rounded-full animate-spin" /> Uploading...</>
            ) : (
              <><Upload className="w-4 h-4" /> Upload Wallpaper</>
            )}
          </button>
          {hasCustomWallpaper && (
            <button
              onClick={async () => {
                await removeWallpaper();
                setWallpaperMsg("Removed your wallpaper — back to the default.");
                setTimeout(() => setWallpaperMsg(""), 2500);
              }}
              className="px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm"
            >
              Remove
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setUploading(true);
              try {
                const res = await uploadWallpaper(file);
                setWallpaperMsg(res?.type === "video" ? "Video wallpaper set." : "Wallpaper set.");
                setTimeout(() => setWallpaperMsg(""), 2500);
              } catch (err) {
                toast({ title: "Upload failed", description: err?.message, variant: "destructive" });
              } finally {
                setUploading(false);
              }
            }}
          />
        </div>

        {wallpaperMsg && (
          <p className="text-[11px] text-emerald-400/80 mb-2 flex items-center gap-1">
            <Check className="w-3 h-3" /> {wallpaperMsg}
          </p>
        )}

        {(isVideoCustom || wallpaperUrl) && (
          <>
            {/* Blur */}
            <div className="mb-3">
              <div className="flex justify-between mb-1">
                <label className="text-xs text-slate-400 flex items-center gap-1"><Image className="w-3 h-3" /> Blur</label>
                <span className="text-xs text-indigo-300">{wallpaperBlur}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                step="1"
                value={wallpaperBlur}
                onChange={(e) => setBlur(Number(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Zoom */}
            <div className="mb-3">
              <div className="flex justify-between mb-1">
                <label className="text-xs text-slate-400 flex items-center gap-1"><Crop className="w-3 h-3" /> Zoom</label>
                <span className="text-xs text-indigo-300">{Math.round(wallpaperZoom * 100)}%</span>
              </div>
              <input
                type="range"
                min="100"
                max="300"
                step="1"
                value={Math.round(wallpaperZoom * 100)}
                onChange={(e) => setWallpaperZoom(Number(e.target.value) / 100)}
                className="w-full"
              />
            </div>

            {/* Manual position (crop) — drag to choose where the wallpaper shows */}
            <div className="mb-3">
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs text-slate-400 flex items-center gap-1"><Move className="w-3 h-3" /> Position</label>
                <button
                  onClick={resetCrop}
                  className="text-[10px] text-indigo-300 flex items-center gap-1 hover:text-indigo-200"
                >
                  <RotateCcw className="w-3 h-3" /> Reset crop
                </button>
              </div>
              <div
                className="relative w-full h-32 rounded-xl border border-white/10 overflow-hidden cursor-grab active:cursor-grabbing select-none touch-none"
                onPointerDown={startDrag}
                onPointerMove={onDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
              >
                {isVideoCustom ? (
                  <video
                    src={videoWallpaperUrl}
                    muted
                    autoPlay
                    loop
                    playsInline
                    preload="auto"
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    style={{
                      transform: `scale(${(wallpaperZoom || 1) * (1 + wallpaperBlur / 30)})`,
                      objectPosition: `${wallpaperPosX}% ${wallpaperPosY}%`,
                      filter: `blur(${wallpaperBlur}px)`,
                    }}
                  />
                ) : (
                  <img
                    src={wallpaperUrl}
                    alt=""
                    draggable={false}
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    style={{
                      transform: `scale(${(wallpaperZoom || 1) * (1 + wallpaperBlur / 30)})`,
                      objectPosition: `${wallpaperPosX}% ${wallpaperPosY}%`,
                      filter: `blur(${wallpaperBlur}px)`,
                    }}
                  />
                )}
                <div className="absolute inset-0 bg-black/25 pointer-events-none" />
                {/* Crosshair + drag hint */}
                <div
                  className="absolute w-6 h-6 rounded-full border-2 border-white/70 pointer-events-none -translate-x-1/2 -translate-y-1/2 shadow-lg"
                  style={{ left: `${wallpaperPosX}%`, top: `${wallpaperPosY}%` }}
                />
                <p className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[10px] text-white/70 bg-black/40 rounded-full px-2 py-0.5 pointer-events-none">
                  Drag to choose where it shows
                </p>
              </div>
            </div>

            {/* Big preview */}
            <div className="rounded-xl overflow-hidden border border-white/10 mb-1">
              {isVideoCustom ? (
                <video src={videoWallpaperUrl} muted autoPlay loop playsInline className="w-full h-24 object-cover pointer-events-none" />
              ) : (
                <img src={wallpaperUrl} alt="wallpaper preview" className="w-full h-24 object-cover" />
              )}
            </div>
          </>
        )}

        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs text-slate-400 flex items-center gap-1"><Palette className="w-3 h-3" /> Theme color</label>
          </div>
          <div className="flex items-center gap-3">
            <label
              title="Tap to pick a custom theme color"
              className={cn(
                "relative w-12 h-12 rounded-full border-2 overflow-hidden cursor-pointer shrink-0 transition-colors",
                themeColor === "auto" ? "border-white/20" : "border-indigo-400/70"
              )}
            >
              <span
                className="absolute inset-0"
                style={{ background: themeColor === "auto" ? "#6366f1" : hslToHex(themeColor) }}
              />
              {themeColor === "auto" && (
                <span className="absolute inset-0 bg-black/45 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white/80" />
                </span>
              )}
              <input
                type="color"
                value={themeColor === "auto" ? "#6366f1" : hslToHex(themeColor)}
                onChange={(e) => setThemeColor(hueFromHex(e.target.value))}
                aria-label="Pick a custom theme color"
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </label>
            <div className="flex-1 min-w-0">
              <button
                onClick={() => setThemeColor("auto")}
                className={cn(
                  "px-3 py-2 rounded-xl border text-xs font-medium transition-all",
                  themeColor === "auto"
                    ? "bg-indigo-500/15 border-indigo-400/40 text-indigo-200"
                    : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                )}
              >
                <Sparkles className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" /> Auto (match wallpaper)
              </button>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
            {themeColor === "auto"
              ? "Auto — your accent color matches your wallpaper. Tap the color circle to pick a custom color instead."
              : `Custom color set (hue ${themeColor}°). Tap the circle to change it, or switch back to Auto to match your wallpaper.`}
          </p>
        </div>
      </Section>

      {/* Profile */}
      <Section icon={User} title="Profile">
        <div>
          <label className="text-xs text-slate-400 mb-1.5 block">Your Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="What should we call you?"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-400/50"
          />
        </div>
      </Section>

      {/* No Goon Goal */}
      <Section icon={Target} title="No Goon Goal">
        <p className="text-xs text-slate-400 mb-3">What streak are you working toward?</p>
        <div className="grid grid-cols-4 gap-2">
          {GOALS.map((g) => (
            <button
              key={g}
              onClick={() => setGoal(g)}
              className={cn(
                "py-2.5 rounded-xl text-sm font-bold border transition-all",
                goal === g
                  ? "bg-indigo-500/20 border-indigo-400/50 text-indigo-200"
                  : "bg-white/5 border-white/5 text-slate-400"
              )}
            >
              {g}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-slate-500 mt-2">
          {goal === 90 ? "🎯 90 days — the full brain rewiring milestone." : goal === 30 ? "Survive the hardest month." : `${goal} days of mastery.`}
        </p>
      </Section>

      {/* Sleep Goal */}
      <Section icon={Moon} title="Sleep Goal">
        <p className="text-xs text-slate-400 mb-1">How many nights of healthy sleep are you working toward?</p>
        <p className="text-[11px] text-slate-500 mb-3">Your bedtime streak counts one night each time you get 7–10 hours of rest.</p>
        <div className="grid grid-cols-4 gap-2">
          {GOALS.map((g) => (
            <button
              key={g}
              onClick={() => setSleepGoal(g)}
              className={cn(
                "py-2.5 rounded-xl text-sm font-bold border transition-all",
                sleepGoal === g
                  ? "bg-indigo-500/20 border-indigo-400/50 text-indigo-200"
                  : "bg-white/5 border-white/5 text-slate-400"
              )}
            >
              {g}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-slate-500 mt-2">
          {sleepGoal === 90 ? "🎯 90 nights — deep, lasting sleep habits." : sleepGoal === 30 ? "Build a month of healthy nights." : `${sleepGoal} nights of healthy sleep.`}
        </p>
      </Section>

      {/* Motivation tone */}
      <Section icon={Heart} title="Motivation Tone">
        <p className="text-xs text-slate-400 mb-3">How do you want to be spoken to?</p>
        <div className="space-y-2">
          {TONES.map((t) => (
            <button
              key={t.key}
              onClick={() => setTone(t.key)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left",
                tone === t.key
                  ? "bg-indigo-500/15 border-indigo-400/40"
                  : "bg-white/5 border-white/5"
              )}
            >
              <div>
                <p className={cn("text-sm font-medium", tone === t.key ? "text-indigo-200" : "text-slate-300")}>
                  {t.label}
                </p>
                <p className="text-[11px] text-slate-500">{t.desc}</p>
              </div>
              <div className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                tone === t.key ? "border-indigo-400 bg-indigo-500/30" : "border-white/20"
              )}>
                {tone === t.key && <div className="w-2 h-2 rounded-full bg-indigo-300" />}
              </div>
            </button>
          ))}
        </div>
      </Section>

      {/* Custom motivation */}
      <Section icon={Sparkles} title="Custom Motivation">
        <p className="text-xs text-slate-400 mb-2">Your own words. Shown on the dashboard.</p>
        <textarea
          value={customMotivation}
          onChange={(e) => setCustomMotivation(e.target.value)}
          placeholder="Write something that resonates with you — a promise to yourself, a reason, a quote..."
          className="w-full h-20 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 resize-none focus:outline-none focus:border-indigo-400/50"
        />
      </Section>

      </>)}
      {tab === "reminders" && (<>

      {/* Notifications */}
      <Section icon={Bell} title="Daily Reminder">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-medium text-white">Enable daily check-in reminder</p>
            <p className="text-[11px] text-slate-500">We'll remind you to check in</p>
          </div>
          <button
            onClick={async () => {
              const next = !reminderEnabled;
              setReminderEnabled(next);
              if (next) {
                try {
                  const perm = await requestNotificationPermission();
                  setNotifState(perm);
                } catch (e) {
                  console.error(e);
                }
              }
              try {
                const { rescheduleReminder } = await import("@/lib/notifications");
                await rescheduleReminder();
              } catch (e) {
                console.error(e);
              }
            }}
            className={cn(
              "w-12 h-7 rounded-full transition-colors relative",
              reminderEnabled ? "bg-indigo-500" : "bg-white/10"
            )}
          >
            <div className={cn(
              "absolute top-0.5 w-6 h-6 rounded-full bg-white transition-transform",
              reminderEnabled ? "translate-x-5" : "translate-x-0.5"
            )} />
          </button>
        </div>
        {reminderEnabled && (
          <div className="flex items-center gap-3">
            <label className="text-xs text-slate-400">Reminder time</label>
            <input
              type="time"
              value={reminderTime}
              onChange={(e) => {
                setReminderTime(e.target.value);
                (async () => {
                  try {
                    const { rescheduleReminder } = await import("@/lib/notifications");
                    await rescheduleReminder();
                  } catch (err) {
                    console.error(err);
                  }
                })();
              }}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
            />
          </div>
        )}
        {IS_NATIVE && reminderEnabled && (
          <p className="text-[10px] text-emerald-400/70 mt-2">
            ✓ Daily notification scheduled on this device
          </p>
        )}
        {!("Notification" in window) && !IS_NATIVE && (
          <p className="text-[10px] text-amber-400/70 mt-2">
            Note: Your browser doesn't support notifications. For full push notifications, install this app on your phone.
          </p>
        )}
        {"Notification" in window && !IS_NATIVE && notifState === "granted" && (
          <p className="text-[10px] text-emerald-400/70 mt-2">✓ Notifications enabled</p>
        )}
        {"Notification" in window && !IS_NATIVE && notifState === "default" && (
          <button
            onClick={async () => {
              await requestNotificationPermission();
              setNotifState(Notification.permission);
            }}
            className="mt-2 text-[11px] text-indigo-300 underline"
          >
            Enable browser notifications
          </button>
        )}
      </Section>

      {/* Sleep Alarm */}
      <Section icon={AlarmClock} title="Sleep Alarm">
        <p className="text-xs text-slate-400 mb-3 leading-relaxed">
          Wake up to a Healen alarm after a healthy night of rest. It rings
          once, 7-10 hours after your sleep session starts — then never again
          until your next night.
        </p>

        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-white">Enable alarm</p>
            <p className="text-[11px] text-slate-500">
              {alarm?.enabled
                ? `Rings after ${durationLabel(alarm?.durationMin)} of rest`
                : "Alarm is off"}
            </p>
          </div>
          <button
            onClick={async () => {
              if (!alarm) return;
              const next = !alarm.enabled;
              if (next) {
                if (IS_NATIVE) {
                  try {
                    await LocalNotification.requestPermission();
                  } catch (e) {
                    console.error(e);
                  }
                }
                await saveAlarm({ enabled: true });
              } else {
                await saveAlarm({ enabled: false });
                if (IS_NATIVE) {
                  try {
                    await LocalNotification.cancelAlarm();
                  } catch (e) {
                    console.error(e);
                  }
                }
              }
            }}
            className={cn(
              "w-12 h-7 rounded-full transition-colors relative",
              alarm?.enabled ? "bg-indigo-500" : "bg-white/10"
            )}
          >
            <div className={cn(
              "absolute top-0.5 w-6 h-6 rounded-full bg-white transition-transform",
              alarm?.enabled ? "translate-x-5" : "translate-x-0.5"
            )} />
          </button>
        </div>

        {alarm?.enabled && (
          <div className="mb-4">
            <div className="flex justify-between mb-1.5">
              <label className="text-xs text-slate-400">Sleep goal</label>
              <span className="text-xs font-bold text-indigo-300 tabular-nums">
                {durationLabel(alarm.durationMin)}
              </span>
            </div>
            <input
              type="range"
              min="420"
              max="600"
              step="5"
              value={alarm.durationMin}
              onChange={(e) => saveAlarm({ durationMin: Number(e.target.value) })}
              className="w-full"
            />
            <p className="text-[10px] text-slate-500 mt-1 flex justify-between">
              <span>7h</span>
              <span>8h</span>
              <span>9h</span>
              <span>10h</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Your alarm rings after this much rest, once per night.
            </p>
          </div>
        )}

        <p className="text-xs text-slate-400 mb-2">Alarm sound</p>
        <div className="space-y-2 mb-4">
          <button
            onClick={() => saveAlarm({ sound: "default" })}
            className={cn(
              "w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left",
              alarm?.sound === "default" || !alarm?.sound
                ? "bg-indigo-500/15 border-indigo-400/40"
                : "bg-white/5 border-white/5"
            )}
          >
            <div className="flex items-center gap-3">
              <Music className={cn("w-4 h-4", alarm?.sound === "default" || !alarm?.sound ? "text-indigo-300" : "text-slate-500")} />
              <p className={cn("text-sm font-medium", alarm?.sound === "default" || !alarm?.sound ? "text-indigo-200" : "text-slate-300")}>
                Default ringtone
              </p>
            </div>
            <div className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center",
              alarm?.sound === "default" || !alarm?.sound ? "border-indigo-400 bg-indigo-500/30" : "border-white/20"
            )}>
              {(alarm?.sound === "default" || !alarm?.sound) && <div className="w-2 h-2 rounded-full bg-indigo-300" />}
            </div>
          </button>

          <button
            onClick={() => {
              if (hasCustomAudio) saveAlarm({ sound: "custom" });
              else alarmFileRef.current?.click();
            }}
            className={cn(
              "w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left",
              alarm?.sound === "custom"
                ? "bg-indigo-500/15 border-indigo-400/40"
                : "bg-white/5 border-white/5"
            )}
          >
            <div className="flex items-center gap-3">
              <Upload className={cn("w-4 h-4", alarm?.sound === "custom" ? "text-indigo-300" : "text-slate-500")} />
              <div>
                <p className={cn("text-sm font-medium", alarm?.sound === "custom" ? "text-indigo-200" : "text-slate-300")}>
                  {hasCustomAudio ? "My own audio" : "Upload your own"}
                </p>
                <p className="text-[11px] text-slate-500">
                  {hasCustomAudio ? "Custom alarm sound selected" : "MP3 or other audio file"}
                </p>
              </div>
            </div>
            <div className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center",
              alarm?.sound === "custom" ? "border-indigo-400 bg-indigo-500/30" : "border-white/20"
            )}>
              {alarm?.sound === "custom" && <div className="w-2 h-2 rounded-full bg-indigo-300" />}
            </div>
          </button>

          <input
            ref={alarmFileRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              if (file.size > 3 * 1024 * 1024) {
                toast({ title: "File too large", description: "Please use an audio file under 3 MB.", variant: "destructive" });
                return;
              }
              const reader = new FileReader();
              reader.onload = async () => {
                const ok = await saveCustomAudio(reader.result);
                if (!ok) {
                  toast({ title: "Could not store audio", description: "This file is too large for this device.", variant: "destructive" });
                  return;
                }
                setHasCustomAudio(true);
                await saveAlarm({ sound: "custom" });
                toast({ title: "Alarm sound set", description: "Your custom audio is now the alarm sound." });
              };
              reader.readAsDataURL(file);
            }}
          />

          {hasCustomAudio && (
            <button
              onClick={async () => {
                await clearCustomAudio();
                setHasCustomAudio(false);
                await saveAlarm({ sound: "default" });
                toast({ title: "Custom audio removed", description: "Alarm is back to the default ringtone." });
              }}
              className="w-full py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-medium hover:bg-rose-500/20 transition-colors"
            >
              Remove my custom audio
            </button>
          )}
        </div>

        <button
          onClick={alarmTesting ? stopAlarmTest : playAlarmTest}
          disabled={!alarm}
          className="w-full py-3 rounded-xl bg-indigo-500/15 border border-indigo-400/30 text-indigo-200 text-sm font-medium flex items-center justify-center gap-2 hover:bg-indigo-500/25 transition-colors disabled:opacity-50"
        >
          {alarmTesting ? (
            <><div className="w-3.5 h-3.5 border-2 border-indigo-300 border-t-transparent rounded-full animate-spin" /> Playing... tap to stop</>
          ) : (
            <><Volume2 className="w-4 h-4" /> Test alarm sound</>
          )}
        </button>
        <p className="text-[10px] text-slate-500 mt-2">
          Tap again while playing to stop. This only previews the sound — the
          real alarm rings in sleep mode after your set hours of rest.
        </p>
      </Section>

      </>)}
      {tab === "data" && (<>

      {/* Backup & Restore */}
      <Section icon={ArchiveRestore} title="Backup & Restore">
        <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
          Your account and data live only on this device. Export a backup before
          switching phones or reinstalling — then restore it to keep your streak,
          streak, chats and everything else.
        </p>

        <button
          onClick={async () => {
            let blob;
            try {
              const res = await exportBackup();
              setBackupCode(res.code);
              blob = res.blob;
              setBackupMsg("Backup created. Copy the code or save the file somewhere safe.");
            } catch (e) {
              setBackupMsg("Export failed: " + e.message);
              return;
            }
            try {
              if (navigator.canShare?.({ files: [new File([blob], "healen.backup", { type: "application/octet-stream" })] })) {
                await navigator.share({
                  files: [new File([blob], "healen.backup", { type: "application/octet-stream" })],
                  title: "Healen backup",
                });
              }
            } catch {
              /* share cancelled or unsupported — code/file still available below */
            }
          }}
          className="w-full py-3 rounded-xl bg-indigo-500/15 border border-indigo-400/30 text-indigo-200 text-xs font-medium flex items-center justify-center gap-2 hover:bg-indigo-500/25 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export Backup
        </button>

        {backupCode && (
          <div className="mt-3">
            <div className="max-h-32 overflow-y-auto rounded-lg bg-black/30 border border-white/10 p-2.5">
              <p className="text-[9px] font-mono text-slate-400 break-all whitespace-pre-wrap select-all">{backupCode}</p>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(backupCode);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  } catch (e) {
                    const ta = document.createElement("textarea");
                    ta.value = backupCode;
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand("copy");
                    document.body.removeChild(ta);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }
                }}
                className="flex-1 py-2 rounded-lg bg-white/5 border border-white/10 text-[11px] text-slate-300 flex items-center justify-center gap-1.5 hover:bg-white/10 transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied!" : "Copy code"}
              </button>
              <button
                onClick={async () => {
                  const { blob } = await exportBackup();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `healen-backup-${new Date().toISOString().slice(0, 10)}.backup`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="flex-1 py-2 rounded-lg bg-white/5 border border-white/10 text-[11px] text-slate-300 flex items-center justify-center gap-1.5 hover:bg-white/10 transition-colors"
              >
                <Download className="w-3 h-3" />
                Save file
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 border-t border-white/5 pt-3">
          <label className="text-xs text-slate-400 mb-1.5 block">Restore from code</label>
          <textarea
            value={restoreCode}
            onChange={(e) => setRestoreCode(e.target.value)}
            placeholder="Paste a backup code here..."
            className="w-full h-20 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-[11px] font-mono text-white placeholder:text-slate-600 resize-none focus:outline-none focus:border-indigo-400/50"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={async () => {
                if (!restoreCode.trim()) return;
                if (!confirm("Restoring will overwrite this device's data with the backup. Continue?")) return;
                try {
                  const { keys } = await importBackup(restoreCode.trim());
                  setRestoreMsg(`Restored ${keys} items. Reloading...`);
                  setTimeout(() => window.location.reload(), 800);
                } catch (e) {
                  setRestoreMsg("Restore failed: " + e.message);
                }
              }}
              className="flex-1 py-2 rounded-lg bg-indigo-500/15 border border-indigo-400/30 text-indigo-200 text-[11px] flex items-center justify-center gap-1.5 hover:bg-indigo-500/25 transition-colors"
            >
              <ArchiveRestore className="w-3 h-3" />
              Restore
            </button>
            <button
              onClick={() => restoreRef.current?.click()}
              className="flex-1 py-2 rounded-lg bg-white/5 border border-white/10 text-[11px] text-slate-300 flex items-center justify-center gap-1.5 hover:bg-white/10 transition-colors"
            >
              <FileUp className="w-3 h-3" />
              Pick file
            </button>
            <input
              ref={restoreRef}
              type="file"
              accept=".backup,.healen,application/octet-stream,application/json"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  const code = await f.text();
                  if (!confirm("Restoring will overwrite this device's data with the backup. Continue?")) return;
                  const { keys } = await importBackup(code);
                  setRestoreMsg(`Restored ${keys} items. Reloading...`);
                  setTimeout(() => window.location.reload(), 800);
                } catch (err) {
                  setRestoreMsg("Restore failed: " + err.message);
                }
              }}
            />
          </div>
        </div>

        {backupMsg && <p className="text-[11px] text-emerald-400/80 mt-2">{backupMsg}</p>}
        {restoreMsg && <p className={cn("text-[11px] mt-2", restoreMsg.startsWith("Restore failed") ? "text-rose-400/80" : "text-emerald-400/80")}>{restoreMsg}</p>}
      </Section>

      {/* Danger zone */}
      <div className="mt-6 mb-4">
        <button
          onClick={async () => {
            if (!confirm("This will permanently delete ALL your data — streak, check-ins, relapse history, sleep log. This cannot be undone. Are you sure?")) return;
            try {
              await db.entities.CheckIn.deleteMany({});
              await db.entities.Relapse.deleteMany({});
              await db.entities.Sleep.deleteMany({});
              await db.ai.clearChats();
              await db.ai.clearChars();
              setCharacters([]);
              await db.entities.Streak.update(streak.id, {
                current_streak_days: 0,
                longest_streak_days: 0,
                streak_start_date: new Date().toISOString(),
                total_clean_days: 0,
                total_relapses: 0,
                daily_goal_streak: 0,
                last_checkin_date: null,
                sleep_session_start: null,
                sleep_current_streak_days: 0,
                sleep_longest_streak_days: 0,
                sleep_total_nights: 0,
                sleep_total_resets: 0,
                sleep_last_success_date: null,
                sleep_last_duration_min: null,
              });
              setResetMsg("All data reset. Fresh start — make it count.");
              setTimeout(() => setResetMsg(""), 3000);
            } catch (e) {
              console.error(e);
            }
          }}
          className="w-full py-3 rounded-xl bg-rose-950/30 border border-rose-800/30 text-rose-400/70 text-xs font-medium flex items-center justify-center gap-2 hover:bg-rose-950/50 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete All My Data
        </button>
        {resetMsg && (
          <p className="text-[11px] text-emerald-400/80 mt-2 text-center">{resetMsg}</p>
        )}
      </div>

      </>)}

      {/* Support */}
      <Section icon={Heart} title="Support the Project">
        <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
          Healen is free, private and made with care. If it's helped you, a small
          donation keeps it alive and helps everyone else heal too. Thank you. 💜
        </p>

        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
          <Bitcoin className="w-3 h-3" /> Bitcoin
        </p>
        <div className="flex gap-2 mb-3">
          <p className="flex-1 min-w-0 rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-[10px] font-mono text-slate-300 break-all select-all">
            bc1qypz0j6klq2uakxylsqu2rqsf8zaudl728fev8v
          </p>
          <button
            onClick={() => copyText("bc1qypz0j6klq2uakxylsqu2rqsf8zaudl728fev8v", "btc")}
            className="shrink-0 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[11px] text-slate-300 flex items-center gap-1.5 hover:bg-white/10 transition-colors"
          >
            {copiedAddr === "btc" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            {copiedAddr === "btc" ? "Copied" : "Copy"}
          </button>
        </div>

        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
          <Wallet className="w-3 h-3" /> Ethereum
        </p>
        <div className="flex gap-2">
          <p className="flex-1 min-w-0 rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-[10px] font-mono text-slate-300 break-all select-all">
            0xd6adF7d7E19c8255d6D80913DF8bECCAc3894f4e
          </p>
          <button
            onClick={() => copyText("0xd6adF7d7E19c8255d6D80913DF8bECCAc3894f4e", "eth")}
            className="shrink-0 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[11px] text-slate-300 flex items-center gap-1.5 hover:bg-white/10 transition-colors"
          >
            {copiedAddr === "eth" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            {copiedAddr === "eth" ? "Copied" : "Copy"}
          </button>
        </div>
      </Section>

      <p className="text-center text-[10px] text-slate-600 mt-4 leading-relaxed">
        100% private — your data lives only on this device. 💜<br />
        Built so everyone can heal. You're not alone in this journey.
      </p>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-3">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-indigo-400" />
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}