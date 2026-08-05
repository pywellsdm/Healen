import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { db, AI_PROVIDERS } from "@/lib/store";
import { buildAIContext, AI_PERSONAS } from "@/lib/aiContext";
import { ensureStreakRecord, calculateStreakDays } from "@/lib/streakUtils";
import {
  Bot,
  Send,
  Sparkles,
  User,
  History,
  Plus,
  Trash2,
  ArrowLeft,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const QUICK_PROMPTS = [
  "I'm having a strong urge right now",
  "Analyze my patterns and triggers",
  "I'm feeling discouraged today",
  "Give me my weekly review",
  "How do I avoid late-night relapses?",
  "I just relapsed, help me get back up",
];

function newId() {
  return (
    (typeof crypto !== "undefined" && crypto.randomUUID && crypto.randomUUID()) ||
    `chat_${Date.now()}_${Math.random().toString(36).slice(2)}`
  );
}

function chatTitle(messages) {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "New chat";
  const t = first.content.replace(/\s+/g, " ").trim();
  return t.length > 44 ? `${t.slice(0, 44)}…` : t;
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function AICoach() {
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState(false);
  const [config, setConfig] = useState({ provider: "local", apiKey: "", baseUrl: "", model: "" });
  const [chats, setChats] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [showSetup, setShowSetup] = useState(true);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [persona, setPersona] = useState("mentor");
  const [context, setContext] = useState("");
  const [streak, setStreak] = useState(null);
  const scrollRef = useRef(null);
  const chatsRef = useRef([]);

  useEffect(() => {
    (async () => {
      try {
        const [cfg, savedChats] = await Promise.all([db.ai.getConfig(), db.ai.getChats()]);
        const ctx = await buildAIContext();
        const savedPersona = ctx.streak.ai_persona || "mentor";
        setConfig(cfg);
        setContext(ctx.contextText);
        setStreak(ctx.streak);
        setPersona(savedPersona);
        chatsRef.current = savedChats;
        setChats(savedChats);
        if (savedChats.length) {
          const latest = savedChats[0];
          setActiveChatId(latest.id);
          setMessages(latest.messages || []);
          if (latest.persona) setPersona(latest.persona);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, historyOpen]);

  const persist = async (chatId, msgs, personaName, provider) => {
    try {
      const existing = chatsRef.current.find((c) => c.id === chatId);
      const chat = {
        id: chatId,
        title: existing?.title || chatTitle(msgs),
        provider: provider || config.provider,
        persona: personaName || persona,
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: msgs,
      };
      const saved = await db.ai.saveChat(chat);
      chatsRef.current = [saved, ...chatsRef.current.filter((c) => c.id !== chatId)];
      setChats(chatsRef.current);
    } catch (e) {
      console.error(e);
    }
  };

  const send = async (text) => {
    if (!text.trim() || loading) return;
    const userMsg = { role: "user", content: text.trim(), createdAt: new Date().toISOString() };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    const personaConfig = AI_PERSONAS[persona];
    const customPrompt = streak?.custom_persona_prompt;
    const sys =
      persona === "custom"
        ? `${customPrompt || "You are a supportive recovery companion helping with quitting porn and gooning. Stay fully in character, be warm and encouraging, and reference the user's data."}\n\n${context}`
        : `${personaConfig.system}\n\n${context}`;
    const apiMessages = [
      { role: "system", content: sys },
      ...nextMessages,
    ];

    const chatId = activeChatId || newId();
    if (!activeChatId) setActiveChatId(chatId);

    try {
      const reply = await db.ai.chat(config, { messages: apiMessages });
      const finalMessages = [
        ...nextMessages,
        { role: "assistant", content: reply || "I'm here. What's on your mind?", createdAt: new Date().toISOString() },
      ];
      setMessages(finalMessages);
      await persist(chatId, finalMessages, persona, config.provider);
    } catch (e) {
      console.error(e);
      const errMsg = {
        role: "assistant",
        content: `I couldn't reach the AI right now (${e.message || "connection error"}). Double-check your key and provider in Settings, or use the offline coach.`,
        createdAt: new Date().toISOString(),
      };
      const finalMessages = [...nextMessages, errMsg];
      setMessages(finalMessages);
      await persist(chatId, finalMessages, persona, config.provider);
    } finally {
      setLoading(false);
    }
  };

  const changePersona = async (newPersona) => {
    setPersona(newPersona);
    try {
      const s = await ensureStreakRecord();
      await db.entities.Streak.update(s.id, { ai_persona: newPersona });
    } catch (e) {
      console.error(e);
    }
    if (activeChatId && messages.length) {
      await persist(activeChatId, messages, newPersona, config.provider);
    }
  };

  const startNewChat = () => {
    setActiveChatId(null);
    setMessages([]);
    setHistoryOpen(false);
  };

  const openChat = (c) => {
    setActiveChatId(c.id);
    setMessages(c.messages || []);
    if (c.persona) setPersona(c.persona);
    setHistoryOpen(false);
  };

  const deleteChat = async (id) => {
    try {
      await db.ai.deleteChat(id);
    } catch (e) {
      console.error(e);
    }
    chatsRef.current = chatsRef.current.filter((c) => c.id !== id);
    setChats(chatsRef.current);
    if (activeChatId === id) {
      setActiveChatId(null);
      setMessages([]);
    }
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-[calc(100dvh-120px)] px-5 pt-12">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/30 to-purple-500/20 border border-indigo-400/20 flex items-center justify-center">
          <Bot className="w-4 h-4 text-indigo-300 animate-pulse" />
        </div>
      </div>
    );
  }

  const providerName = AI_PROVIDERS[config.provider]?.name || "AI";
  const isWelcome = messages.length === 0 && !historyOpen;
  const aiCurrentDays = calculateStreakDays(streak?.streak_start_date);

  return (
    <div className="flex flex-col h-[calc(100dvh-120px)] px-5 pt-12 pb-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-xl font-bold text-white light:text-slate-800 flex items-center gap-2">
            <Bot className="w-5 h-5 text-indigo-400" />
            AI Coach
          </h1>
          <p className="text-xs text-slate-500">
            {historyOpen ? "Your saved conversations" : `Powered by ${providerName}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!historyOpen && messages.length > 0 && (
            <button
              onClick={startNewChat}
              className="w-9 h-9 rounded-full bg-white/5 border border-white/10 text-slate-300 flex items-center justify-center hover:bg-white/10 transition-colors"
              aria-label="New chat"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className={cn(
              "w-9 h-9 rounded-full border flex items-center justify-center transition-colors",
              historyOpen
                ? "bg-indigo-500/20 border-indigo-400/40 text-indigo-200"
                : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
            )}
            aria-label="Chat history"
          >
            {historyOpen ? <ArrowLeft className="w-4 h-4" /> : <History className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Persona selector */}
      {!historyOpen && (
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2 -mx-5 px-5 scrollbar-hide">
          {Object.entries(AI_PERSONAS).map(([key, p]) => (
            <button
              key={key}
              onClick={() => changePersona(key)}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                persona === key
                  ? "bg-indigo-500/20 border-indigo-400/40 text-indigo-200"
                  : "bg-white/5 border-white/5 text-slate-400"
              )}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {/* History */}
      {historyOpen ? (
        <div className="flex-1 overflow-y-auto space-y-2 mb-3 -mx-5 px-5">
          <button
            onClick={startNewChat}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border border-dashed border-indigo-400/30 py-3 text-sm text-indigo-300 hover:bg-indigo-500/10 transition-colors"
          >
            <Plus className="w-4 h-4" /> New chat
          </button>
          {chats.length === 0 && (
            <p className="text-center text-xs text-slate-500 pt-8">
              No saved conversations yet.
            </p>
          )}
          {chats.map((c) => (
            <div
              key={c.id}
              onClick={() => openChat(c)}
              className={cn(
                "glass rounded-2xl px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-white/5 transition-colors",
                c.id === activeChatId && "border border-indigo-400/30"
              )}
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500/30 to-purple-500/20 border border-indigo-400/20 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-indigo-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{c.title}</p>
                <p className="text-[10px] text-slate-500">
                  {AI_PROVIDERS[c.provider]?.name || "AI"} · {formatDate(c.updatedAt)} ·{" "}
                  {c.messages.length} msg{c.messages.length === 1 ? "" : "s"}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteChat(c.id);
                }}
                className="w-8 h-8 rounded-full text-slate-500 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors shrink-0"
                aria-label="Delete chat"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : isWelcome ? (
        /* Welcome */
        <div className="flex-1 overflow-y-auto space-y-4 mb-3 -mx-5 px-5">
          <div className="flex flex-col items-center text-center pt-6 pb-2">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-indigo-500/30 to-purple-500/20 border border-indigo-400/20 flex items-center justify-center mb-3">
              <Bot className="w-8 h-8 text-indigo-300" />
            </div>
            <h2 className="text-lg font-bold text-white">
              Hey {streak?.user_name || "friend"} 👋
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-xs">
              I'm your {AI_PERSONAS[persona].name}. I can see you're at{" "}
              <span className="text-indigo-300 font-medium">
                {aiCurrentDays} days clean
              </span>{" "}
              with a goal of {streak?.current_goal_days || 30}. What's on your mind?
            </p>
          </div>

          {showSetup && config.provider === "local" && (
            <div className="glass rounded-2xl p-4 border border-indigo-400/20">
              <p className="text-sm text-white font-medium flex items-center gap-2">
                <Settings className="w-4 h-4 text-indigo-300" /> Bring your own AI
              </p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Connect OpenAI, DeepSeek, OpenRouter, or any custom API for smarter
                coaching. Until then I coach you offline — free and private.
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => navigate("/settings")}
                  className="flex-1 px-3 py-2 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-xs font-semibold text-white"
                >
                  Set up in Settings
                </button>
                <button
                  onClick={() => setShowSetup(false)}
                  className="px-3 py-2 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300"
                >
                  Chat offline
                </button>
              </div>
            </div>
          )}

          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Quick prompts
            </p>
            <div className="flex gap-1.5 flex-wrap">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="px-3 py-1.5 rounded-full text-[11px] bg-white/5 border border-white/10 text-slate-300 light:text-slate-600 hover:bg-white/10 transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Messages */
        <div className="flex-1 overflow-y-auto space-y-3 mb-3 -mx-5 px-5">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn("flex gap-2.5", msg.role === "user" && "flex-row-reverse")}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border",
                  msg.role === "assistant"
                    ? "bg-gradient-to-br from-indigo-500/30 to-purple-500/20 border-indigo-400/20"
                    : "bg-white/5 border-white/10"
                )}
              >
                {msg.role === "assistant" ? (
                  <Bot className="w-4 h-4 text-indigo-300" />
                ) : (
                  <User className="w-4 h-4 text-slate-400" />
                )}
              </div>
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words",
                  msg.role === "assistant"
                    ? "glass text-slate-200 light:text-slate-700"
                    : "bg-gradient-to-br from-indigo-500 to-purple-500 text-white"
                )}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/30 to-purple-500/20 border border-indigo-400/20 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-indigo-300" />
              </div>
              <div className="glass rounded-2xl px-4 py-3 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      )}

      {/* Input */}
      {!historyOpen && (
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(input)}
            placeholder={config.provider === "local" ? "Talk to your offline coach..." : `Chat with ${providerName}...`}
            className="flex-1 glass rounded-full px-4 py-3 text-sm text-white light:text-slate-800 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-400/30"
          />
          <button
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white disabled:opacity-40 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
