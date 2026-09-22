import { canForm } from '../../src/game/letters';
import type { Direction, PlacedWord } from '../../src/game/types';

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

export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j] as T, result[i] as T];
  }
  return result;
}

/**
 * Picks the level's target words: the base word plus the most "common"
 * remaining sub-words, per HANDOVER.md section 7 step 3. Commonness is
 * approximated (no real frequency data is available in this sandbox, see
 * scripts/lib/wordlist.ts) by preferring hand-curated roots over derived
 * inflections, then shorter words, with a random tiebreak per generation run.
 */
export function pickTargets(
  baseWord: string,
  subwords: readonly string[],
  wordCount: number,
  rootWords: ReadonlySet<string>,
  random: () => number,
): { targets: string[]; bonusWords: string[] } | null {
  const needed = wordCount - 1;
  if (subwords.length < needed) return null;

  const ranked = subwords
    .map((word) => ({ word, jitter: random() }))
    .sort((a, b) => {
      const rootDiff = Number(!rootWords.has(a.word)) - Number(!rootWords.has(b.word));
      if (rootDiff !== 0) return rootDiff;
      if (a.word.length !== b.word.length) return a.word.length - b.word.length;
      return a.jitter - b.jitter;
    })
    .map((entry) => entry.word);

  return {
    targets: [baseWord, ...ranked.slice(0, needed)],
    bonusWords: ranked.slice(needed),
  };
}

export function subwordsFor(baseWord: string, corpus: readonly string[]): string[] {
  const baseLetters = baseWord.split('');
  return corpus.filter(
    (word) => word !== baseWord && word.length >= 3 && canForm(word, baseLetters),
  );
}

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

/** Scans every row and column touched by the bounding box and rejects any run of 2+ letters that isn't exactly one of the level's target words — the same fairness rule `findLevelShapeErrors` enforces at the end, checked early so a bad crossing is never attempted. */
function hasOnlyIntendedRuns(
  grid: CellGrid,
  targetWords: ReadonlySet<string>,
  minRow: number,
  maxRow: number,
  minCol: number,
  maxCol: number,
): boolean {
  for (let row = minRow; row <= maxRow; row++) {
    if (!checkRun(Array.from({ length: maxCol - minCol + 1 }, (_, i) => grid.get(key(row, minCol + i))), targetWords)) {
      return false;
    }
  }
  for (let col = minCol; col <= maxCol; col++) {
    if (!checkRun(Array.from({ length: maxRow - minRow + 1 }, (_, i) => grid.get(key(minRow + i, col))), targetWords)) {
      return false;
    }
  }
  return true;
}

function checkRun(letters: Array<string | undefined>, targetWords: ReadonlySet<string>): boolean {
  let run = '';
  for (let i = 0; i <= letters.length; i++) {
    const letter = letters[i];
    if (letter) {
      run += letter;
    } else if (run) {
      if (run.length >= 2 && !targetWords.has(run)) return false;
      run = '';
    }
  }
  return true;
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

const MAX_GRID_SPAN = 8;

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

    const cells = wordCellsAt(word, row, col, dir);
    const rows = cells.map((c) => c.row);
    const cols = cells.map((c) => c.col);
    const minRow = Math.min(bbox.minRow, ...rows);
    const maxRow = Math.max(bbox.maxRow, ...rows);
    const minCol = Math.min(bbox.minCol, ...cols);
    const maxCol = Math.max(bbox.maxCol, ...cols);
    if (maxRow - minRow + 1 > MAX_GRID_SPAN || maxCol - minCol + 1 > MAX_GRID_SPAN) return;

    const beforeKey = dir === 'across' ? key(row, col - 1) : key(row - 1, col);
    const afterKey =
      dir === 'across' ? key(row, col + word.length) : key(row + word.length, col);
    if (grid.has(beforeKey) || grid.has(afterKey)) return;

    let crossings = 0;
    for (const cell of cells) {
      const existing = grid.get(key(cell.row, cell.col));
      if (existing !== undefined) {
        if (existing !== cell.letter) return;
        crossings++;
      }
    }
    if (crossings === 0) return;

    const scratch = new Map(grid);
    for (const cell of cells) scratch.set(key(cell.row, cell.col), cell.letter);
    if (!hasOnlyIntendedRuns(scratch, targetWords, minRow, maxRow, minCol, maxCol)) return;

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
  let best: { placements: Array<{ word: string; row: number; col: number; dir: Direction }>; score: number } | null =
    null;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const order = shuffle(
      [...others].sort((a, b) => b.length - a.length),
      random,
    ).sort((a, b) => b.length - a.length); // longest first overall; shuffle only breaks ties within a length

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
