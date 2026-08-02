import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { importBackup } from "@/lib/backup";
import { Sparkles, FileUp } from "lucide-react";
import Background from "@/components/Background";

export default function Welcome() {
  const { startFresh } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [restoring, setRestoring] = useState(false);
  const [showCode, setShowCode] = useState(false);

  const doRestore = async (backupCode) => {
    if (!backupCode || !backupCode.trim()) return;
    setRestoring(true);
    setMsg("");
    try {
      const { keys } = await importBackup(backupCode.trim());
      setMsg(`Restored ${keys} items. Loading...`);
      setTimeout(() => window.location.reload(), 900);
    } catch (e) {
      setMsg("Restore failed: " + e.message);
      setRestoring(false);
    }
  };

  return (
    <div className="min-h-screen relative" style={{ background: "var(--app-bg)", color: "var(--text-primary)" }}>
      <Background />
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-10">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-900/40 mb-4">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-1">Welcome to UnGoonify</h1>
        <p className="text-xs text-slate-400 mb-8 text-center leading-relaxed">
          Your recovery, 100% on your device.<br />No account. No cloud. No tracking.
        </p>

        <div className="w-full max-w-sm space-y-3">
          <button
            onClick={() => {
              startFresh();
              navigate("/onboarding", { replace: true });
            }}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            <Sparkles className="w-4 h-4" />
            I'm new
          </button>

          <button
            onClick={() => fileRef.current?.click()}
            disabled={restoring}
            className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <FileUp className="w-4 h-4" />
            I'm not new — Restore backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/octet-stream,application/json,text/plain,*/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              f.text().then(doRestore).catch((err) => setMsg("Restore failed: " + err.message));
            }}
          />

          <button
            onClick={() => setShowCode(!showCode)}
            className="w-full py-2 text-[11px] text-slate-400 underline hover:text-slate-300 transition-colors"
          >
            {showCode ? "Hide code entry" : "Have a backup code instead? Paste it"}
          </button>

          {showCode && (
            <div className="space-y-2">
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Paste your backup code here..."
                className="w-full h-24 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-[11px] font-mono text-white placeholder:text-slate-600 resize-none focus:outline-none focus:border-indigo-400/50"
              />
              <button
                onClick={() => doRestore(code)}
                disabled={restoring || !code.trim()}
                className="w-full py-3 rounded-xl bg-indigo-500/15 border border-indigo-400/30 text-indigo-200 text-xs font-medium flex items-center justify-center gap-2 hover:bg-indigo-500/25 transition-colors disabled:opacity-50"
              >
                {restoring ? "Restoring..." : "Restore"}
              </button>
            </div>
          )}

          {msg && (
            <p className={`text-[11px] text-center ${msg.startsWith("Restore failed") ? "text-rose-400/80" : "text-emerald-400/80"}`}>
              {msg}
            </p>
          )}

          <p className="text-[10px] text-slate-600 pt-4 text-center leading-relaxed">
            Your streak, chats, community posts and wallpaper are stored only on this
            device. Use Backup &amp; Restore in Settings to carry them to a new phone
            or after a reinstall.
          </p>
        </div>
      </div>
    </div>
  );
}
