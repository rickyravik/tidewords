import { describe, expect, it } from 'vitest';
import { buildGrid } from './grid';
import { pickHintCell, revealWord } from './hints';
import { SAMPLE_LEVEL } from './sampleLevel';
import { allCells } from './grid';
import { cellKey } from './types';

describe('pickHintCell', () => {
  const grid = buildGrid(SAMPLE_LEVEL);

  it('never picks an already revealed cell', () => {
    const revealed = new Set(
      allCells(grid)
        .slice(0, -1)
        .map((c) => cellKey(c.row, c.col)),
    );
    const cell = pickHintCell(grid, revealed, () => 0);
    expect(cell).toBeDefined();
    expect(revealed.has(cellKey(cell!.row, cell!.col))).toBe(false);
  });

  it('returns undefined once every cell is revealed', () => {
    const revealed = new Set(allCells(grid).map((c) => cellKey(c.row, c.col)));
    expect(pickHintCell(grid, revealed)).toBeUndefined();
  });

  it('uses the injected random source to choose among candidates', () => {
    const revealed = new Set<string>();
    const candidates = allCells(grid);
    const last = pickHintCell(grid, revealed, () => 0.9999);
    expect(last).toEqual(candidates[candidates.length - 1]);
  });
});

describe('revealWord', () => {
  const grid = buildGrid(SAMPLE_LEVEL);

  it('reveals every cell of the full word through a cell', () => {
    // (2,5) is the crossing of HANDED (across) and DEAD (down); across wins.
    const keys = revealWord(grid, 2, 5);
    expect(keys).toEqual(['2,0', '2,1', '2,2', '2,3', '2,4', '2,5']);
  });

  it('returns an empty list for a cell outside the grid', () => {
    expect(revealWord(grid, 99, 99)).toEqual([]);
  });
});
