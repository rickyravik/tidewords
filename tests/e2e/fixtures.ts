// Data helpers for the e2e suite. Nothing here hardcodes a level id, word or
// letter set: every test reads whatever is actually in `chapter-01.json` on
// disk right now and derives its test data from that, since level content is
// generated (see HANDOVER.md section 7) and can change at any time.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export interface PlacedWord {
  word: string;
  row: number;
  col: number;
  dir: 'across' | 'down';
}

export interface GameLevel {
  id: string;
  chapter: number;
  index: number;
  letters: string[];
  rows: number;
  cols: number;
  words: PlacedWord[];
  bonusWords: string[];
}

interface ChapterPack {
  chapter: number;
  title: string;
  theme: string;
  levels: GameLevel[];
}

const CHAPTER_ONE_PATH = fileURLToPath(
  new URL('../../public/levels/chapter-01.json', import.meta.url),
);

export function readChapterOne(): ChapterPack {
  return JSON.parse(readFileSync(CHAPTER_ONE_PATH, 'utf-8')) as ChapterPack;
}

/** The first playable level in chapter 1, whatever it currently is. */
export function firstLevel(): GameLevel {
  const level = readChapterOne().levels[0];
  if (!level) {
    throw new Error('public/levels/chapter-01.json has no levels to test against');
  }
  return level;
}

/** The shortest target word in a level — quickest to swipe and assert on. */
export function shortestTargetWord(level: GameLevel): PlacedWord {
  const sorted = [...level.words].sort((a, b) => a.word.length - b.word.length);
  const shortest = sorted[0];
  if (!shortest) {
    throw new Error(`Level ${level.id} has no target words`);
  }
  return shortest;
}

/**
 * A word that uses every wheel letter exactly once (so it is always
 * formable by swiping) but does not exactly match any of this level's
 * target or bonus words, so submitting it always classifies as "invalid" —
 * see `classifySubmission` in src/game/validate.ts.
 */
export function invalidButFormableWord(level: GameLevel): string {
  const forbidden = new Set([...level.words.map((w) => w.word), ...level.bonusWords]);
  const base = level.letters.map((l) => l.toUpperCase());
  const rotations = base.map((_, i) => [...base.slice(i), ...base.slice(0, i)].join(''));
  const attempts = [
    base.join(''),
    [...base].reverse().join(''),
    [...base].sort().join(''),
    [...base].sort().reverse().join(''),
    ...rotations,
  ];
  const candidate = attempts.find((word) => word.length >= 3 && !forbidden.has(word));
  if (!candidate) {
    throw new Error(`Could not build an invalid-but-formable word for level ${level.id}`);
  }
  return candidate;
}

/** Flat (row-major) index of a grid cell, matching Grid.tsx's render order. */
export function cellIndex(level: GameLevel, row: number, col: number): number {
  return row * level.cols + col;
}

/** The (row, col) of the Nth letter of a placed word. */
export function letterCell(word: PlacedWord, letterIndex: number): { row: number; col: number } {
  return word.dir === 'across'
    ? { row: word.row, col: word.col + letterIndex }
    : { row: word.row + letterIndex, col: word.col };
}
