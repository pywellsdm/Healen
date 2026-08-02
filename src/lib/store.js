// quit-gooning local data layer
// Everything lives in this device's localStorage. No accounts, no servers,
// no tracking — your data never leaves your browser.

const PREFIX = "quit-gooning";

const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("Failed to write local data:", e);
  }
};

const uid = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

// ---- password hashing (SHA-256 via Web Crypto, salted) ----
const encoder = new TextEncoder();

async function sha256(str) {
  if (crypto?.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", encoder.encode(str));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, "0") + (h1 >>> 0).toString(16).padStart(8, "0");
}

function randomHex(bytes) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function genRecoveryKey() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let key = "";
  for (let i = 0; i < 16; i++) {
    key += chars[Math.floor(Math.random() * chars.length)];
    if (i % 4 === 3 && i !== 15) key += "-";
  }
  return key;
}

async function hashPassword(password, salt) {
  return sha256(`${salt}:${password}`);
}

// ---- users ----
const USERS_KEY = `${PREFIX}:users`;
const SESSION_KEY = `${PREFIX}:session`;

const getUsers = () => read(USERS_KEY, {});
const saveUsers = (u) => write(USERS_KEY, u);
const getSession = () => localStorage.getItem(SESSION_KEY);
const setSession = (u) =>
  u ? localStorage.setItem(SESSION_KEY, u) : localStorage.removeItem(SESSION_KEY);

const currentUsername = () => getSession();

const publicUser = (user) => ({
  id: user.username,
  username: user.username,
  name: user.displayName,
  displayName: user.displayName,
  role: "user",
});

// ---- auth ----
export const auth = {
  async register({ username, password, name = "" }) {
    const uname = String(username || "").trim().toLowerCase();
    if (uname.length < 3) throw new Error("Username must be at least 3 characters");
    if (!/^[a-z0-9_.]+$/.test(uname))
      throw new Error("Username can only contain letters, numbers, dots and underscores");
    if (String(password || "").length < 4)
      throw new Error("Password must be at least 4 characters");
    const users = getUsers();
    if (users[uname]) throw new Error("That username is already taken");
    const salt = randomHex(16);
    const passwordHash = await hashPassword(password, salt);
    const recoveryKey = genRecoveryKey();
    const user = {
      username: uname,
      displayName: String(name || "").trim() || uname,
      salt,
      passwordHash,
      recoveryKey,
      createdAt: new Date().toISOString(),
    };
    users[uname] = user;
    saveUsers(users);
    setSession(uname);
    return publicUser(user);
  },

  async login({ username, password }) {
    const uname = String(username || "").trim().toLowerCase();
    const users = getUsers();
    const user = users[uname];
    if (!user) throw new Error("No account found with that username");
    const hash = await hashPassword(password, user.salt);
    if (hash !== user.passwordHash) throw new Error("Incorrect password");
    setSession(uname);
    return publicUser(user);
  },

  async logout() {
    setSession(null);
    return true;
  },

  async me() {
    const uname = currentUsername();
    if (!uname) throw new Error("Not authenticated");
    const users = getUsers();
    const user = users[uname];
    if (!user) throw new Error("Not authenticated");
    return publicUser(user);
  },

  async changePassword({ currentPassword, newPassword }) {
    const user = await this.me();
    const users = getUsers();
    const record = users[user.username];
    const hash = await hashPassword(currentPassword, record.salt);
    if (hash !== record.passwordHash) throw new Error("Current password is incorrect");
    if (String(newPassword || "").length < 4)
      throw new Error("New password must be at least 4 characters");
    record.salt = randomHex(16);
    record.passwordHash = await hashPassword(newPassword, record.salt);
    saveUsers(users);
    return true;
  },

  async requestRecoveryKey(username) {
    const uname = String(username || "").trim().toLowerCase();
    const users = getUsers();
    const user = users[uname];
    if (!user) throw new Error("No account found with that username");
    return { recoveryKey: user.recoveryKey };
  },

  async resetPassword({ username, recoveryKey, newPassword }) {
    const uname = String(username || "").trim().toLowerCase();
    const users = getUsers();
    const user = users[uname];
    if (!user) throw new Error("No account found with that username");
    const key = String(recoveryKey || "").trim().toUpperCase();
    if (key !== user.recoveryKey) throw new Error("Recovery key is incorrect");
    if (String(newPassword || "").length < 4)
      throw new Error("Password must be at least 4 characters");
    user.salt = randomHex(16);
    user.passwordHash = await hashPassword(newPassword, user.salt);
    saveUsers(users);
    return true;
  },
};

