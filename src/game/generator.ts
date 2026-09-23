import { findLevelShapeErrors } from './levelShape';
import type { Direction, Level, PlacedWord } from './types';

/**
 * Level generation (HANDOVER.md section 7), as pure logic shared by the
 * offline chapter-pack script (scripts/generate-levels.ts) and on-device
 * endless levels (./endless.ts). No Node, DOM or React imports.
 */

/** The word data a level is generated from (see ./dictionary.ts for how it is loaded at runtime). */
export interface WordCorpus {
  /** Target-eligible everyday words, uppercase, most common first: the index is the commonness rank. */
  targets: readonly string[];
  /** Every accepted word (the targets plus the wider bonus tier), uppercase. */
  words: ReadonlySet<string>;
  /** Base words the shipped chapter packs already use; endless levels steer clear of them. */
  reservedBaseWords: ReadonlySet<string>;
}

export const MAX_GRID_SPAN = 8;
export const MIN_WORD_COUNT = 5;

/**
 * The difficulty curve (HANDOVER.md section 7.1, with its "Update": wheels
 * are never below 5 letters and levels never below 5 words), by global level
 * number. Both counts are non-decreasing in `n`, including across the jump
 * from the 100 shipped levels to the endless "101+" tier.
 */
export function difficultyFor(n: number): { letterCount: number; wordCount: number } {
  const letterCount = n <= 25 ? 5 : n <= 150 ? 6 : 7;
  let wordCount: number;
  if (n <= 20) wordCount = 5;
  else if (n <= 60) wordCount = 6;
  else if (n <= 80) wordCount = 7;
  else if (n <= 200) wordCount = 8;
  else if (n <= 350) wordCount = 9;
  else wordCount = 10;
  return { letterCount, wordCount };
}

/** Deterministic PRNG (mulberry32) so a generator run is reproducible. */
export function mulberry32(seed: number): () => number {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mixes numbers into one 32-bit seed, so e.g. (level number, attempt) pairs get independent random streams. */
export function mixSeed(...parts: number[]): number {
  let hash = 0x811c9dc5;
  for (const part of parts) {
    hash ^= part | 0;
    hash = Math.imul(hash, 0x01000193);
    hash ^= hash >>> 13;
  }
  return hash >>> 0;
}

export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j] as T, result[i] as T];
  }
  return result;
}

/** A word's letters in alphabetical order: anagrams share it, so it identifies a wheel. */
export function letterSet(word: string): string {
  return word.split('').sort().join('');
}

/**
 * True for a plural / third-person form whose stem is also a word (THINKS,
 * HORSES). As a base word it would make the wheel feel like a rerun of the
 * stem's level, so base-word pools skip these.
 */
export function isPluralForm(word: string, words: ReadonlySet<string>): boolean {
  if (!word.endsWith('S')) return false;
  return words.has(word.slice(0, -1)) || (word.endsWith('ES') && words.has(word.slice(0, -2)));
}

// --- Sub-word lookup ------------------------------------------------------

const CODE_A = 65;

function letterMask(word: string): number {
  let mask = 0;
  for (let i = 0; i < word.length; i++) mask |= 1 << (word.charCodeAt(i) - CODE_A);
  return mask;
}

interface CorpusIndex {
  entries: Array<{ word: string; mask: number }>;
  rankOf: Map<string, number>;
}

const indexCache = new WeakMap<WordCorpus, CorpusIndex>();

/** Per-corpus lookup tables, built once and cached (endless play reuses one corpus for every level). */
function indexFor(corpus: WordCorpus): CorpusIndex {
  let index = indexCache.get(corpus);
  if (!index) {
    const entries = [...corpus.words]
      .filter((word) => word.length >= 3)
      .map((word) => ({ word, mask: letterMask(word) }));
    const rankOf = new Map(corpus.targets.map((word, rank) => [word, rank]));
    index = { entries, rankOf };
    indexCache.set(corpus, index);
  }
  return index;
}

/**
 * Every corpus word of 3+ letters formable from `baseWord`'s letter counts
 * (HANDOVER.md section 7 step 2), excluding the base word itself. A 26-bit
 * letter mask rejects most words before the count check, which keeps this
 * fast enough to run on a phone.
 */
export function subwordsFor(baseWord: string, corpus: WordCorpus): string[] {
  const baseMask = letterMask(baseWord);
  const baseCounts = new Uint8Array(26);
  for (let i = 0; i < baseWord.length; i++) baseCounts[baseWord.charCodeAt(i) - CODE_A]!++;

  const scratch = new Uint8Array(26);
  const result: string[] = [];
  for (const { word, mask } of indexFor(corpus).entries) {
    if (word === baseWord || word.length > baseWord.length || (mask & ~baseMask) !== 0) continue;
    scratch.set(baseCounts);
    let fits = true;
    for (let i = 0; i < word.length; i++) {
      const code = word.charCodeAt(i) - CODE_A;
      if (scratch[code] === 0) {
        fits = false;
        break;
      }
      scratch[code]!--;
    }
    if (fits) result.push(word);
  }
  return result;
}

