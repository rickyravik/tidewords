import { describe, expect, it } from 'vitest';
import { isFirstPlay, pickGuideWord, wheelPathFor } from './firstSwipe';
import { handKeyframes } from './handMotion';

const FRESH = { completedLevelIds: [], levelProgress: {}, bonusWordsFound: [] };

describe('isFirstPlay', () => {
  it('is true for a brand new profile', () => {
    expect(isFirstPlay(FRESH)).toBe(true);
  });

  it('is false once any level is completed, in progress, or a bonus word was found', () => {
    expect(isFirstPlay({ ...FRESH, completedLevelIds: ['c01-l001'] })).toBe(false);
    expect(
      isFirstPlay({
        ...FRESH,
        levelProgress: { 'c01-l001': { foundWords: ['EAR'], revealedCells: [] } },
      }),
    ).toBe(false);
    expect(isFirstPlay({ ...FRESH, bonusWordsFound: ['ARE'] })).toBe(false);
  });
});

describe('wheelPathFor', () => {
  it('follows the live, shuffled wheel order', () => {
    expect(wheelPathFor('EAR', ['S', 'E', 'D', 'A', 'R'])).toEqual([1, 3, 4]);
    expect(wheelPathFor('EAR', ['R', 'A', 'S', 'E', 'D'])).toEqual([3, 1, 0]);
  });

  it('uses each wheel position once for repeated letters', () => {
    expect(wheelPathFor('ADD', ['D', 'A', 'D'])).toEqual([1, 0, 2]);
  });

  it('returns null when the wheel cannot spell the word', () => {
    expect(wheelPathFor('ADD', ['D', 'A', 'E'])).toBeNull();
  });
});

describe('pickGuideWord', () => {
  it('picks the shortest spellable target word, earliest on a tie', () => {
    const words = ['READS', 'EAR', 'SAD', 'RED', 'SEA'];
    expect(pickGuideWord(words, ['S', 'E', 'D', 'A', 'R'])).toBe('EAR');
  });

  it('skips words the wheel cannot spell', () => {
    expect(pickGuideWord(['ZOO', 'READS'], ['S', 'E', 'D', 'A', 'R'])).toBe('READS');
    expect(pickGuideWord([], ['S'])).toBeNull();
  });
});

describe('handKeyframes', () => {
  const points = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
  ];

  it('starts and ends invisible, visiting every point in order', () => {
    const kf = handKeyframes(points, false)!;
    expect(kf.opacity[0]).toBe(0);
    expect(kf.opacity.at(-1)).toBe(0);
    expect(kf.x[0]).toBe(0);
    expect(kf.x.at(-1)).toBe(10);
    expect(kf.y.at(-1)).toBe(10);
    // Every array lines up with `times`, which run 0..1 without going back.
    for (const arr of [kf.x, kf.y, kf.opacity, kf.scale]) {
      expect(arr).toHaveLength(kf.times.length);
    }
    expect(kf.times[0]).toBe(0);
    expect(kf.times.at(-1)).toBe(1);
    kf.times.slice(1).forEach((t, i) => expect(t).toBeGreaterThanOrEqual(kf.times[i]!));
  });

  it('presses once per letter in tap mode', () => {
    const kf = handKeyframes(points, true)!;
    const presses = kf.scale.filter((s, i) => s < 1 && (kf.scale[i - 1] ?? 1) === 1);
    expect(presses).toHaveLength(points.length);
  });

  it('returns null with no points', () => {
    expect(handKeyframes([], false)).toBeNull();
  });
});
