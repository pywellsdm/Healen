<div align="center">

<img src="logo-goon.png" alt="UnGoonify logo" width="140" height="140" />

# UnGoonify

**Quit gooning. Reclaim your life — one clean day at a time.**

A private, local-first recovery companion that tracks your streak, coaches you daily,
and keeps you accountable. 100% free, 100% private, no accounts, no tracking, no cloud.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

</div>

---

## What is UnGoonify?

UnGoonify is a streak tracker and recovery coach for anyone fighting porn / compulsive
gooning habits. Every streak, check-in, relapse, chat, and setting lives **only on your
device**. There is no backend, no sign-up, no email, no telemetry — your data cannot be
read by anyone.

Built with a simple belief: **everyone can quit, but nobody quits alone.**

---

## ✨ Features

### 🔥 Streak Tracking
- Daily check-ins with one tap — watch your current streak climb
- Automatic **streak-saver** so a single off-day doesn't destroy your progress
- Goal-based milestones: 7 / 14 / 30 / 45 / 60 / 90 / 180 / 365 days
- Full **Statistics** page — clean days, relapse history, longest streak, goal progress

### 🆘 Panic Mode
- A permanent button in the bottom nav (always on — you never know when you need it)
- Instant distraction: deep breathing, grounding exercises, and a reason-to-stop
  message when urges hit hardest

### 🧠 AI Coach
- **Offline coach** that works everywhere, free and private
- Optional **bring-your-own-key** providers (OpenAI-compatible APIs) — your key is
  stored only on this device and sent only to the provider you choose
- Multiple **personas** (Mentor, Tough Love, Spiritual, Scientific, Anime Girl…)
  plus a fully **custom persona prompt** to build your perfect coach

### 💪 Motivation
- Tone picker: Gentle & Kind · Tough Love · Spiritual · Scientific
- Write your own **custom motivation** — shown on the dashboard every day

### 📱 The Tribe → Telegram
- One tap to join the **official Telegram group**: stories, streak shares, wins,
  struggles, and accountability partners — real people who get it
- Everything stays judgment-free

### 🔔 Daily Reminders
- Optional daily check-in reminder (**off by default** — always opt-in)
- Native Android notifications, scheduled with your chosen time
- Your permission is requested only when you turn it on

### 🎨 Personalization
- Upload any wallpaper, set blur intensity, or reset to the default
- Light/dark-friendly UI with a clean glassmorphism design

### 💾 Backup & Restore
- Export your entire data as a **copy-paste code** or a **backup file**
- Restore on a new phone or after a reinstall — your streak survives forever

### 💜 Support the Project
- Free forever. If it helped you, a small Bitcoin / Ethereum donation keeps it alive

---

## 🔒 Privacy

Everything is stored in your browser's `localStorage` under the `ungoonify` namespace.
The only network calls the app ever makes are:

1. To the **AI provider you explicitly choose** (if any)
2. To open your browser for the **Telegram group** or app **update downloads**

Nothing else. No analytics, no accounts, no servers.

---

## 🚀 Run Locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (default `http://localhost:5173`).

## 📦 Production Build

```bash
npm run build
npm run preview
```

## 📱 Build the Android App

```bash
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
# APK → android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 🗂️ Project Structure

```
src/
├── pages/          # Dashboard, PanicMode, Statistics, Community, AICoach, Settings…
├── components/     # Layout, Background, streak/relapse UI, shared ui primitives
├── lib/
│   ├── store.js        # The entire local data layer (entities + integrations)
│   ├── streakUtils.js  # Streak math & check-in logic
│   ├── notifications.js# Daily reminder scheduling (web + native)
│   ├── backup.js       # Export/restore backup codes & files
│   ├── aiContext.js    # AI coach personas & chat
│   └── telegram.js     # Telegram group link & external link helper
├── App.jsx          # Routes & auth guard
└── main.jsx         # Entry point
android/            # Capacitor native Android project (notifications plugin, icons)
```

---

## ✅ Checks

```bash
npm run lint      # eslint
npm run build     # production build (type-safe, Vite)
```

---

## 🧠 The mission

Gooning is a loop that feeds on shame and silence. UnGoonify breaks the loop with
**numbers you can watch grow, a coach that never gives up, and a community that gets it.**

> You are not broken. You are not alone. And you can quit.

Built with 💜 for everyone fighting this battle.
