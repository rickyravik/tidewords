# Tidewords: Claude Code Handover

**Working title:** Tidewords (rename before launch, check trademarks first)
**Type:** Word wheel crossword puzzle game
**Platforms:** Mobile web and desktop web as an installable PWA. App Store and Play Store builds
later via Capacitor.
**Owner:** Ravi Kumar

Read this whole document before writing any code. Work phase by phase (Section 16). Each phase
has acceptance criteria. Do not start the next phase until the current one meets them.

---

## 1. What we are building

A relaxing, tactile word puzzle. Each level shows a small crossword grid of empty tiles and a
wheel of 5 to 7 letters. The player swipes across letters to spell words. Correct words fly into
the grid. Extra valid words go into a bonus jar for coins. The level ends when the grid is full.

The game is organised as a voyage. Each chapter is a stretch of coastline on a hand drawn sea
chart, with its own palette and illustration. Finishing levels moves a small boat along the
chart.

### Goals

- Feels great in the hand: instant response, satisfying sound and motion, zero lag on swipe.
- Instantly understandable with no tutorial text beyond one guided first level.
- Fair: answers are common words, UK spelling, no obscure or offensive words.
- Works offline once installed.
- Clean, readable codebase that is easy to extend.

### Non goals (for now)

- No accounts, login or server backend.
- No multiplayer or leaderboards.
- No forced or interstitial ads.

### Originality rule

This is an original game in an established genre. Do not copy names, artwork, icons, sounds,
level data or distinctive UI from Wordscapes, Word Trip or similar games. All art, audio and
levels must be original or properly licensed (CC0 or equivalent). Keep a `CREDITS.md` listing
every third party asset and its licence.

---

## 2. Tech stack

| Area                 | Choice                                      | Notes                                                 |
| -------------------- | ------------------------------------------- | ----------------------------------------------------- |
| Build                | Vite + React + TypeScript                   | TypeScript `strict: true`                             |
| Rendering            | SVG for wheel and grid                      | Crisp at any size, easy hit testing                   |
| Input                | Pointer Events                              | One code path for touch, mouse and pen                |
| Animation            | Framer Motion                               | Respect reduced motion                                |
| Audio                | Howler.js                                   | Unlock audio on first user gesture                    |
| State                | Zustand with `persist` middleware           | One store for profile, a reducer for the active level |
| Styling              | CSS Modules plus a global `tokens.css`      | No CSS framework needed                               |
| PWA                  | `vite-plugin-pwa`                           | Precache app shell and chapter packs                  |
| Tests                | Vitest for logic, Playwright for end to end | Mobile viewport in Playwright                         |
| Lint                 | ESLint + Prettier                           | Standard recommended configs                          |
| Store builds (later) | Capacitor                                   | Adds proper haptics on iOS                            |

Use the latest stable versions at the time of setup. Keep dependencies to this list unless there
is a clear reason to add one. Note any addition in the PR or commit message.

---

## 3. Project structure

```
tidewords/
  data/
    wordlists/           # raw word lists (not shipped)
    blocklist.txt        # offensive or unfair words, one per line
  scripts/
    generate-levels.ts   # offline level generator (Node)
    validate-levels.ts   # checks every generated level
  public/
    levels/
      chapter-01.json
      chapter-02.json
    dictionary.json      # bonus word dictionary (shipped, compact)
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
    state/
      profileStore.ts    # Zustand, persisted
      levelReducer.ts    # active level state
    components/
      Wheel/
      Grid/
      Tile/
      WordPreview/
      TopBar/
      HelperButtons/
      BonusJar/
      Modal/
    screens/
      Home/
      Chart/             # chapter map
      Play/
      LevelComplete/
      Daily/
      Settings/
    audio/
      sounds.ts
    haptics/
      haptics.ts
    styles/
      tokens.css
      global.css
    App.tsx
    main.tsx
  tests/
    e2e/
  CLAUDE.md
  CREDITS.md
```

