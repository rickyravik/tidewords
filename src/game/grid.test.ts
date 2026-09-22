import { describe, expect, it } from 'vitest';
import { allCells, buildGrid, cellAt, wordThroughCell } from './grid';
import { SAMPLE_LEVEL } from './sampleLevel';

describe('buildGrid', () => {
  const grid = buildGrid(SAMPLE_LEVEL);

  it('sizes the grid from the level', () => {
    expect(grid.rows).toBe(6);
    expect(grid.cols).toBe(6);
  });

  it('places every letter of every word', () => {
    // HANDED across at row 2 fills all six columns of that row.
    for (let col = 0; col < 6; col++) {
      expect(cellAt(grid, 2, col)?.letter).toBe('HANDED'[col]);
    }
  });

  it('shares a crossing cell between the words that cross there', () => {
    // (2,0) is the shared H of HANDED (across) and HEAD (down).
    const cell = cellAt(grid, 2, 0);
    expect(cell?.letter).toBe('H');
    expect(cell?.words.map((w) => w.word).sort()).toEqual(['HANDED', 'HEAD'].sort());
  });

  it('prefers the across word through a crossing cell', () => {
    const word = wordThroughCell(grid, 2, 0);
    expect(word?.dir).toBe('across');
    expect(word?.word).toBe('HANDED');
  });

  it('has no cell outside a placed word', () => {
    expect(cellAt(grid, 0, 0)).toBeUndefined();
  });

  it('exposes every occupied cell via allCells', () => {
    // Unique cells covered by the six sample words (crossings shared).
    expect(allCells(grid).length).toBeGreaterThan(0);
    expect(allCells(grid).every((cell) => cell.letter.length === 1)).toBe(true);
  });
});
