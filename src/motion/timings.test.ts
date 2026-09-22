import { describe, expect, it } from 'vitest';
import {
  CORRECT_WORD_STAGGER_MS,
  LEVEL_COMPLETE_FLIP_MS,
  LEVEL_COMPLETE_SUMMARY_MS,
  LEVEL_COMPLETE_TOTAL_MS,
  correctWordFlyDelay,
  levelCompleteFlipDelay,
} from './timings';

describe('correctWordFlyDelay', () => {
  it('has no delay for the first letter', () => {
    expect(correctWordFlyDelay(0)).toBe(0);
  });

  it('staggers each following letter by 40ms, in seconds', () => {
    expect(correctWordFlyDelay(1)).toBeCloseTo(CORRECT_WORD_STAGGER_MS / 1000);
    expect(correctWordFlyDelay(3)).toBeCloseTo((3 * CORRECT_WORD_STAGGER_MS) / 1000);
  });
});

describe('levelCompleteFlipDelay', () => {
  it('has no delay for the first tile', () => {
    expect(levelCompleteFlipDelay(0)).toBe(0);
  });

  it('increases with row-major index', () => {
    expect(levelCompleteFlipDelay(5)).toBeGreaterThan(levelCompleteFlipDelay(1));
  });
});

describe('level complete timing budget', () => {
  it('splits the 900ms total between the flip wave and the summary slide-up', () => {
    expect(LEVEL_COMPLETE_FLIP_MS + LEVEL_COMPLETE_SUMMARY_MS).toBe(LEVEL_COMPLETE_TOTAL_MS);
  });
});
