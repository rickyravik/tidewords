import { describe, expect, it } from 'vitest';
import { findLevelShapeErrors } from '../../src/game/levelShape';
import type { Level, PlacedWord } from '../../src/game/types';
import {
  isFullyConnected,
  layoutWords,
  mulberry32,
  pickTargets,
  shuffle,
  subwordsFor,
} from './generator';

describe('mulberry32', () => {
  it('is deterministic for a given seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect(a()).toBe(b());
    expect(a()).toBe(b());
  });

  it('produces values in [0, 1)', () => {
    const random = mulberry32(1);
    for (let i = 0; i < 50; i++) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('shuffle', () => {
  it('keeps every element, just reorders them', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffle(input, mulberry32(7));
    expect(result).toHaveLength(input.length);
    expect([...result].sort()).toEqual(input);
  });

  it('does not mutate the input array', () => {
    const input = [1, 2, 3];
    shuffle(input, mulberry32(7));
    expect(input).toEqual([1, 2, 3]);
  });
});

describe('subwordsFor', () => {
  it('finds every 3+ letter word formable from the base word, excluding the base word itself', () => {
    const corpus = ['HANDED', 'HAND', 'HEAD', 'HEN', 'HAD', 'AND', 'DEN', 'CATS'];
    expect(subwordsFor('HANDED', corpus).sort()).toEqual(
      ['AND', 'DEN', 'HAD', 'HAND', 'HEAD', 'HEN'].sort(),
    );
  });
});

describe('pickTargets', () => {
  it('prefers curated roots over derived inflections, then shorter words', () => {
    const result = pickTargets(
      'HANDED',
      ['HEADS', 'HAND', 'HEN', 'HAD'],
      3,
      new Set(['HAND', 'HEN', 'HAD']), // HEADS is the only derived (non-root) word here
      mulberry32(1),
    );
    expect(result).not.toBeNull();
    expect(result?.targets[0]).toBe('HANDED');
    // The 2 shortest roots (HEN, HAD) are picked before the longer root (HAND)
    // or the derived word (HEADS).
    expect(result?.targets.slice(1).sort()).toEqual(['HAD', 'HEN']);
    expect(result?.bonusWords.sort()).toEqual(['HAND', 'HEADS']);
  });

  it('returns null when there are not enough sub-words for the target count', () => {
    const result = pickTargets('CAT', ['AT'], 4, new Set(), mulberry32(1));
    expect(result).toBeNull();
  });
});

describe('isFullyConnected', () => {
  function word(w: string, row: number, col: number, dir: 'across' | 'down'): PlacedWord {
    return { word: w, row, col, dir };
  }

  it('is true for a single word', () => {
    expect(isFullyConnected([word('CAT', 0, 0, 'across')])).toBe(true);
  });

  it('is true when every word shares a cell with the group', () => {
    const words = [
      word('HANDED', 0, 0, 'across'),
      word('HEAD', 0, 0, 'down'),
      word('DEAN', 0, 3, 'down'),
    ];
    expect(isFullyConnected(words)).toBe(true);
  });

  it('is false when a word does not touch any other placed word', () => {
    const words = [word('CAT', 0, 0, 'across'), word('DOG', 5, 5, 'across')];
    expect(isFullyConnected(words)).toBe(false);
  });
});

describe('layoutWords', () => {
  it('places the base word across (it is built at the origin, then the whole layout is normalised)', () => {
    const layout = layoutWords('HANDED', ['HEAD', 'HEN', 'HAD', 'DEAN', 'DEAD'], mulberry32(3));
    expect(layout).not.toBeNull();
    const base = layout?.words.find((w) => w.word === 'HANDED');
    expect(base?.dir).toBe('across');
  });

  it('places every requested word, fully connected, within an 8x8 box', () => {
    const others = ['HEAD', 'HEN', 'HAD', 'DEAN', 'DEAD'];
    const layout = layoutWords('HANDED', others, mulberry32(3));
    expect(layout).not.toBeNull();
    expect(layout?.words).toHaveLength(others.length + 1);
    expect(layout?.rows).toBeLessThanOrEqual(8);
    expect(layout?.cols).toBeLessThanOrEqual(8);
    expect(isFullyConnected(layout?.words ?? [])).toBe(true);
  });

  it('normalises coordinates so the grid starts at (0, 0)', () => {
    const layout = layoutWords('HANDED', ['HEAD', 'HEN', 'HAD', 'DEAN', 'DEAD'], mulberry32(9));
    expect(layout).not.toBeNull();
    const rows = layout!.words.map((w) => w.row);
    const cols = layout!.words.map((w) => w.col);
    expect(Math.min(...rows)).toBe(0);
    expect(Math.min(...cols)).toBe(0);
  });

  it('produces a layout that passes findLevelShapeErrors end to end', () => {
    const baseWord = 'HANDED';
    const others = ['HEAD', 'HEN', 'HAD', 'DEAN', 'DEAD'];
    const layout = layoutWords(baseWord, others, mulberry32(11));
    expect(layout).not.toBeNull();

    const level: Level = {
      id: 'test-level',
      chapter: 0,
      index: 0,
      letters: baseWord.split(''),
      rows: layout!.rows,
      cols: layout!.cols,
      words: layout!.words,
      bonusWords: [],
    };
    expect(findLevelShapeErrors(level)).toEqual([]);
  });

  it('returns null when a word simply cannot cross the others (impossible layout)', () => {
    const layout = layoutWords('CAT', ['DOG'], mulberry32(1));
    expect(layout).toBeNull();
  });
});
