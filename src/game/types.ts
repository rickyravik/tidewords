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

/** A single cell key, "row,col", used to address grid cells without allocating objects. */
export type CellKey = string;

export function cellKey(row: number, col: number): CellKey {
  return `${row},${col}`;
}

export interface GridCell {
  row: number;
  col: number;
  letter: string;
  /** Words passing through this cell; across before down when it is a crossing. */
  words: PlacedWord[];
}

export interface Grid {
  rows: number;
  cols: number;
  cellsByKey: Map<CellKey, GridCell>;
}
