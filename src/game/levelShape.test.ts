import { describe, expect, it } from 'vitest';
import { findLevelShapeErrors } from './levelShape';
import { SAMPLE_LEVEL } from './sampleLevel';
import type { Level } from './types';

describe('findLevelShapeErrors', () => {
  it('passes the hand-checked sample level with no errors', () => {
    expect(findLevelShapeErrors(SAMPLE_LEVEL)).toEqual([]);
  });

  it('catches an unintended run formed by two adjacent down words', () => {
    const broken: Level = {
      id: 'broken',
      chapter: 0,
      index: 0,
      letters: ['S', 'E', 'A', 'T'],
      rows: 3,
      cols: 4,
      words: [
        { word: 'SEAT', row: 0, col: 0, dir: 'across' },
        { word: 'SEA', row: 0, col: 0, dir: 'down' },
        // AT crosses at col 1, directly beside the SEA down word: creates a
        // stray "EA" (or similar) run in row 1 that isn't a target word.
        { word: 'EAT', row: 0, col: 1, dir: 'down' },
      ],
      bonusWords: [],
    };
    const errors = findLevelShapeErrors(broken);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('unintended run'))).toBe(true);
  });

  it('catches a target word that cannot be formed from the wheel', () => {
    const broken: Level = {
      id: 'broken-wheel',
      chapter: 0,
      index: 0,
      letters: ['C', 'A', 'T'],
      rows: 1,
      cols: 3,
      words: [{ word: 'DOG', row: 0, col: 0, dir: 'across' }],
      bonusWords: [],
    };
    const errors = findLevelShapeErrors(broken);
    expect(errors).toContain('Target word "DOG" cannot be formed from the wheel letters');
  });

  it('catches two crossing words that disagree on a shared cell', () => {
    const broken: Level = {
      id: 'broken-cross',
      chapter: 0,
      index: 0,
      letters: ['C', 'A', 'T', 'O', 'P'],
      rows: 3,
      cols: 3,
      words: [
        { word: 'CAT', row: 0, col: 0, dir: 'across' },
        { word: 'TOP', row: 0, col: 0, dir: 'down' }, // shares (0,0), C vs T
      ],
      bonusWords: [],
    };
    const errors = findLevelShapeErrors(broken);
    expect(errors.some((e) => e.includes('conflicting letters'))).toBe(true);
  });
});
