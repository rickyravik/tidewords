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

Phase 1 (playable core) is done: 10 hand-written levels, swipe-to-spell wheel, crossword grid,
coins/bonus jar economy, and progress that survives a reload. See `CLAUDE.md` for what's built
and what's next.
