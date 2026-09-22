# Tidewords

A word wheel crossword puzzle game (mobile web / installable PWA). See `HANDOVER.md` for the
full design and build-phase spec this project follows.

## Project structure

```
tidewords/
  data/
    wordlists/            # raw word lists (not shipped) — common-roots.txt, generated-corpus.txt
    blocklist.txt         # offensive/unfair/nonstandard words, one per line
  scripts/
    generate-levels.ts    # offline level generator (Node) — `npm run generate-levels`
    validate-levels.ts    # checks every level in public/levels/ — `npm run validate-levels`
    lib/generator.ts       # crossword layout + generation algorithm
    lib/wordlist.ts         # word-list expansion/filtering
  public/
    levels/
      chapter-01.json ... chapter-05.json   # 100 generated levels, 20 per chapter
    dictionary.json       # compact shipped word dictionary (not yet wired into runtime lookups)
    fonts/                # self-hosted Lexend, Young Serif, OpenDyslexic (woff2)
    icons/                # PWA manifest icons (placeholder art)
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
      daily.ts                # deterministic daily-puzzle pick + streak calendar
    state/
      profileStore.ts       # Zustand, persisted to localStorage as "tidewords:v1"
      levelReducer.ts         # active level state (useReducer)
    components/
      Wheel/ Grid/ Tile/ WordPreview/ TopBar/ HelperButtons/ BonusJar/ Modal/
    screens/
      Home/ Chart/ Play/ LevelComplete/ Daily/ Settings/
    audio/
      sounds.ts            # synthesised Web Audio effects + ambient loop, no bundled audio files
    haptics/
      haptics.ts            # navigator.vibrate wrapper
    hooks/
      useReducedMotion.ts    # OS media query + settings.reducedMotion, combined
    motion/
      timings.ts             # HANDOVER 9.5's motion table as named constants
    styles/
      tokens.css              # colour tokens, high contrast, dyslexia font
      chapterThemes.css        # per-chapter [data-theme] colour overrides
      fonts.css                 # @font-face rules for the self-hosted fonts
      global.css
    App.tsx                # screen routing (home/play/complete/settings/chart/daily)
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
npm run test:e2e          # playwright test (5 scenarios × iPhone 13 / Pixel 5)
npm run generate-levels   # regenerate all chapter JSON files
npm run validate-levels   # validate every level currently in public/levels/
```

## Status

Phases 1–4 (per `HANDOVER.md` section 16) are all built:

- **Phase 1 (playable core):** `src/game` pure logic, Zustand profile store, level reducer,
  Wheel/Grid/Tile/WordPreview, Play + Level Complete screens.
- **Phase 2 (feel and polish):** full design tokens, Framer Motion for every moment in section
  9.5 (respecting reduced motion), synthesised sound effects + haptics (no bundled audio files),
  Settings screen (all 7 toggles wired), tap mode + keyboard control on the wheel, a tile-picker
  Reveal helper, BonusJar, and accessibility basics (live region, aria-labels, focus rings).
- **Phase 3 (content):** `scripts/generate-levels.ts` procedurally generates every level — there
  is no hand-picked level content anywhere in `public/levels/` (100 levels across 5 chapters, all
  ≥5 letters/≥5 words per the corrected difficulty floor — see the "Update" note in HANDOVER.md
  section 7.1). Chart (chapter map) and Daily puzzle/streak screens are built.
- **Phase 4 (launch readiness):** PWA manifest + service worker with an update-ready prompt,
  chapter packs precached/runtime-cached, self-hosted fonts (Lexend, Young Serif, OpenDyslexic),
  5 Playwright e2e tests covering HANDOVER.md section 15's scenarios, placeholder PWA icons.

`src/game/sampleLevel.ts` (the hand-checked HANDED fixture from HANDOVER.md section 6) is kept
only as a unit-test fixture for `src/game`'s pure logic — it is never shipped as playable content.

### Known follow-ups (not required for the game to work today)

- `public/dictionary.json` is generated but not yet wired into `src/game/validate.ts`'s bonus-word
  lookup (each level's own precomputed `bonusWords` array is what's actually used at runtime).
- PWA icons are original flat placeholder art, not final illustrated icons.
- No real Lighthouse run in this environment (manual bundle-size/asset checks only — see
  CREDITS.md and the build output for current numbers).
- Capacitor store builds (Phase 4, optional) are not started.