// --- Target selection -----------------------------------------------------

/** Extra cost added to a short word so longer targets win when commonness is similar. */
const LENGTH_PENALTY: Record<number, number> = { 3: 3, 4: 1 };
/**
 * Every word at least this common counts as equally familiar. Without the
 * floor the handful of most frequent words (ARE, THE, ONE) would win every
 * level they fit, which is what made the old levels feel repetitive.
 */
const FAMILIAR_RANK = 1500;

export interface TargetPreferences {
  /** Extra cost for a word, e.g. how often earlier levels already used it. `Infinity` bans it as a target. */
  usagePenalty?: (word: string) => number;
  /** Size of the random tiebreak added to every score (default 2). */
  jitter?: number;
}

/**
 * Picks the level's target words: the base word plus the best-scoring
 * target-tier sub-words (HANDOVER.md section 7 step 3). Lower score is
 * better: log commonness rank (floored at FAMILIAR_RANK), plus a short-word penalty, plus the caller's
 * repetition penalty, plus a little randomness. A word and its "-S" form are
 * never both picked, which keeps a grid from reading SEAL / SEALS.
 * Everything formable that isn't a target becomes a bonus word.
 */
export function pickTargets(
  baseWord: string,
  subwords: readonly string[],
  wordCount: number,
  rankOf: ReadonlyMap<string, number>,
  random: () => number,
  preferences: TargetPreferences = {},
): { targets: string[]; bonusWords: string[] } | null {
  const { usagePenalty, jitter = 2 } = preferences;
  const scored: Array<{ word: string; score: number }> = [];
  for (const word of subwords) {
    const rank = rankOf.get(word);
    if (rank === undefined) continue;
    const penalty = usagePenalty?.(word) ?? 0;
    if (!Number.isFinite(penalty)) continue;
    const score =
      Math.log2(Math.max(rank, FAMILIAR_RANK) + 2) +
      (LENGTH_PENALTY[word.length] ?? 0) +
      penalty +
      random() * jitter;
    scored.push({ word, score });
  }
  scored.sort((a, b) => a.score - b.score);

  const picked: string[] = [];
  const pickedSet = new Set<string>();
  for (const { word } of scored) {
    if (picked.length === wordCount - 1) break;
    const isPluralPair =
      pickedSet.has(word + 'S') || (word.endsWith('S') && pickedSet.has(word.slice(0, -1)));
    if (isPluralPair) continue;
    picked.push(word);
    pickedSet.add(word);
  }
  if (picked.length < wordCount - 1) return null;

  const bonusWords = subwords.filter((word) => !pickedSet.has(word)).sort();
  return { targets: [baseWord, ...picked], bonusWords };
}

// --- Crossword layout -----------------------------------------------------

interface Cell {
  row: number;
  col: number;
  letter: string;
}

type CellGrid = Map<string, string>;

function key(row: number, col: number): string {
  return `${row},${col}`;
}

function wordCellsAt(word: string, row: number, col: number, dir: Direction): Cell[] {
  return Array.from({ length: word.length }, (_, i) => ({
    row: dir === 'down' ? row + i : row,
    col: dir === 'across' ? col + i : col,
    letter: word[i] as string,
  }));
}

function placeOnGrid(grid: CellGrid, word: string, row: number, col: number, dir: Direction): void {
  for (const cell of wordCellsAt(word, row, col, dir)) {
    grid.set(key(cell.row, cell.col), cell.letter);
  }
}

/**
 * Reads the maximal run of letters through (row, col) along one axis, with
 * `override` standing in for cells about to be written. Used to check that
 * a new placement only ever creates runs that are target words — the same
 * fairness rule `findLevelShapeErrors` enforces on the finished level.
 */
function runThrough(
  grid: CellGrid,
  override: ReadonlyMap<string, string>,
  row: number,
  col: number,
  dRow: number,
  dCol: number,
): string {
  const at = (r: number, c: number) => override.get(key(r, c)) ?? grid.get(key(r, c));
  let r = row;
  let c = col;
  while (at(r - dRow, c - dCol)) {
    r -= dRow;
    c -= dCol;
  }
  let run = '';
  for (let letter = at(r, c); letter; letter = at(r, c)) {
    run += letter;
    r += dRow;
    c += dCol;
  }
  return run;
}

interface Candidate {
  row: number;
  col: number;
  dir: Direction;
  crossings: number;
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
}

