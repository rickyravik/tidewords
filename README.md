# Tidewords

A relaxing word wheel crossword puzzle game — mobile web and desktop web, built as an installable
PWA. See [`HANDOVER.md`](./HANDOVER.md) for the full design spec and build phases, and
[`CLAUDE.md`](./CLAUDE.md) for the project structure and coding conventions.

## Getting started

```sh
npm install
npm run dev -- --host   # --host exposes it on your LAN so you can open it on your phone
```

Then open the "Network" URL Vite prints (something like `http://192.168.x.x:5173/`) on a phone
on the same Wi-Fi network.

## Scripts

| Command              | What it does                                       |
| -------------------- | -------------------------------------------------- |
| `npm run dev`        | Start the dev server                               |
| `npm run build`      | Type check and build for production                |
| `npm run preview`    | Preview the production build (also LAN-accessible) |
| `npm run typecheck`  | Type check only (`tsc -b`)                         |
| `npm run lint`       | Lint with ESLint                                   |
| `npm run format`     | Format with Prettier                               |
| `npm test`           | Run the unit test suite once (Vitest)              |
| `npm run test:watch` | Run the unit test suite in watch mode              |

## Status

Phases 1 to 4 are done: 100 generated levels plus endless levels beyond them, the Chart and a
daily puzzle, sound, accessibility settings, and an installable offline PWA. See `CLAUDE.md` for
what's built and what's still open.

## Installing

Tidewords is a PWA for phone and desktop browsers, with no app store builds. Deploy `dist/`
(from `npm run build`) to any static host over HTTPS; the service worker makes it playable
offline after the first visit.

- **Android (Chrome):** menu → **Install app** (or accept the install prompt).
- **iPhone / iPad (Safari):** Share → **Add to Home Screen**. iOS browsers don't support the
  Vibration API, so there are no haptics on iPhone and the Haptics setting is hidden there.
- **Desktop (Chrome / Edge):** the install icon in the address bar. Wide windows get the side
  by side grid and wheel layout.

New versions install in the background and show an "update ready" prompt
(`src/components/Modal/UpdatePrompt.tsx`).
