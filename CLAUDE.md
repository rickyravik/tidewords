# Tidewords

A word wheel crossword puzzle game (mobile web / installable PWA). See `HANDOVER.md` for the
full design and build-phase spec this project follows.

## Project structure

```
tidewords/
  data/
    wordlists/           # raw word lists (not shipped)
    blocklist.txt        # offensive or unfair words, one per line
  scripts/
    generate-levels.ts   # offline level generator (Node) — Phase 3
    validate-levels.ts   # checks every generated level — Phase 3
  public/
    levels/
      chapter-01.json
    dictionary.json      # bonus word dictionary (shipped, compact) — Phase 3
    audio/
    art/
  src/
    game/                # pure logic, no React, fully unit tested
      types.ts
      letters.ts         # canForm, letter counts
      grid.ts            # build grid from level, cell lookups
      validate.ts        # classify a submitted word
      hints.ts
      economy.ts
      completion.ts       # isLevelComplete / isCellFilled
      levelShape.ts        # fairness validator: every 2+ letter run is a target word
    state/
      profileStore.ts    # Zustand, persisted to localStorage as "tidewords:v1"
      levelReducer.ts     # active level state (useReducer)
    components/
      Wheel/ Grid/ Tile/ WordPreview/ TopBar/ HelperButtons/
    screens/
      Play/ LevelComplete/
    styles/
      tokens.css
      global.css
    App.tsx
    main.tsx
  tests/
    e2e/                 # Playwright — Phase 2+
  CLAUDE.md
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
npm run dev         # start the dev server (add --host, or use `npm run dev -- --host`, for LAN/phone access)
npm run build        # tsc -b && vite build
npm run preview      # preview the production build, --host by default
npm run typecheck    # tsc -b
npm run lint         # eslint .
npm run format       # prettier --write .
npm test             # vitest run
npm run test:watch   # vitest
```

## Status

Phase 1 (playable core) is complete: `src/game` logic with unit tests, Grid + Wheel (swipe with
backtracking) + WordPreview, 10 hand-written levels in `public/levels/chapter-01.json`
(validated by `src/game/levelShape.ts` against the "every 2+ letter run is a target word" rule),
basic Play and Level Complete screens, and localStorage save/resume.

Not yet built (later phases per `HANDOVER.md`): full design system/motion/sound/haptics, Settings
screen, Chart (chapter map) screen, level generator + Chapters 2–5, daily puzzle, PWA/offline,
Capacitor store builds.
