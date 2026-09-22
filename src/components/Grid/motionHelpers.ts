import { wordCells } from '../../game/grid';
import { cellKey, type CellKey, type PlacedWord } from '../../game/types';

/** The most recent word-submission result Grid needs to animate. Hint and
 * Reveal fills pass nothing here, since there is no word in the preview
 * pill for those to fly from. */
export interface GridResult {
  kind: 'found' | 'repeat';
  word: PlacedWord;
}

/** Cell keys covered by a word, in letter order — used to stagger the
 * per-letter fly-in / pulse animation the same way the word reads. */
export function wordCellKeys(word: PlacedWord): CellKey[] {
  return wordCells(word).map((pos) => cellKey(pos.row, pos.col));
}

/** Row-major index of a cell within an R x C grid, used to stagger the
 * level-complete tile-flip wave left to right, top to bottom. */
export function rowMajorIndex(row: number, col: number, cols: number): number {
  return row * cols + col;
}
