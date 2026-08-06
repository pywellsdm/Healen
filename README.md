<div align="center">

<img src="healen-logo.png" alt="Healen logo" width="140" height="140" />

# Healen

**Quit gooning, sleep better. Reclaim your life — one day and one night at a time.**

A private, local-first recovery companion that tracks your streak, helps you sleep,
coaches you daily, and keeps you accountable. 100% free, 100% private, no accounts,
no tracking, no cloud.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

</div>

---

## What is Healen?

Healen (formerly UnGoonify) is a recovery coach for anyone fighting porn / compulsive
gooning habits — with a built-in sleep mode to help you build a healthy sleep routine.
Every streak, check-in, relapse, sleep session, chat, and setting lives **only on your
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

### 🌙 Sleep Mode
- A dedicated **sleeping mode** with its own streak, milestones, and stats
- Tap **Start Sleep** before bed and **wake up** when you're done — 7–9 hours counts
  toward your sleep streak
- Mode-aware **Wind Down** tools (body scan, white noise, breathing) for restless nights

### 🆘 Panic Mode / Wind Down
- A permanent button in the bottom nav (always on — you never know when you need it)
- Gooning mode: instant distraction — deep breathing, mini game, grounding tools
- Sleep mode: calm-your-mind tools — body scan, white noise, and the 20-minute rule

### 🧠 AI Coach
- **Offline coach** that works everywhere, free and private
- Sees both your **gooning and sleep data** to coach both sides of your recovery
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

Everything is stored in your browser's `localStorage` under the `healen` namespace.
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
├── components/     # Layout, Background, streak/sleep UI, shared ui primitives
├── lib/
│   ├── store.js        # The entire local data layer (entities + integrations)
│   ├── streakUtils.js  # Streak & sleep math, check-in logic
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

Gooning is a loop that feeds on shame and silence. Healen breaks the loop with
**numbers you can watch grow, a coach that never gives up, and a community that gets it** —
then helps you wind down and actually rest at night.

> You are not broken. You are not alone. And you can quit.

Built with 💜 for everyone fighting this battle.
