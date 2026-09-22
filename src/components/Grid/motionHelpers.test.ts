import { describe, expect, it } from 'vitest';
import type { PlacedWord } from '../../game/types';
import { rowMajorIndex, wordCellKeys } from './motionHelpers';

describe('wordCellKeys', () => {
  it('lists an across word’s cells left to right', () => {
    const word: PlacedWord = { word: 'HAD', row: 0, col: 2, dir: 'across' };
    expect(wordCellKeys(word)).toEqual(['0,2', '0,3', '0,4']);
  });

  it('lists a down word’s cells top to bottom', () => {
    const word: PlacedWord = { word: 'HEN', row: 0, col: 2, dir: 'down' };
    expect(wordCellKeys(word)).toEqual(['0,2', '1,2', '2,2']);
  });
});

describe('rowMajorIndex', () => {
  it('indexes the first cell as 0', () => {
    expect(rowMajorIndex(0, 0, 6)).toBe(0);
  });

  it('wraps to the next row after the last column', () => {
    expect(rowMajorIndex(1, 0, 6)).toBe(6);
  });

  it('increases left to right within a row', () => {
    expect(rowMajorIndex(2, 3, 6)).toBe(15);
  });
});
