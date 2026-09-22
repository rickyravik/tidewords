# Credits

Third party assets used in Tidewords and their licences. Every asset added to the project must
be listed here before shipping (see `HANDOVER.md` section 1).

## Sound and haptics

All sound effects (letter ticks, chimes, thud, fanfare) and the ambient music loop are synthesised
at runtime with the Web Audio API (oscillators + gain envelopes) — see `src/audio/sounds.ts`. No
audio files are bundled, so there is nothing third-party to list here. Haptics use the standard
Vibration API directly (`src/haptics/haptics.ts`), no library involved.

## Fonts

Both fonts below are self-hosted in `public/fonts/` (see `src/styles/fonts.css`) so the app keeps
its type offline once installed, per `HANDOVER.md` section 13. Files were downloaded from Google
Fonts' own CDN (`fonts.gstatic.com`), which serves the same OFL-licensed files Google Fonts
publishes; nothing was modified.

- **Lexend** — used for UI text, letter tiles and the wheel (`--font-ui`).
  Source: https://fonts.google.com/specimen/Lexend
  Licence: SIL Open Font License 1.1
  File: `public/fonts/lexend-variable.woff2` (a variable font; the `400` and `700` `@font-face`
  weights in `src/styles/fonts.css` both reference this one file, per Google's own variable-font
  serving convention — the two declarations were downloaded from `fonts.gstatic.com` as
  byte-identical files, confirmed with `md5sum`, so only one copy is shipped).
- **Young Serif** — used for headings and chapter titles (`--font-heading`).
  Source: https://fonts.google.com/specimen/Young+Serif
  Licence: SIL Open Font License 1.1
  File: `public/fonts/youngserif-regular.woff2` (weight 400 only, per the design spec).
- **OpenDyslexic** — optional dyslexia-friendly font for tiles and the wheel only
  (`--font-tiles`, active when Settings' "Dyslexia-friendly font" toggle is on), per
  `HANDOVER.md` section 9.3.
  Source: extracted from the [`@fontsource/opendyslexic`](https://www.npmjs.com/package/@fontsource/opendyslexic)
  npm package (weights 400/700), itself built from Abbie Gonzalez's OpenDyslexic project.
  Licence: SIL Open Font License 1.1.
  Files: `public/fonts/opendyslexic-400.woff2`, `public/fonts/opendyslexic-700.woff2`.

## PWA icons

`public/icons/icon-192.png` and `public/icons/icon-512.png` are original placeholder artwork
generated for this project (a flat `--deep-sea` background with a simple brass ring), not sourced
from anywhere third party, so no licence entry is required. They exist to make the web app
manifest valid; replacing them with real illustrated icons before launch is a follow-up (see
`HANDOVER.md` section 16, Phase 4 acceptance: "final name and icons").

## Word lists and level generation

Every level across all 5 chapters (100 levels total) is produced algorithmically by
`scripts/generate-levels.ts` — no level's words are chosen by hand.

- **Dictionary source:** [`word-list`](https://github.com/sindresorhus/word-list) (npm, MIT
  licence, © Sindre Sorhus), a dev dependency read directly from `node_modules/word-list/words.txt`
  by `scripts/lib/wordlist.ts`. It supplies ~274k English words and is used only to confirm that a
  derived word form is genuine English spelling — see "Fairness approach" below.
  ```
  MIT License

  Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (https://sindresorhus.com)

  Permission is hereby granted, free of charge, to any person obtaining a copy of this software
  and associated documentation files (the "Software"), to deal in the Software without
  restriction, including without limitation the rights to use, copy, modify, merge, publish,
  distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the
  Software is furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all copies or
  substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
  BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
  DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
  ```
- **Fairness approach:** HANDOVER.md section 7 asks for SCOWL (en_GB) plus a licensed word-
  frequency dataset (e.g. wordfreq); neither is available in this sandboxed environment, so
  commonness is guaranteed by construction instead of a frequency cut-off.
  `data/wordlists/common-roots.txt` is a hand-curated seed of ~760 everyday English words (the one
  hand-picked artefact in the whole pipeline — grouped into thematic sections, including a
  nautical/coastal one that fits the game's chart-of-a-voyage setting). `scripts/lib/wordlist.ts`
  expands each root with its regular inflections (plurals, -ed, -ing, -er/-est, restricted by a
  rough part of speech read from the root list's section headers, so a noun like "ant" never picks
  up a spurious "-ed"/"-ing" form) and keeps a derived form only if it is also a genuine `word-list`
  dictionary entry — this is what filters the noisy 274k-word list down to real, current English.
  Every candidate, root or derived, is also checked against `data/blocklist.txt` (profanity,
  slurs, and specific archaic/nonstandard forms spotted by hand while reviewing generated levels,
  e.g. "builded", "calfs", "spined"). The resulting ~1,770-word corpus is the *only* source
  `scripts/generate-levels.ts` draws base, target and bonus words from.
- **`public/dictionary.json`:** the same filtered corpus, shipped as a compact (~15KB) sorted JSON
  array of uppercase words, for future bonus-word lookups beyond a level's own `bonusWords` (not
  yet wired into `src/game/validate.ts` — a follow-up, not required for the game to work today).