function findCandidates(
  word: string,
  grid: CellGrid,
  bbox: { minRow: number; maxRow: number; minCol: number; maxCol: number },
  targetWords: ReadonlySet<string>,
): Candidate[] {
  const candidates: Candidate[] = [];
  const tried = new Set<string>();

  const tryPlacement = (row: number, col: number, dir: Direction) => {
    const placementKey = `${row},${col},${dir}`;
    if (tried.has(placementKey)) return;
    tried.add(placementKey);

    const last = dir === 'across' ? { row, col: col + word.length - 1 } : { row: row + word.length - 1, col };
    const minRow = Math.min(bbox.minRow, row);
    const maxRow = Math.max(bbox.maxRow, last.row);
    const minCol = Math.min(bbox.minCol, col);
    const maxCol = Math.max(bbox.maxCol, last.col);
    if (maxRow - minRow + 1 > MAX_GRID_SPAN || maxCol - minCol + 1 > MAX_GRID_SPAN) return;

    const cells = wordCellsAt(word, row, col, dir);
    const newCells = new Map<string, string>();
    let crossings = 0;
    for (const cell of cells) {
      const existing = grid.get(key(cell.row, cell.col));
      if (existing === undefined) {
        newCells.set(key(cell.row, cell.col), cell.letter);
      } else if (existing !== cell.letter) {
        return;
      } else {
        crossings++;
      }
    }
    if (crossings === 0 || newCells.size === 0) return;

    // The word's own full run (this also rejects touching letters at either end).
    const [dRow, dCol] = dir === 'across' ? [0, 1] : [1, 0];
    if (runThrough(grid, newCells, row, col, dRow, dCol) !== word) return;
    // Every newly written cell's perpendicular run must be a single letter or a target word.
    for (const cell of cells) {
      if (!newCells.has(key(cell.row, cell.col))) continue;
      const cross = runThrough(grid, newCells, cell.row, cell.col, dCol, dRow);
      if (cross.length >= 2 && !targetWords.has(cross)) return;
    }

    candidates.push({ row, col, dir, crossings, minRow, maxRow, minCol, maxCol });
  };

  for (let i = 0; i < word.length; i++) {
    const letter = word[i];
    for (const [cellKeyStr, gridLetter] of grid) {
      if (gridLetter !== letter) continue;
      const [r, c] = cellKeyStr.split(',').map(Number) as [number, number];
      tryPlacement(r, c - i, 'across');
      tryPlacement(r - i, c, 'down');
    }
  }
  return candidates;
}

export interface LayoutResult {
  words: PlacedWord[];
  rows: number;
  cols: number;
}

/**
 * Lays out `baseWord` (across, at the origin) plus every word in `others`,
 * longest first with shuffled ties, scored by crossing count and bounding
 * box area with a little randomness — HANDOVER.md section 7 step 4. Tries
 * `attempts` shuffled orderings and keeps the best fully-placed layout.
 * Returns null if no attempt manages to place every word within an 8x8 box.
 */
export function layoutWords(
  baseWord: string,
  others: readonly string[],
  random: () => number,
  attempts = 200,
): LayoutResult | null {
  const targetWords = new Set([baseWord, ...others]);
  let best: {
    placements: Array<{ word: string; row: number; col: number; dir: Direction }>;
    score: number;
  } | null = null;

  // A word set that fails the first third of its orderings almost never
  // fits at all, so give up early rather than burn the remaining attempts.
  const giveUpAfter = Math.ceil(attempts / 3);
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (!best && attempt >= giveUpAfter) break;
    // Longest first overall; the shuffle only breaks ties within a length.
    const order = shuffle(others, random).sort((a, b) => b.length - a.length);

    const grid: CellGrid = new Map();
    placeOnGrid(grid, baseWord, 0, 0, 'across');
    const placements = [{ word: baseWord, row: 0, col: 0, dir: 'across' as Direction }];
    let bbox = { minRow: 0, maxRow: 0, minCol: 0, maxCol: baseWord.length - 1 };
    let totalCrossings = 0;
    let ok = true;

    for (const word of order) {
      const candidates = findCandidates(word, grid, bbox, targetWords);
      if (candidates.length === 0) {
        ok = false;
        break;
      }
      let bestCandidate = candidates[0] as Candidate;
      let bestScore = -Infinity;
      for (const candidate of candidates) {
        const area =
          (candidate.maxRow - candidate.minRow + 1) * (candidate.maxCol - candidate.minCol + 1);
        const score = candidate.crossings * 100 - area + random() * 5;
        if (score > bestScore) {
          bestScore = score;
          bestCandidate = candidate;
        }
      }
      placeOnGrid(grid, word, bestCandidate.row, bestCandidate.col, bestCandidate.dir);
      placements.push({ word, row: bestCandidate.row, col: bestCandidate.col, dir: bestCandidate.dir });
      bbox = {
        minRow: bestCandidate.minRow,
        maxRow: bestCandidate.maxRow,
        minCol: bestCandidate.minCol,
        maxCol: bestCandidate.maxCol,
      };
      totalCrossings += bestCandidate.crossings;
    }

    if (!ok) continue;
    const area = (bbox.maxRow - bbox.minRow + 1) * (bbox.maxCol - bbox.minCol + 1);
    const score = totalCrossings * 1000 - area;
    if (!best || score > best.score) {
      best = { placements, score };
    }
  }

  if (!best) return null;

  const rows = best.placements.flatMap((p) => wordCellsAt(p.word, p.row, p.col, p.dir).map((c) => c.row));
  const cols = best.placements.flatMap((p) => wordCellsAt(p.word, p.row, p.col, p.dir).map((c) => c.col));
  const minRow = Math.min(...rows);
  const minCol = Math.min(...cols);

  const words: PlacedWord[] = best.placements.map((p) => ({
    word: p.word,
    row: p.row - minRow,
    col: p.col - minCol,
    dir: p.dir,
  }));

  return {
    words,
    rows: Math.max(...rows) - minRow + 1,
    cols: Math.max(...cols) - minCol + 1,
  };
}