// ---- entity storage ----
// Private records (Streak, CheckIn, Relapse) are scoped to the logged-in user.
// Community records (Post, Comment) are shared across this device.
const PRIVATE_ENTITIES = new Set(["streak", "checkin", "relapse"]);

function entityKey(entity) {
  const name = String(entity).toLowerCase();
  if (!PRIVATE_ENTITIES.has(name)) return `${PREFIX}:community:${name}`;
  const u = currentUsername();
  if (!u) throw new Error("Not authenticated");
  return `${PREFIX}:data:${u}:${name}`;
}

function getRecords(entity) {
  const key = entityKey(entity);
  const arr = read(key, []);
  return { key, arr: Array.isArray(arr) ? arr : [] };
}

function sortRecords(arr, sortKey) {
  const desc = sortKey.startsWith("-");
  const key = desc ? sortKey.slice(1) : sortKey;
  return [...arr].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "string") return desc ? bv.localeCompare(av) : av.localeCompare(bv);
    return desc ? bv - av : av - bv;
  });
}

function makeEntity(entity) {
  return {
    async filter(filters = {}, sortKey = "-created_date", limit = 100) {
      const { arr } = getRecords(entity);
      let out = arr.filter((r) => {
        for (const [k, v] of Object.entries(filters || {})) {
          if (v !== undefined && r[k] !== v) return false;
        }
        return true;
      });
      out = sortRecords(out, sortKey);
      if (limit != null) out = out.slice(0, limit);
      return out;
    },

    async create(data) {
      const { key, arr } = getRecords(entity);
      const now = new Date().toISOString();
      const record = { id: uid(), created_date: now, updated_date: now, ...data };
      arr.push(record);
      write(key, arr);
      return record;
    },

    async update(id, data) {
      const { key, arr } = getRecords(entity);
      const idx = arr.findIndex((r) => r.id === id);
      if (idx === -1) throw new Error(`${entity} not found`);
      arr[idx] = { ...arr[idx], ...data, updated_date: new Date().toISOString() };
      write(key, arr);
      return arr[idx];
    },

    async delete(id) {
      const { key, arr } = getRecords(entity);
      write(
        key,
        arr.filter((r) => r.id !== id)
      );
      return { deleted: true };
    },

    async deleteMany(options = {}) {
      const { key } = getRecords(entity);
      write(key, []);
      return { deleted: true };
    },
  };
}

export const entities = {
  Streak: makeEntity("Streak"),
  CheckIn: makeEntity("CheckIn"),
  Relapse: makeEntity("Relapse"),
  Post: makeEntity("Post"),
  Comment: makeEntity("Comment"),
};

