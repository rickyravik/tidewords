import { allCells } from './grid';
import { cellKey, type CellKey, type Grid, type GridCell } from './types';

/**
 * A cell is filled once it is covered by a found word, or was revealed
 * directly by a Hint or Reveal helper.
 */
export function isCellFilled(
  cell: GridCell,
  foundWords: ReadonlySet<string>,
  revealedCells: ReadonlySet<CellKey>,
): boolean {
  if (revealedCells.has(cellKey(cell.row, cell.col))) {
    return true;
  }
  return cell.words.some((word) => foundWords.has(word.word));
}

/** The level is complete once every grid cell is filled. */
export function isLevelComplete(
  grid: Grid,
  foundWords: ReadonlySet<string>,
  revealedCells: ReadonlySet<CellKey>,
): boolean {
  return allCells(grid).every((cell) => isCellFilled(cell, foundWords, revealedCells));
}
