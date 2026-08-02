import { TELEGRAM_GROUP_URL, openExternalLink } from "@/lib/telegram";
import { Send } from "lucide-react";

export default function Community() {
  return (
    <div className="px-5 pt-12 pb-4">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-white light:text-slate-800 flex items-center justify-center gap-2 mb-1">
          The Tribe
        </h1>
        <p className="text-sm text-slate-500">You're not alone. Join the group.</p>
      </div>

      <button
        onClick={() => openExternalLink(TELEGRAM_GROUP_URL)}
        className="w-full rounded-3xl p-5 border border-sky-400/30 bg-gradient-to-br from-sky-500/15 to-indigo-500/15 hover:from-sky-500/25 hover:to-indigo-500/25 transition-colors text-left"
      >
        <div className="w-14 h-14 rounded-2xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center mb-3">
          <Send className="w-7 h-7 text-sky-300" />
        </div>
        <p className="text-base font-semibold text-white light:text-slate-800">Join our Telegram group</p>
        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
          Stories, streak shares, wins and struggles — real people who get it.
          Share your journey, cheer on others, and stay accountable together.
        </p>
        <span className="inline-block mt-3 text-xs font-semibold text-sky-300">Tap to join ↗</span>
      </button>

      <div className="mt-6 glass rounded-2xl p-4">
        <p className="text-xs text-slate-400 leading-relaxed">
          💬 Post your daily wins
          <br />🔥 Share your streak updates
          <br />💪 Get support when it gets hard
          <br />🤝 Find an accountability partner
        </p>
      </div>

      <p className="text-center text-[10px] text-slate-600 mt-8">
        This is a judgment-free zone. We're all fighting the same battle. 🤝
      </p>
    </div>
  );
}