Rule: everything in `src/game` is pure TypeScript with no DOM or React imports. UI components
read state and dispatch actions; they hold no game rules.

---

## 4. Game rules

1. A level has a set of **letters** (5 to 7, duplicates allowed) and a set of **target words**
   placed on the grid.
2. The player forms a word by swiping from letter to letter. Each letter on the wheel can be
   used once per word.
3. On release, the word is classified:
   - **Target word, not yet found:** fill its tiles, play success feedback.
   - **Target word, already found:** pulse its tiles, no penalty.
   - **Valid bonus word** (in dictionary, 3+ letters, formable from the wheel, not a target): add
     to the bonus jar if new, otherwise small "already in jar" feedback.
   - **Anything else:** gentle shake, no penalty.
4. Words shorter than 3 letters are ignored silently.
5. A tile already revealed by a crossing word or a hint stays revealed.
6. The level is complete when every grid cell is filled.
7. There is no timer and no fail state.

### Helpers

| Helper  | Effect                                                                  | Cost     |
| ------- | ----------------------------------------------------------------------- | -------- |
| Shuffle | Randomly reorders wheel letters with an animation                       | Free     |
| Hint    | Reveals one random unrevealed cell                                      | 25 coins |
| Reveal  | Choose a tile; reveals the whole word through it (across first if both) | 75 coins |

Disable a helper button and show its cost greyed out when the player cannot afford it. Never
block play because of coins.

### Economy

| Event                    | Coins                                                |
| ------------------------ | ---------------------------------------------------- |
| Starting balance         | 200                                                  |
| Level complete           | +10                                                  |
| Every 10 new bonus words | +25 (jar fills and empties with a small celebration) |
| Daily puzzle complete    | +50                                                  |
| Daily streak day 7       | +100                                                 |

Keep all numbers in `src/game/economy.ts` as named constants so they are easy to tune.

---

## 5. Data model

```ts
// src/game/types.ts

export type Direction = 'across' | 'down';

export interface PlacedWord {
  word: string; // uppercase, e.g. "HANDED"
  row: number; // start cell, 0 based
  col: number;
  dir: Direction;
}

export interface Level {
  id: string; // "c01-l001"
  chapter: number;
  index: number; // position within chapter, 1 based
  letters: string[]; // wheel letters, e.g. ["D","N","H","D","A","E"]
  rows: number;
  cols: number;
  words: PlacedWord[];
  bonusWords: string[]; // precomputed valid extras for this wheel
}

export interface ChapterPack {
  chapter: number;
  title: string; // "Harbour Mouth"
  theme: ThemeId;
  levels: Level[];
}

export type ThemeId = 'harbour' | 'kelp' | 'aurora' | 'reef' | 'fjord';

export type SubmitResult =
  | { kind: 'found'; word: PlacedWord }
  | { kind: 'repeat'; word: PlacedWord }
  | { kind: 'bonus'; word: string; isNew: boolean }
  | { kind: 'invalid' }
  | { kind: 'tooShort' };

export interface LevelProgress {
  foundWords: string[];
  revealedCells: string[]; // "row,col"
}
```

---

## 6. Level file format and sample level

Levels ship as one JSON file per chapter in `public/levels/`. Load chapter packs lazily.

Use this sample as the first test fixture and the first playable level. It has been checked by
hand: every run of two or more letters on the grid is a target word.

```
     0 1 2 3 4 5
  0  . . H A D .
  1  . . E . . .
  2  H A N D E D
  3  E . . E . E
  4  A . . A . A
  5  D . . N . D
```

