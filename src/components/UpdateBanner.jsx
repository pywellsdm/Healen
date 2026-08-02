import { useState, useEffect } from "react";
import { checkForUpdate } from "@/lib/updates";
import { APP_VERSION, IS_NATIVE } from "@/lib/appInfo";
import { Download, X } from "lucide-react";

export default function UpdateBanner() {
  const [update, setUpdate] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    (async () => {
      const result = await checkForUpdate();
      if (result) setUpdate(result);
    })();
  }, []);

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
    <div className="sticky top-0 z-40 -mx-5 px-5 pt-2">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-3 shadow-lg shadow-indigo-900/40 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
          <Download className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">Update available</p>
          <p className="text-[11px] text-indigo-100/90">
            v{update.version} is here (you're on v{APP_VERSION})
          </p>
        </div>
        <button
          onClick={openDownload}
          className="shrink-0 px-3 py-2 rounded-full bg-white text-indigo-700 text-xs font-bold hover:bg-indigo-50 transition-colors"
        >
          Get it
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/80 hover:bg-white/20 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