// ---- integrations ----
async function downscaleImage(file, maxSize = 1280, quality = 0.82) {
  const dataUrl = await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(file);
  });
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      const scale = Math.min(1, maxSize / Math.max(width, height));
      width = Math.max(1, Math.round(width * scale));
      height = Math.max(1, Math.round(height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      try {
        resolve(canvas.toDataURL("image/jpeg", quality));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function pickPersona(system) {
  const sys = String(system || "");
  if (/therapist|reflective/i.test(sys)) return "therapist";
  if (/coach|no-nonsense|action-oriented/i.test(sys)) return "coach";
  if (/friend|casual|buddy/i.test(sys)) return "friend";
  return "mentor";
}

function contextNumber(system, label) {
  const m = String(system || "").match(new RegExp(`${label}:\\s*(\\d+)`));
  return m ? parseInt(m[1], 10) : null;
}

function localCoachReply(messages = []) {
  const system = messages.find((m) => m.role === "system")?.content || "";
  const userMsgs = messages.filter((m) => m.role === "user");
  const msg = (userMsgs[userMsgs.length - 1]?.content || "").toLowerCase();
  const persona = pickPersona(system);
  const streak = contextNumber(system, "Current streak");
  const best = contextNumber(system, "Longest streak");
  const goal = contextNumber(system, "Current goal") || 30;

  const urge = (n) =>
    `Urges are like waves — they build, peak, and always pass. Right now, don't fight the thought, ${n ? "just let it ride " : ""}and use the 15-minute rule: delay, don't deny. Do one physical thing immediately — cold water on your face, 20 push-ups, 10 slow deep breaths. Movement breaks the loop faster than willpower ever will.\n\nYou've got ${n ? n + " clean days behind you — " : ""}that's real progress you're protecting. This urge is temporary. You are stronger than this single moment.`;
  const discouraged = (n) =>
    `Discouragement is part of the process, not proof you're failing. Look at what you've actually done${n ? ` — ${n} days clean` : ""}${best ? `, and a personal best of ${best} days` : ""}. That's not nothing; that's evidence.\n\nProgress in this fight isn't a straight line. One hard day doesn't erase what you've built. Be as kind to yourself right now as you'd be to a friend in your exact situation.`;
  const relapse = (n) =>
    `A relapse is information, not an identity. You didn't lose everything — you learned exactly where the trap was, and next time you'll see it coming${n ? ` (and your ${n} days are still part of your total clean days)` : ""}.\n\nRight now: reset, don't spiral. Drink water, eat something, and pick one tiny win to close today — a walk, a shower, a check-in. Tomorrow you start from zero but with more knowledge than you had on day one.`;
  const lateNight = () =>
    `Late nights are when urges hit hardest, because that's when your defenses are down. Build a hard "end of day" routine: set a bedtime alarm, keep your phone charging outside the bedroom, and swap scrolling for reading or a cold shower.\n\nHave a pre-loaded emergency move for 1-3 AM — a saved playlist, a quick workout, or a call with someone you trust. A tired brain can't negotiate with an urge, so win the battle the night before.`;
  const patterns = (n) =>
    `Here's what your data is telling me: every urge and relapse you log is a data point about your triggers. The more honestly you log, the clearer the pattern gets.\n\n${n ? `You're at ${n} days right now — use this momentum to study your own history. Look at your relapse entries: which time of day? which trigger? which mood?` : `Once you log a few check-ins and relapses, I can help you spot your top triggers with real data.`} Patterns are predictable, and predictable is beatable.`;
  const weekly = (n) =>
    `Here's your weekly review.${n ? ` You're currently ${n} days clean` : ""}${goal ? ` with a goal of ${goal} days` : ""}. The number that matters most isn't today's streak — it's your honesty with yourself.\n\nReview your check-ins this week: what day was hardest, and what actually helped? Double down on that. If there was a close call, that's not failure — it's a warning system you built. Keep going.`;
  const cheer = (n) =>
    `I see you putting in the work${n ? ` — ${n} days is something to respect` : ""}. Keep stacking the small wins: show up to your check-in, be honest about the hard days, and protect your routine. You don't have to be perfect, you just have to not quit.\n\nI'm here whenever you need to talk.`;
  const panic = () =>
    `This is the moment that matters most — not when it's easy, but right now. Slow your breathing: in for 4, hold for 7, out for 8. Repeat 4 times.\n\nThen pick one tool — panic mode, cold water, push-ups, a walk. You are in control of the next 60 seconds. That's all you need to win right now.`;

  let reply;
  if (/strong urge|urge right now|urge now|about to relapse|struggl.*urge/i.test(msg)) reply = urge(streak);
  else if (/relapsed|relapse|slip|fell|failed/i.test(msg)) reply = relapse(streak);
  else if (/late night|night|insomnia|can't sleep|evening/i.test(msg)) reply = lateNight();
  else if (/pattern|trigger|analyze|analysis/i.test(msg)) reply = patterns(streak);
  else if (/weekly|review|report/i.test(msg)) reply = weekly(streak);
  else if (/discourag|sad|down|hopeless|giving up|quit.*all|feel.*fail/i.test(msg)) reply = discouraged(streak);
  else if (/panic|urge|emergency|right now|help me now/i.test(msg)) reply = panic();
  else if (/^yes$|^ok$|thanks|thank you/i.test(msg)) reply = "Anytime. I'm proud of you for reaching out — that's the hardest part for a lot of people. You're doing better than you think.";
  else reply = cheer(streak);

  if (persona === "coach") {
    reply += "\n\nNow get one small win done in the next hour. No excuses.";
  } else if (persona === "therapist") {
    reply += "\n\nHow does that land with you? What's the feeling underneath it right now?";
  } else if (persona === "friend") {
    reply += "\n\nYou got this. Text me whenever.";
  }

  return reply;
}

export const integrations = {
  Core: {
    async UploadFile({ file }) {
      const file_url = await downscaleImage(file);
      return { file_url };
    },
    async InvokeLLM(options = {}) {
      const prompt = options.prompt;
      const messages = messagesFromPrompt(prompt);
      await new Promise((r) => setTimeout(r, 700 + Math.random() * 500));
      return localCoachReply(messages);
    },
  },
};

function messagesFromPrompt(prompt) {
  const lines = String(prompt || "").split("\n");
  const firstUserIdx = lines.findIndex((l) => /^User:/.test(l));
  const system = lines.slice(0, firstUserIdx >= 0 ? firstUserIdx : lines.length).join("\n");
  let user = "";
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^User:\s*(.+)$/);
    if (m) user = m[1].trim();
  }
  const messages = [{ role: "system", content: system }];
  if (user) messages.push({ role: "user", content: user });
  return messages;
}

export const AI_PROVIDERS = {
  local: {
    name: "Offline Coach",
    desc: "Free, private, works without internet",
    baseUrl: "",
    model: "",
    needsKey: false,
  },
  openai: {
    name: "OpenAI",
    desc: "GPT-4o class models",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    needsKey: true,
  },
  deepseek: {
    name: "DeepSeek",
    desc: "Powerful and affordable",
    baseUrl: "https://api.deepseek.com",
    model: "deepseek-chat",
    needsKey: true,
  },
  openrouter: {
    name: "OpenRouter",
    desc: "One key, many models (free tiers)",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "meta-llama/llama-3.3-70b-instruct:free",
    needsKey: true,
  },
  custom: {
    name: "Custom API",
    desc: "Any OpenAI-compatible endpoint",
    baseUrl: "",
    model: "",
    needsKey: true,
  },
};

async function chatRequest(cfg, messages) {
  const provider = AI_PROVIDERS[cfg.provider] || AI_PROVIDERS.openai;
  const base = (cfg.baseUrl || provider.baseUrl || "").replace(/\/+$/, "");
  if (!base) throw new Error("Missing API base URL");
  const url = base.endsWith("/chat/completions") ? base : `${base}/chat/completions`;
  const model = cfg.model || provider.model || "gpt-4o-mini";
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({ model, messages }),
    });
  } catch (err) {
    throw new Error(`Could not reach ${base}. Check the URL and your connection.`);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const hint = text.length ? ` ${text.slice(0, 300)}` : "";
    throw new Error(`AI request failed (${res.status}).${hint}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("The AI returned an empty response.");
  return content.trim();
}

export const ai = {
  async getConfig() {
    const username = currentUsername();
    return read(`${PREFIX}:ai:${username}`, {
      provider: "local",
      apiKey: "",
      baseUrl: "",
      model: "",
    });
  },
  async saveConfig(cfg) {
    const username = currentUsername();
    write(`${PREFIX}:ai:${username}`, cfg);
    return cfg;
  },
  async getChats() {
    const username = currentUsername();
    const chats = read(`${PREFIX}:chats:${username}`, []);
    return Array.isArray(chats) ? chats : [];
  },
  async saveChat(chat) {
    const username = currentUsername();
    const chats = await this.getChats();
    const index = chats.findIndex((c) => c.id === chat.id);
    if (index >= 0) chats[index] = chat;
    else chats.push(chat);
    chats.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    write(`${PREFIX}:chats:${username}`, chats);
    return chat;
  },
  async deleteChat(id) {
    const username = currentUsername();
    const chats = await this.getChats();
    write(
      `${PREFIX}:chats:${username}`,
      chats.filter((c) => c.id !== id)
    );
    return true;
  },
  async chat(cfg, { messages }) {
    if (cfg.provider === "local" || !cfg.apiKey) return localCoachReply(messages);
    return chatRequest(cfg, messages);
  },
  async test(cfg) {
    if (cfg.provider === "local") return "Offline coach is always available.";
    return chatRequest(cfg, [
      { role: "user", content: "Reply with exactly: OK" },
    ]);
  },
};

export const db = { auth, entities, integrations, ai };
export default db;