```json
{
  "chapter": 1,
  "title": "Harbour Mouth",
  "theme": "harbour",
  "levels": [
    {
      "id": "c01-l001",
      "chapter": 1,
      "index": 1,
      "letters": ["D", "N", "H", "D", "A", "E"],
      "rows": 6,
      "cols": 6,
      "words": [
        { "word": "HAD", "row": 0, "col": 2, "dir": "across" },
        { "word": "HEN", "row": 0, "col": 2, "dir": "down" },
        { "word": "HANDED", "row": 2, "col": 0, "dir": "across" },
        { "word": "HEAD", "row": 2, "col": 0, "dir": "down" },
        { "word": "DEAN", "row": 2, "col": 3, "dir": "down" },
        { "word": "DEAD", "row": 2, "col": 5, "dir": "down" }
      ],
      "bonusWords": ["HAND", "AND", "END", "DEN", "ADD", "DAD"]
    }
  ]
}
```

For Phase 1, hand write 10 levels in this format, starting small (5 letters, 3 words — 5 is the
wheel minimum, see the update note in section 7.1) and
building up to this sample.

---

## 7. Level generator (Phase 3)

`scripts/generate-levels.ts` runs offline in Node and writes chapter packs. It is not shipped to
players.

### Word lists

- Source: SCOWL with the British English (en_GB) variant. Use a common size list (around size 35) for target words and a larger list (around size 50) for bonus words.
- Filter out anything in `data/blocklist.txt`, proper nouns, abbreviations and words with
  apostrophes.
- Optional: rank target words by frequency (for example the `wordfreq` data set) so targets feel
  familiar.
- Check and record every word list licence in `CREDITS.md` before shipping.

### Algorithm

1. **Pick a base word** of the length set by the difficulty curve (Section 7.1). This defines the
   wheel letters.
2. **Find all sub words** that can be formed from the base word's letter counts, 3 letters or
   longer.
3. **Choose target words:** the base word plus the most common sub words until the target count
   is reached. Everything else valid becomes `bonusWords`.
4. **Lay out the crossword:**
   - Place the longest word across at the origin.
   - For each remaining word (longest first), list every possible crossing with already placed
     words where letters match.
   - A placement is legal only if: overlapping cells match, no cell touches a different word
     side by side unless it is a proper crossing, and the cells directly before and after the
     word are empty.
   - Score each legal placement by crossings (higher is better) and bounding box area (smaller is
     better). Pick the best, with a little randomness.
   - Repeat the whole layout around 200 times with shuffled order and keep the best result.
5. **Reject** a layout if it is larger than 8 by 8, places fewer words than required, or is not
   fully connected.
6. **Validate:** scan every row and column. Every run of two or more letters must be exactly one
   target word. Run `scripts/validate-levels.ts` on the output and fail the build on any error.
7. **Normalise** coordinates so the grid starts at row 0, col 0, and shuffle the wheel letters so
   the base word is not spelt out.

### 7.1 Difficulty curve

> **Update:** the wheel never drops below 5 letters, even on level 1 — Ravi asked for a 5-letter
> floor instead of the original 3 to 4 letter opening tier. The table below reflects that.

| Levels    | Wheel letters | Target words |
| --------- | ------------- | ------------ |
| 1 to 10   | 5             | 3 to 5       |
| 11 to 40  | 5 to 6        | 4 to 6       |
| 41 to 100 | 6             | 6 to 8       |
| 101+      | 6 to 7        | 7 to 11      |

Each chapter has 20 levels. Never reuse a base word within the first 500 levels.

### 7.2 Daily puzzle

Pick the daily level deterministically from the date (for example hash `YYYY-MM-DD` into a
pregenerated daily pool). No server needed. Everyone gets the same puzzle on the same day.

---

## 8. Swipe input (the most important feel detail)

The wheel must feel instant and forgiving.

- Render the wheel as one SVG. Letters sit evenly on a circle. Hit radius for each letter is
  about 60% of the gap between letter centres, so fast swipes do not miss.
- On `pointerdown` over a letter: call `setPointerCapture`, start the word with that letter.
- On `pointermove`:
  - If the pointer enters an unselected letter, add it.
  - If the pointer enters the **second to last** selected letter, remove the last letter
    (backtracking).
  - Ignore re entry into any other already selected letter.
