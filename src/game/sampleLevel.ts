import type { Level } from './types';

/**
 * The hand-checked sample level from the handover doc. Every run of two or
 * more letters on this grid is one of the target words below — used as the
 * first playable level and the fixture for src/game's unit tests.
 *
 *      0 1 2 3 4 5
 *   0  . . H A D .
 *   1  . . E . . .
 *   2  H A N D E D
 *   3  E . . E . E
 *   4  A . . A . A
 *   5  D . . N . D
 */
export const SAMPLE_LEVEL: Level = {
  id: 'c01-l001',
  chapter: 1,
  index: 1,
  letters: ['D', 'N', 'H', 'D', 'A', 'E'],
  rows: 6,
  cols: 6,
  words: [
    { word: 'HAD', row: 0, col: 2, dir: 'across' },
    { word: 'HEN', row: 0, col: 2, dir: 'down' },
    { word: 'HANDED', row: 2, col: 0, dir: 'across' },
    { word: 'HEAD', row: 2, col: 0, dir: 'down' },
    { word: 'DEAN', row: 2, col: 3, dir: 'down' },
    { word: 'DEAD', row: 2, col: 5, dir: 'down' },
  ],
  bonusWords: ['HAND', 'AND', 'END', 'DEN', 'ADD', 'DAD'],
};
