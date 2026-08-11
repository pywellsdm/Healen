import { useState, useEffect, useRef, useCallback } from "react";
import { checkForUpdate } from "@/lib/updates";
import { APP_VERSION, IS_NATIVE } from "@/lib/appInfo";
import { Download, Rocket, X } from "lucide-react";

export default function UpdateBanner() {
  const [update, setUpdate] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const dismissedRef = useRef(false);

  const dismiss = () => {
    dismissedRef.current = true;
    setDismissed(true);
  };

  const run = useCallback(async () => {
    if (dismissedRef.current) return;
    const result = await checkForUpdate({ force: true });
    if (result && !dismissedRef.current) setUpdate(result);
  }, []);

  // Check on mount AND whenever the app comes back to the foreground, so a
  // release that drops while the app is open still shows up.
  useEffect(() => {
    run();
    const onVisible = () => {
      if (!document.hidden) run();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [run]);

  if (!update || dismissed) return null;

  const openDownload = async () => {
    if (IS_NATIVE) {
      try {
        const { Browser } = await import("@capacitor/browser");
        await Browser.open({ url: update.downloadUrl });
        return;
      } catch (e) {
        /* fall through to window.open */
      }
    }
    window.open(update.downloadUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative pointer-events-auto w-full max-w-xs bg-[#0E0F1A]/95 border border-white/15 rounded-3xl p-6 text-center shadow-2xl animate-pop-in">
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-slate-400"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
          <Rocket className="w-7 h-7 text-indigo-300" />
        </div>

        <p className="text-[10px] uppercase tracking-[0.25em] text-indigo-300/80 font-semibold mb-1">
          Update available
        </p>
        <h2 className="text-xl font-bold text-white mb-1.5">v{update.version} is here</h2>
        <p className="text-xs text-slate-400 leading-relaxed mb-1">
          You're running v{APP_VERSION}. A newer version is ready with fixes and improvements.
        </p>

        <button
          onClick={openDownload}
          className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
        >
          <Download className="w-4 h-4" />
          Download v{update.version}
        </button>
        <button
          onClick={dismiss}
          className="mt-2 w-full py-2.5 rounded-xl bg-white/5 text-slate-300 text-xs font-medium hover:bg-white/10 transition-colors"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