- On `pointerup` or `pointercancel`: submit the word, clear selection.
- Draw the trail as an SVG polyline through selected letter centres plus a live segment to the
  pointer.
- Set `touch-action: none` on the wheel and prevent page scroll and pull to refresh during a
  swipe.
- Show the word being built in a preview pill above the wheel, updating per letter.
- Handle duplicate letters (two Ds) as separate wheel positions. Track selection by position
  index, not by letter.

**Tap mode (accessibility):** in Settings, allow tapping letters one by one, with a tick button
to submit and a cross button to clear. Keyboard: typing letters selects matching unused wheel
positions, Enter submits, Backspace removes, Space shuffles.

Performance: do hit testing with simple distance maths, no DOM queries in the move handler. Use
`requestAnimationFrame` for the trail if needed.

---

## 9. Design system

### 9.1 Concept

A sea chart at night. The wheel is a brass compass rose. Letter tiles are chalk white like
painted buoys. Each chapter is a new stretch of coast with its own colour shift. The memorable
element is the compass wheel and its glowing brass trail; everything around it stays quiet and
uncluttered.

### 9.2 Colour tokens

```css
:root {
  --deep-sea: #0f2a3d; /* base background */
  --tide: #1f5c6b; /* panels, empty tile borders */
  --sea-glass: #9cd3c4; /* found words, success */
  --brass: #d8a93b; /* trail, coins, active letters */
  --buoy: #e4606d; /* invalid shake, used sparingly */
  --chalk: #f4f6f1; /* tiles, main text */

  --tile-empty: color-mix(in srgb, var(--chalk) 14%, transparent);
  --tile-text: var(--deep-sea);
}
```

Each chapter theme overrides `--deep-sea`, `--tide` and the background illustration only. Brass,
chalk and sea glass stay constant so the game always feels like one product.

High contrast mode: solid chalk tiles with deep sea borders, no translucency, thicker trail.

### 9.3 Typography

- **Letters and UI:** Lexend (bold for tiles and wheel, regular for UI). Very legible caps and
  good for readers with dyslexia.
- **Headings and chapter titles:** Young Serif, used only for chapter names and the level
  complete screen.
- Optional dyslexia font toggle: OpenDyslexic for tiles and wheel.
- Self host fonts so they work offline.
- Sentence case everywhere. No all caps labels except the letters themselves.

### 9.4 Layout (portrait phone)

```
+--------------------------------+
|  (coin) 540        Lv 12  (cog)|  top bar, small and quiet
|                                |
|        +--+--+--+              |
|        |  |  |  |              |  grid, centred, scales to fit
|     +--+--+--+--+--+           |  upper 50% of the screen
|     |  |  |  |  |  |           |
|        +--+  +--+              |
|                                |
|          [ H A N D ]           |  word preview pill
|                                |
| (jar)     .  N  .       (hint) |
|         D       H              |  compass wheel, lower third,
| (reveal)  E  A  D    (shuffle) |  centred in thumb reach
|              .                 |
+--------------------------------+
```

- Grid tile size is calculated to fit the available area, capped at 56px.
- Wheel diameter: about 70% of screen width on phones, max 360px on desktop.
- All touch targets 48px or larger.
- Landscape and desktop: grid on the left, wheel on the right, both vertically centred.
- Respect safe area insets on notched phones.

### 9.5 Motion

| Moment          | Motion                                                  | Timing                             |
| --------------- | ------------------------------------------------------- | ---------------------------------- |
| Letter selected | Scale 1 to 1.15, brass fill                             | 90ms                               |
| Trail           | Follows pointer, soft glow                              | Live                               |
| Correct word    | Letters fly from preview pill to their tiles, staggered | 40ms stagger, 280ms each, ease out |
| Repeat word     | Matching tiles pulse                                    | 400ms                              |
| Invalid word    | Preview pill shakes, buoy tint                          | 300ms                              |
| Bonus word      | Word shrinks into the jar, jar wobbles                  | 350ms                              |
| Shuffle         | Letters rotate around the wheel to new spots            | 400ms                              |
| Level complete  | Tiles flip in a wave, then summary slides up            | 900ms total                        |

