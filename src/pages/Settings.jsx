import { useState, useEffect, useRef } from "react";
import { db, AI_PROVIDERS } from "@/lib/store";
import { ensureStreakRecord, updateStreak } from "@/lib/streakUtils";
import { useToast } from "@/components/ui/use-toast";
import { useTheme } from "@/lib/ThemeContext";
import { requestNotificationPermission } from "@/lib/notifications";
import { IS_NATIVE } from "@/lib/appInfo";
import { AI_PERSONAS } from "@/lib/aiContext";
import {
  User, Bell, Heart, Target, Save, Sparkles, Trash2,
  Palette, Image, Bot, Upload, Copy, Check,
  Wifi, WifiOff, Download, ArchiveRestore, FileUp, Bitcoin, Wallet,
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

const THEME_COLORS = [
  { key: "auto", label: "Match wallpaper", hue: null, swatch: null },
  { key: "red", label: "Red", hue: 0, swatch: "#ef4444" },
  { key: "orange", label: "Orange", hue: 25, swatch: "#f97316" },
  { key: "amber", label: "Amber", hue: 45, swatch: "#f59e0b" },
  { key: "lime", label: "Lime", hue: 80, swatch: "#84cc16" },
  { key: "green", label: "Green", hue: 134, swatch: "#22c55e" },
  { key: "teal", label: "Teal", hue: 170, swatch: "#14b8a6" },
  { key: "cyan", label: "Cyan", hue: 190, swatch: "#06b6d4" },
  { key: "sky", label: "Sky", hue: 205, swatch: "#0ea5e9" },
  { key: "blue", label: "Blue", hue: 225, swatch: "#3b82f6" },
  { key: "indigo", label: "Indigo", hue: 248, swatch: "#6366f1" },
  { key: "violet", label: "Violet", hue: 270, swatch: "#8b5cf6" },
  { key: "purple", label: "Purple", hue: 290, swatch: "#a855f7" },
  { key: "fuchsia", label: "Fuchsia", hue: 310, swatch: "#d946ef" },
  { key: "pink", label: "Pink", hue: 330, swatch: "#ec4899" },
  { key: "rose", label: "Rose", hue: 350, swatch: "#f43f5e" },
];

export default function Settings() {
  const { toast } = useToast();
  const { wallpaperUrl, setWallpaper, resetWallpaper, wallpaperBlur, setBlur, themeColor, setThemeColor, hasCustomWallpaper } = useTheme();
  const [streak, setStreak] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [aiPersona, setAiPersona] = useState("mentor");
  const [customPrompt, setCustomPrompt] = useState("");
  const fileRef = useRef(null);
  const restoreRef = useRef(null);
  const [backupCode, setBackupCode] = useState("");
  const [restoreCode, setRestoreCode] = useState("");
  const [backupMsg, setBackupMsg] = useState("");
  const [restoreMsg, setRestoreMsg] = useState("");
  const [copied, setCopied] = useState(false);

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
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("09:00");
  const [customMotivation, setCustomMotivation] = useState("");

  // Removed password/recovery state
  const [notifState, setNotifState] = useState("default");
  const [copiedAddr, setCopiedAddr] = useState("");

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

  useEffect(() => {
    (async () => {
      try {
        const s = await ensureStreakRecord();
        setStreak(s);
        setName(s.user_name || "");
        setTone(s.motivation_tone || "gentle");
        setGoal(s.current_goal_days || 30);
        setReminderEnabled(s.daily_reminder_enabled ?? false);
        setReminderTime(s.daily_reminder_time || "09:00");
        setCustomMotivation(s.custom_motivation || "");
        setAiPersona(s.ai_persona || "mentor");
        setCustomPrompt(s.custom_persona_prompt || "");
        setNotifState("Notification" in window ? Notification.permission : "denied");
        const cfg = await db.ai.getConfig();
        setAiConfig(cfg);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
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
        daily_reminder_enabled: reminderEnabled,
        daily_reminder_time: reminderTime,
        custom_motivation: customMotivation,
      });
    }, 400);
    return () => clearTimeout(t);
  }, [name, tone, goal, reminderEnabled, reminderTime, customMotivation]);

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
      <p className="text-xs text-slate-500 mb-6">Make this app yours. Customize everything.</p>

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

      {/* Appearance */}
      <Section icon={Palette} title="Appearance">
        <p className="text-xs text-slate-400 mb-2">Wallpaper</p>
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <><div className="w-4 h-4 border-2 border-slate-600 border-t-indigo-400 rounded-full animate-spin" /> Uploading...</>
            ) : (
              <><Upload className="w-4 h-4" /> Upload Image</>
            )}
          </button>
          {hasCustomWallpaper && (
            <button
              onClick={async () => {
                await resetWallpaper();
                setWallpaperMsg("Reset to the default wallpaper.");
                setTimeout(() => setWallpaperMsg(""), 2500);
              }}
              className="px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm"
            >
              Reset to default
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setUploading(true);
              try {
                const { file_url } = await db.integrations.Core.UploadFile({ file });
                await setWallpaper(file_url);
                setWallpaperMsg("Wallpaper set.");
                setTimeout(() => setWallpaperMsg(""), 2500);
              } catch (err) {
                toast({ title: "Upload failed", variant: "destructive" });
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

        {wallpaperUrl && (
          <div className="mb-3">
            <div className="flex justify-between mb-1">
              <label className="text-xs text-slate-400 flex items-center gap-1"><Image className="w-3 h-3" /> Blur</label>
              <span className="text-xs text-indigo-300">{wallpaperBlur}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="40"
              value={wallpaperBlur}
              onChange={(e) => setBlur(Number(e.target.value))}
              className="w-full"
            />
          </div>
        )}

        {wallpaperUrl && (
          <div className="rounded-xl overflow-hidden border border-white/10 mb-1">
            <img src={wallpaperUrl} alt="wallpaper preview" className="w-full h-24 object-cover" style={{ filter: `blur(${wallpaperBlur}px)` }} />
          </div>
        )}

        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs text-slate-400 flex items-center gap-1"><Palette className="w-3 h-3" /> Theme color</label>
            <span className="text-[10px] text-slate-500">Auto uses your wallpaper</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {THEME_COLORS.map((c) => {
              const value = c.hue == null ? "auto" : String(c.hue);
              const active = themeColor === value;
              return (
                <button
                  key={c.key}
                  title={c.label}
                  aria-label={c.label}
                  onClick={() => setThemeColor(value)}
                  className={cn(
                    "w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center",
                    active ? "border-white ring-2 ring-white/30 scale-110" : "border-white/20 hover:border-white/60"
                  )}
                  style={c.swatch ? { background: c.swatch } : undefined}
                >
                  {!c.swatch && <Sparkles className="w-3.5 h-3.5 text-slate-400" />}
                </button>
              );
            })}
          </div>
        </div>
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
                aiPersona === key ? "bg-indigo-500/15 border-indigo-400/40" : "bg-white/5 border-white/5"
              )}
            >
              <div>
                <p className={cn("text-sm font-medium", aiPersona === key ? "text-indigo-200" : "text-slate-300")}>{p.name}</p>
                <p className="text-[11px] text-slate-500">{p.desc}</p>
              </div>
              <div className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                aiPersona === key ? "border-indigo-400 bg-indigo-500/30" : "border-white/20"
              )}>
                {aiPersona === key && <div className="w-2 h-2 rounded-full bg-indigo-300" />}
              </div>
            </button>
          ))}
        </div>

        {aiPersona === "custom" && (
          <div className="mt-3">
            <label className="text-xs text-slate-400 mb-1.5 block">
              Personality prompt
            </label>
            <textarea
              value={customPrompt}
              onChange={(e) => {
                setCustomPrompt(e.target.value);
                (async () => {
                  try {
                    const s = await ensureStreakRecord();
                    await db.entities.Streak.update(s.id, { custom_persona_prompt: e.target.value });
                  } catch (err) { console.error(err); }
                })();
              }}
              placeholder={'Describe your AI. Example: "You are Nazuna Nanakusa from Call of the Night. You are laid-back, playful, and a bit teasing, but deeply caring about helping me quit gooning. Stay in character with a relaxed, anime-girl tone."'}
              className="w-full h-32 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 resize-none focus:outline-none focus:border-indigo-400/50"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Your AI will fully role-play this personality while coaching you.
            </p>
          </div>
        )}
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

      {/* Goal */}
      <Section icon={Target} title="Your Goal">
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