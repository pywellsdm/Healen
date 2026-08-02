# AGENTS.md

## Project Context

This is a fully local, privacy-first React + Vite app (no backend, no servers, no tracking).
All data is stored in the browser's localStorage. Treat it as user-owned application code,
keep changes focused on the user's request, and preserve existing project conventions.

## Key Files

- `src/`: frontend application source.
- `src/lib/store.js`: the entire local data layer — auth (username + password),
  entities (Streak, CheckIn, Relapse, Post, Comment), and integrations
  (wallpaper upload, offline AI coach). This replaces the former external backend.
- `src/lib/AuthContext.jsx`: React auth context built on `src/lib/store.js`.
- `vite.config.js`: Vite config with the `@` → `src` alias.

## Working Notes

- Run `npm run dev` to start the dev server, or `npm run preview` for a production preview.
- Run `npm run build` before finishing to confirm everything compiles.
- Run `npm run lint` and `npm run typecheck` before finishing code changes.
- Everything is local-only by design. Never add a remote backend or third-party
  auth without explicit user approval.
