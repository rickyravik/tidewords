import {
  cellKey,
  type CellKey,
  type Grid,
  type GridCell,
  type Level,
  type PlacedWord,
} from './types';

export function wordCells(word: PlacedWord): Array<{ row: number; col: number }> {
  return Array.from({ length: word.word.length }, (_, i) => ({
    row: word.dir === 'down' ? word.row + i : word.row,
    col: word.dir === 'across' ? word.col + i : word.col,
  }));
}

/** Builds the grid's cells from a level's placed words. Crossing cells are shared. */
export function buildGrid(level: Level): Grid {
  const cellsByKey = new Map<CellKey, GridCell>();

  for (const word of level.words) {
    wordCells(word).forEach((pos, i) => {
      const key = cellKey(pos.row, pos.col);
      const letter = word.word[i] ?? '';
      const existing = cellsByKey.get(key);
      if (existing) {
        existing.words.push(word);
        // Across first, so helpers like "reveal" prefer across on a crossing.
        existing.words.sort((a) => (a.dir === 'across' ? -1 : 1));
      } else {
        cellsByKey.set(key, { row: pos.row, col: pos.col, letter, words: [word] });
      }
    });
  }

  return { rows: level.rows, cols: level.cols, cellsByKey };
}

export function cellAt(grid: Grid, row: number, col: number): GridCell | undefined {
  return grid.cellsByKey.get(cellKey(row, col));
}

/** The word passing through a cell; across first when the cell is a crossing. */
export function wordThroughCell(grid: Grid, row: number, col: number): PlacedWord | undefined {
  return cellAt(grid, row, col)?.words[0];
}

export function allCells(grid: Grid): GridCell[] {
  return Array.from(grid.cellsByKey.values());
}