With `prefers-reduced-motion` or the Settings toggle: replace movement with short fades and keep
feedback colours.

Only the level complete wave is non user triggered. No ambient animations beyond a very slow
background drift that stops under reduced motion.

### 9.6 Sound and haptics

- Letter tick that rises in pitch with each added letter. This is a key satisfaction detail.
- Soft chime for a correct word, a lower chime for bonus, a quiet thud for invalid.
- Short fanfare on level complete.
- Optional ambient sea music, off by default.
- Haptics: `navigator.vibrate` where supported (10ms per letter, 30ms on success). iOS web has no
  vibrate support, so this comes with the Capacitor build.
- Sound, music and haptics each have a toggle in Settings.

### 9.7 Copy

Plain, friendly, short. Examples:

- Level complete: "Level 12 done" with a "Next level" button.
- Not enough coins: "You need 25 coins for a hint. Finish a level or find bonus words to earn
  more."
- Bonus jar full: "Jar full. 25 coins added."
- Empty daily streak: "Play today's puzzle to start a streak."

Buttons say exactly what they do. The same action keeps the same name everywhere.

---

## 10. Screens

1. **Home:** big "Play level 12" button, daily puzzle card with streak, settings icon. Opens
   straight into play within one tap.
2. **Chart:** the chapter map. Boat marker on the current level, completed levels as small lit
   dots. Tap a completed level to replay.
3. **Play:** as in Section 9.4.
4. **Level complete:** coins earned, bonus words found, "Next level" button. Every fifth level
   shows the boat moving along the chart.
5. **Daily:** today's puzzle, streak count, calendar strip of the last 7 days.
6. **Settings:** sound, music, haptics, reduced motion, high contrast, dyslexia font, tap mode,
   reset progress (with confirmation).

First launch: skip Home and drop straight into level 1 with a gentle animated hand showing one
swipe. Remove the hand after the first correct word.

---

## 11. Persistence

Store the profile in localStorage under one versioned key.

```ts
// key: "tidewords:v1"
interface SaveData {
  version: 1;
  coins: number;
  currentLevelId: string;
  completedLevelIds: string[];
  levelProgress: Record<string, LevelProgress>; // only in progress levels
  bonusJarCount: number; // 0 to 9, resets at 10
  bonusWordsFound: string[]; // all time, for "already in jar"
  daily: { lastCompletedDate: string | null; streak: number };
  settings: {
    sound: boolean;
    music: boolean;
    haptics: boolean;
    reducedMotion: boolean;
    highContrast: boolean;
    dyslexiaFont: boolean;
    tapMode: boolean;
  };
}
```

- Save after every found word, so closing the app mid level loses nothing.
- Wrap reads in try/catch. If data is missing or corrupt, start a fresh profile.
- Include a `migrate()` function keyed on `version` for future changes.

---

## 12. Accessibility

- All colour pairs meet WCAG AA contrast.
- Visible focus rings on every interactive element.
- Screen reader labels: wheel letters announce "Letter D, position 2", grid announces found words
  and how many remain.
- Live region announces results: "HEAD found. 2 words left."
- Tap mode and keyboard control as in Section 8.
- Never rely on colour alone. Invalid words also shake; found words also fill with letters.

---

## 13. PWA and offline

- Web app manifest with name, icons (original artwork), theme colour `#0F2A3D`,
  `display: standalone`, portrait preferred.
- Precache the app shell, fonts, audio and the first two chapter packs. Cache later chapters when
  first opened.
- Show a small "Update ready" prompt when a new version is available, reload on tap.

---

## 14. Performance targets

