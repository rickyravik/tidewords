import { describe, expect, it } from 'vitest';
import { isLevelComplete } from './completion';
import { buildGrid } from './grid';
import { SAMPLE_LEVEL } from './sampleLevel';

describe('isLevelComplete', () => {
  const grid = buildGrid(SAMPLE_LEVEL);
  const allWords = SAMPLE_LEVEL.words.map((w) => w.word);

  it('is false with nothing found or revealed', () => {
    expect(isLevelComplete(grid, new Set(), new Set())).toBe(false);
  });

  it('is false when some words remain unfound and uncovered', () => {
    const found = new Set(['HANDED']); // leaves HAD, HEN uncovered
    expect(isLevelComplete(grid, found, new Set())).toBe(false);
  });

  it('is true once every target word has been found', () => {
    expect(isLevelComplete(grid, new Set(allWords), new Set())).toBe(true);
  });

  it('counts a cell revealed by a hint towards completion even if its word was never found', () => {
    // HANDED, HEAD, DEAN, DEAD cover everything except HAD's (0,2)-(0,4) and
    // HEN's (1,2) (HEN's (0,2) and (2,2) are already covered by HAD/HANDED).
    // Revealing those directly should still complete the level.
    const found = new Set(['HANDED', 'HEAD', 'DEAN', 'DEAD']);
    const revealed = new Set(['0,2', '0,3', '0,4', '1,2']);
    expect(isLevelComplete(grid, found, revealed)).toBe(true);
  });
});
