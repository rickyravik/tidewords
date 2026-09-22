# Credits

Third party assets used in Tidewords and their licences. Every asset added to the project must
be listed here before shipping (see `HANDOVER.md` section 1).

## Phase 1

No third party art, audio, or font files are bundled yet. The design tokens in
`src/styles/tokens.css` reference "Lexend" and "Young Serif" by name, but the actual font files
are not yet self-hosted — the browser falls back to the system UI font for now. Self-hosting
those fonts (both open licensed on Google Fonts, OFL) is Phase 2 work per `HANDOVER.md` section
9.3.

## Word lists

The 10 hand-written Phase 1 levels in `public/levels/chapter-01.json` use common English words
chosen by hand, not sourced from a word list file. The SCOWL-based word list and its licence will
be recorded here when the Phase 3 level generator is built.