- 60fps swipe and animations on a mid range Android phone.
- First load under 200KB gzipped JavaScript, excluding level packs and audio.
- Time to interactive under 2 seconds on 4G.
- Lighthouse scores of 90+ for performance, accessibility and PWA.

---

## 15. Testing

### Unit tests (Vitest), required for everything in `src/game`

- `canForm`: handles duplicate letters correctly (HANDED with two Ds passes, ADDED with three Ds
  fails).
- `validate`: every `SubmitResult` kind, including tooShort and repeat.
- `grid`: builds cells correctly from the sample level; crossing cells are shared.
- `hints`: hint never reveals an already revealed cell; reveal fills the full word.
- `economy`: costs, rewards and jar rollover.
- Generator: every generated level passes the run validation from Section 7 step 6.

### End to end (Playwright, iPhone and Pixel viewports)

- Swipe H A N D E D on the sample level and see the tiles fill.
- Swipe an invalid word and see the shake, with no state change.
- Backtracking during a swipe removes the last letter.
- Complete the sample level and land on the level complete screen.
- Reload mid level and find progress restored.

---

## 16. Build phases

### Phase 1: playable core

Build: project setup, `src/game` logic with tests, Grid, Wheel with swipe, word preview,
validation, 10 handwritten levels, basic Play and Level complete screens, localStorage save.

Acceptance:

- All 10 levels are playable start to finish on a phone browser.
- Swipe feels responsive with backtracking working.
- Progress survives a reload.
- Unit tests pass.

### Phase 2: feel and polish

Build: full design tokens and theme, all motion from Section 9.5, sounds, haptics, shuffle, hint,
reveal, coins, bonus jar, Settings screen, reduced motion and high contrast, first launch guided
swipe.

Acceptance:

- Every moment in Section 9.5 is implemented and respects reduced motion.
- Helpers work and cost the right coins.
- Playwright end to end tests pass.

### Phase 3: content

Build: level generator and validator scripts, word lists and blocklist, 5 chapters (100 levels),
Chart screen, daily puzzle and streaks, chapter themes.

Acceptance:

- 100 generated levels pass validation with zero errors.
- A manual playthrough of 20 random levels finds no unfair or obscure target words.
- Daily puzzle is the same for every player on the same date.

### Phase 4: launch readiness

Build: PWA manifest and service worker, update prompt, performance pass, accessibility audit,
`CREDITS.md` complete, final name and icons. Optional: Capacitor Android and iOS builds with
native haptics.

Acceptance:

- Installs to the home screen and plays offline.
- Performance targets in Section 14 are met.
- No third party asset without a recorded licence.

---

## 17. Coding conventions

- Clean, readable, production style code. Prefer clear over clever.
- Avoid unnecessary abstractions. No generic "engine" layers or factories unless there is a real
  second use.
- Small files with one job each. Functional React components with hooks.
- Game rules live only in `src/game`. Components stay presentational.
- Name things by what they mean in the game: `foundWords`, `wheelLetters`, `revealCell`.
- Short comments only where the reason is not obvious.
- No `any`. No disabled lint rules without a comment explaining why.
- Before finishing any task: run lint, type check and tests, and fix failures.
- Commit per feature with a clear message.

Copy the key points of this section and Section 3 into `CLAUDE.md` at the repo root during
setup, so they apply to every session.

---

## 18. Open decisions for Ravi

- Final game name and icon.
- Whether to add optional rewarded hints (watch an ad for a free hint) after launch.
- Whether and when to release to app stores via Capacitor.

Build with the defaults in this document until these are decided.

---

## 19. First prompt for Claude Code

```
Read HANDOVER.md fully. Set up the project as described in Sections 2 and 3,
create CLAUDE.md from Sections 3 and 17, then build Phase 1 only.
Start with src/game and its unit tests, using the sample level in Section 6
as the first fixture. Stop when Phase 1 acceptance criteria are met and give
me a short summary plus how to run it on my phone over the local network.
```
