import { allCells, wordCells, wordThroughCell } from './grid';
import { cellKey, type CellKey, type Grid, type GridCell } from './types';

/**
 * Picks a random unrevealed cell for the Hint helper. `random` is injectable
 * so tests can make the choice deterministic.
 */
export function pickHintCell(
  grid: Grid,
  revealedCells: ReadonlySet<CellKey>,
  random: () => number = Math.random,
): GridCell | undefined {
  const candidates = allCells(grid).filter(
    (cell) => !revealedCells.has(cellKey(cell.row, cell.col)),
  );
  if (candidates.length === 0) {
    return undefined;
  }
  const index = Math.floor(random() * candidates.length);
  return candidates[index];
}

/** The full set of cell keys for the word through (row, col), across first on a crossing. */
export function revealWord(grid: Grid, row: number, col: number): CellKey[] {
  const word = wordThroughCell(grid, row, col);
  if (!word) {
    return [];
  }
  return wordCells(word).map((pos) => cellKey(pos.row, pos.col));
}
