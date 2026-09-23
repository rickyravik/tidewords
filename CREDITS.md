# Credits

Third party assets used in Tidewords and their licences. Every asset added to the project must
be listed here before shipping (see `HANDOVER.md` section 1).

## Sound and haptics

All sound effects (letter ticks, chimes, thud, fanfare) and the ambient music loop are synthesised
at runtime with the Web Audio API (oscillators + gain envelopes) — see `src/audio/sounds.ts`. No
audio files are bundled, so there is nothing third-party to list here. On the web, haptics use the
standard Vibration API directly (`src/haptics/haptics.ts`). In the native iOS/Android builds they
use [`@capacitor/haptics`](https://github.com/ionic-team/capacitor-plugins) (MIT licence), loaded
only inside the native shell.

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

All app icons and the favicon are original artwork made for this project (hand-written SVG, no
third-party artwork, clip art or fonts), so no licence entry is required. The design is a brass
compass rose on a night-time sea chart, drawn from the game's own concept (`HANDOVER.md` section
9.1) in its colour tokens, with no lettering so it survives a change of name.

- Sources: `public/icons/icon.svg` (rounded "any" icon), `public/icons/icon-maskable.svg`
  (full-bleed, motif inside the maskable safe zone) and `public/favicon.svg` (a simplified cut for
  16–32px).
- Rendered PNGs (the SVGs screenshotted at exact sizes in headless Chromium):
  `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` and
  `apple-touch-icon.png` (180×180, rendered from the maskable source).

The final name and icon remain an open decision for the owner (`HANDOVER.md` section 18).

## Word lists and level generation

Every level is produced algorithmically — no level's words are chosen by hand. The 100 shipped
levels are generated offline by `scripts/generate-levels.ts`; endless levels (101 onwards) are
generated on the device by `src/game/endless.ts`. Both draw only from the sources below. How the
files were imported is documented at the top of `scripts/build-wordlists.ts`; how they are
combined is documented in `scripts/lib/wordlist.ts`. `data/wordlists/common-roots.txt` (a small
hand-curated list of everyday words) survives only as an "always allowed as a target" boost list.

- **SCOWL (Spell Checker Oriented Word Lists) 2020.12.07**, by Kevin Atkinson —
  http://wordlist.aspell.net/, downloaded from
  `https://downloads.sourceforge.net/wordlist/scowl-2020.12.07.tar.gz`.
  Used: the `english-words.*` and `british-words.*` lists at sizes 10–50 (en_GB `-ise` spelling;
  American-only, `-ize`-only and variant spellings are excluded by not reading those lists).
  Only lowercase, letters-only 3–7 letter entries are kept, so proper nouns, abbreviations,
  contractions, apostrophes and accented words never enter. Trimmed copy:
  `data/wordlists/scowl-en-gb.txt` (not shipped). Size <= 35 is the target-word tier and size
  <= 50 the bonus-word tier, per HANDOVER.md section 7. `public/dictionary.json` is derived from
  this list only.
  Licence (SCOWL's own permissive notice; the full `Copyright` file, which also credits its
  public-domain and permissively licensed sources — Moby Words II, Brian Kelk's UK English
  Wordlist, 12Dicts, WordNet 1.6, ENABLE, UKACD, VarCon/Ispell — ships inside the tarball above):
  ```
  Copyright 2000-2018 by Kevin Atkinson

  Permission to use, copy, modify, distribute and sell these word lists, the associated
  scripts, the output created from the scripts, and its documentation for any purpose is hereby
  granted without fee, provided that the above copyright notice appears in all copies and that
  both that copyright notice and this permission notice appear in supporting documentation.
  Kevin Atkinson makes no representations about the suitability of this array for any purpose.
  It is provided "as is" without express or implied warranty.
  ```
  SCOWL's sizes 10–50 are built from Moby Words II, Brian Kelk's UK English Wordlist, 12Dicts and
  3esl/2of4brif (all public domain), with inflections from a database derived from WordNet 1.6
  ("WordNet 1.6 Copyright 1997 by Princeton University. All rights reserved.", used under
  Princeton's permissive licence) and variant spellings from VarCon (Copyright 2000-2016 Kevin
  Atkinson, Copyright 2016 Benjamin Titze, permissive; derived from Ispell, Copyright 1993 Geoff
  Kuenning, BSD-style).
- **FrequencyWords `en_50k.txt` (OpenSubtitles 2018)**, by Hermit Dave —
  https://github.com/hermitdave/FrequencyWords, file
  `content/2018/en/en_50k.txt`. Content licence: **CC BY-SA 4.0** (code: MIT). Used offline only,
  to rank how commonly each SCOWL word is actually used, so target words are everyday words and
  the most familiar ones are preferred. The trimmed rank table `data/wordlists/subtitle-frequency.txt`
  (ranks for SCOWL words only; not shipped) is a derivative of that list and is itself available
  under CC BY-SA 4.0, with attribution to Hermit Dave / FrequencyWords and the OpenSubtitles
  corpus (http://www.opensubtitles.org/, via OPUS, http://opus.nlpl.eu/OpenSubtitles2018.php).
  No frequency data is shipped to players: the only trace in the app is _which_ SCOWL words were
  picked as level targets and the order of the `targets` list in `public/dictionary.json`.
- **Project filters (original to this project):** `data/blocklist.txt` (profanity, slurs,
  sexual/drug terms — extended for SCOWL, applied to every tier and the shipped dictionary) and
  `data/wordlists/not-targets.txt` (real words accepted as bonus words but never chosen as target
  answers: interjections, apostrophe fragments such as "don", given names and slang).
- **`public/dictionary.json`:** ~23,700 blocklist-filtered 3–7 letter words (target tier ranked
  most-common first, then the bonus tier, plus the 100 shipped base words), ~162 KB raw /
  ~68 KB gzipped. Used at runtime by `classifySubmission` for bonus words and by
  `generateEndlessLevel` for levels beyond 100.
