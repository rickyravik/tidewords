# Tidewords

A word wheel crossword puzzle game (mobile web / installable PWA). See `HANDOVER.md` for the
full design and build-phase spec this project follows.

## Project structure

```
tidewords/
  data/
    wordlists/            # trimmed SCOWL en_GB + frequency ranks, not-targets list (not shipped)
    blocklist.txt         # offensive/unfair words, applied to every tier and the dictionary
  scripts/
    build-wordlists.ts    # rebuilds data/wordlists/ from the raw downloads (see its header)
    generate-levels.ts    # offline level generator (Node) — `npm run generate-levels`
    validate-levels.ts    # checks every level in public/levels/ — `npm run validate-levels`
    lib/wordlist.ts        # builds the corpus from data/wordlists/
  public/
    levels/
      chapter-01.json ... chapter-05.json   # 100 generated levels, 20 per chapter
    dictionary.json       # shipped corpus: bonus-word lookups + endless level generation
    fonts/                # self-hosted Lexend, Young Serif, OpenDyslexic (woff2)
    icons/                # original compass-rose icon (SVG sources + rendered PNGs)
  src/
    game/                 # pure logic, no React, fully unit tested
      types.ts
      letters.ts           # canForm, letter counts
      grid.ts               # build grid from level, cell lookups
      validate.ts           # classify a submitted word
      hints.ts
      economy.ts
      completion.ts          # isLevelComplete / isCellFilled
      levelShape.ts           # fairness validator: every 2+ letter run is a target word
      daily.ts                # deterministic daily-puzzle pick, streaks, calendar
      generator.ts            # crossword layout + generation (used offline and on-device)
      dictionary.ts           # loads/caches public/dictionary.json
      endless.ts              # deterministic on-device levels 101+
    state/
      profileStore.ts       # Zustand, persisted to localStorage as "tidewords:v1"
      levelReducer.ts         # active level state (useReducer)
    components/
      Wheel/ Grid/ Tile/ WordPreview/ TopBar/ HelperButtons/ BonusJar/ Modal/ FirstSwipeGuide/
    screens/
      Home/ Chart/ Play/ LevelComplete/ Daily/ Settings/
      Play/layout.ts         # tile and wheel sizing for the space actually available
    audio/
      sounds.ts            # synthesised Web Audio effects + ambient loop, no bundled audio files
    haptics/
      haptics.ts            # navigator.vibrate (no-op on iOS)
    hooks/
      useReducedMotion.ts    # OS media query + settings.reducedMotion, combined
    motion/
      timings.ts             # HANDOVER 9.5's motion table as named constants
    styles/
      tokens.css              # colour tokens, high contrast, dyslexia font
      chapterThemes.css        # per-chapter [data-theme] colour overrides
      fonts.css                 # @font-face rules for the self-hosted fonts
      global.css
    App.tsx                # screen routing, progression, daily/replay side-play, endless levels
    main.tsx
  tests/
    e2e/                   # Playwright — `npm run test:e2e`
  CLAUDE.md
  CREDITS.md
  HANDOVER.md
```

Rule: everything in `src/game` is pure TypeScript with no DOM or React imports. UI components
read state and dispatch actions; they hold no game rules.

## Coding conventions

- Clean, readable, production style code. Prefer clear over clever.
- Avoid unnecessary abstractions. No generic "engine" layers or factories unless there is a
  real second use.
- Small files with one job each. Functional React components with hooks.
- Game rules live only in `src/game`. Components stay presentational.
- Name things by what they mean in the game: `foundWords`, `wheelLetters`, `revealCell`.
- Short comments only where the reason is not obvious.
- No `any`. No disabled lint rules without a comment explaining why.
- Before finishing any task: run lint, type check and tests, and fix failures.
- Commit per feature with a clear message.

## Commands

```
npm run dev              # start the dev server (add --host for LAN/phone access)
npm run build             # tsc -b && vite build
npm run preview           # preview the production build, --host by default
npm run typecheck         # tsc -b
npm run lint              # eslint .
npm run format            # prettier --write .
npm test                  # vitest run (unit tests)
npm run test:watch        # vitest (watch mode)
npm run test:e2e          # playwright test (5 scenarios × iPhone 13, Pixel 5, Galaxy S24, Galaxy A55, Moto G4)
npm run generate-levels   # regenerate all chapter JSON files and public/dictionary.json
npm run validate-levels   # validate every level currently in public/levels/
```

## Status

Phases 1–4 (per `HANDOVER.md` section 16) are built, plus endless levels:

- **Phase 1 (playable core):** `src/game` pure logic, Zustand profile store, level reducer,
  Wheel/Grid/Tile/WordPreview, Play + Level Complete screens.
- **Phase 2 (feel and polish):** design tokens (WCAG AA in normal and high contrast), Framer
  Motion for every moment in section 9.5 (respecting reduced motion), synthesised sound effects,
  haptics, Settings, tap mode + keyboard control, a tile-picker Reveal, BonusJar, the "You need N
  coins" message, the first-launch swipe guide, and a responsive layout (grid left / wheel right in
  landscape and on desktop).
- **Phase 3 (content):** every level is generated — no hand-picked level content. 100 shipped
  levels from a SCOWL en_GB corpus ranked by word frequency, with repetition control (no target
  word in more than 5 levels, every level has bonus words). Any dictionary word counts as a bonus
  word. Levels continue on the device past 100 (`src/game/endless.ts`). Chart and Daily screens;
  the daily and Chart replays are played "on the side" and never move the player's progress.
- **Phase 4 (launch readiness):** PWA manifest + service worker (app shell, first two chapters and
  the dictionary precached), original icons, self-hosted fonts, iOS home screen meta tags, and
  Playwright e2e tests for section 15's scenarios.

`src/game/sampleLevel.ts` (the hand-checked HANDED fixture from HANDOVER.md section 6) is kept
only as a unit-test fixture for `src/game`'s pure logic — it is never shipped as playable content.

### Open decisions and follow-ups

- The app is a PWA only (mobile and desktop browsers), with no app store builds. Capacitor
  was tried and removed; HANDOVER.md's Capacitor notes are out of date.
- Final game name.
- Hosting: any static HTTPS host serving `dist/`.
- No real Lighthouse run in this environment (manual bundle-size/asset checks only).
- The daily streak only knows its most recent run, so the calendar strip lights that run only.