/** Every word placed in a layout must connect to the rest via a shared cell (HANDOVER.md section 7 step 5). Used as a defensive check after layout. */
export function isFullyConnected(words: readonly PlacedWord[]): boolean {
  if (words.length <= 1) return true;
  const cellsOf = (w: PlacedWord) => wordCellsAt(w.word, w.row, w.col, w.dir).map((c) => key(c.row, c.col));
  const adjacency = words.map((w) => new Set(cellsOf(w)));

  const visited = new Set<number>([0]);
  const queue = [0];
  while (queue.length > 0) {
    const current = queue.pop() as number;
    for (let i = 0; i < words.length; i++) {
      if (visited.has(i)) continue;
      const shares = [...adjacency[current]!].some((c) => adjacency[i]!.has(c));
      if (shares) {
        visited.add(i);
        queue.push(i);
      }
    }
  }
  return visited.size === words.length;
}

/** Section 7 step 7: shuffle the wheel so it doesn't just spell the base word in order. */
export function shuffleWheelLetters(baseWord: string, random: () => number): string[] {
  const original = baseWord.split('');
  let attempt = shuffle(original, random);
  for (let i = 0; i < 5 && attempt.join('') === baseWord; i++) {
    attempt = shuffle(original, random);
  }
  return attempt;
}

// --- Whole level ----------------------------------------------------------

export interface BuildLevelArgs {
  id: string;
  chapter: number;
  index: number;
  baseWord: string;
  wordCount: number;
  corpus: WordCorpus;
  random: () => number;
  preferences?: TargetPreferences;
  /** Different target selections to try (with growing randomness) before giving up on this base word. */
  selectionAttempts?: number;
  /** Shuffled layout orderings per selection (section 7 step 4 suggests ~200). */
  layoutAttempts?: number;
}

/**
 * Builds one complete level around `baseWord`: sub-words, targets, bonus
 * words, an 8x8-or-smaller fully connected layout, and a shuffled wheel.
 * Returns null if no selection of targets could be laid out fairly; every
 * level it returns passes `findLevelShapeErrors`.
 */
export function buildLevel(args: BuildLevelArgs): Level | null {
  const { baseWord, wordCount, corpus, random, preferences } = args;
  const selectionAttempts = args.selectionAttempts ?? 3;
  const layoutAttempts = args.layoutAttempts ?? 200;
  const { rankOf } = indexFor(corpus);
  const subwords = subwordsFor(baseWord, corpus);

  for (let attempt = 0; attempt < selectionAttempts; attempt++) {
    const jitter = (preferences?.jitter ?? 2) + attempt * 3;
    const picked = pickTargets(baseWord, subwords, wordCount, rankOf, random, { ...preferences, jitter });
    if (!picked) return null; // more randomness can't conjure extra sub-words

    const layout = layoutWords(baseWord, picked.targets.slice(1), random, layoutAttempts);
    if (!layout || layout.rows > MAX_GRID_SPAN || layout.cols > MAX_GRID_SPAN) continue;
    if (!isFullyConnected(layout.words)) continue;

    const level: Level = {
      id: args.id,
      chapter: args.chapter,
      index: args.index,
      letters: shuffleWheelLetters(baseWord, random),
      rows: layout.rows,
      cols: layout.cols,
      words: layout.words,
      bonusWords: picked.bonusWords,
    };
    if (findLevelShapeErrors(level).length === 0) return level;
  }
  return null;
}
