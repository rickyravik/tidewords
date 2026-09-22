/**
 * Motion timing constants from HANDOVER.md section 9.5. Every component's
 * animation numbers live here so they can't drift from the spec. Framer
 * Motion durations are in seconds, so each `*_MS` constant has a `*_SECONDS`
 * twin ready to drop into a `transition` prop.
 */

export const LETTER_SELECTED_MS = 90;

export const CORRECT_WORD_STAGGER_MS = 40;
export const CORRECT_WORD_TILE_MS = 280;
export const CORRECT_WORD_TILE_SECONDS = CORRECT_WORD_TILE_MS / 1000;

export const REPEAT_WORD_PULSE_MS = 400;
export const REPEAT_WORD_PULSE_SECONDS = REPEAT_WORD_PULSE_MS / 1000;

export const INVALID_WORD_SHAKE_MS = 300;
export const INVALID_WORD_SHAKE_SECONDS = INVALID_WORD_SHAKE_MS / 1000;

export const BONUS_WORD_MS = 350;
export const BONUS_WORD_SECONDS = BONUS_WORD_MS / 1000;

export const SHUFFLE_MS = 400;
export const SHUFFLE_SECONDS = SHUFFLE_MS / 1000;

export const LEVEL_COMPLETE_TOTAL_MS = 900;
// Split the 900ms budget: the tile-flip wave plays first while the grid is
// still on screen, then Play hands off to the Level Complete screen, which
// plays the "summary slides up" half of the moment on its own mount.
export const LEVEL_COMPLETE_FLIP_MS = 500;
export const LEVEL_COMPLETE_FLIP_SECONDS = LEVEL_COMPLETE_FLIP_MS / 1000;
export const LEVEL_COMPLETE_SUMMARY_MS = LEVEL_COMPLETE_TOTAL_MS - LEVEL_COMPLETE_FLIP_MS;
export const LEVEL_COMPLETE_SUMMARY_SECONDS = LEVEL_COMPLETE_SUMMARY_MS / 1000;

const TILE_FLIP_STAGGER_MS = 20;

/** Per-letter delay (seconds) for the correct-word fly-in wave. */
export function correctWordFlyDelay(letterIndexInWord: number): number {
  return (letterIndexInWord * CORRECT_WORD_STAGGER_MS) / 1000;
}

/** Per-tile delay (seconds) for the level-complete tile-flip wave. */
export function levelCompleteFlipDelay(rowMajorIndex: number): number {
  return (rowMajorIndex * TILE_FLIP_STAGGER_MS) / 1000;
}
