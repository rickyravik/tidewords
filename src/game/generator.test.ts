import { describe, expect, it } from 'vitest';
import { corpusFromLists } from './dictionary';
import {
  buildLevel,
  difficultyFor,
  isFullyConnected,
  isPluralForm,
  layoutWords,
  letterSet,
  mulberry32,
  pickTargets,
  shuffle,
  subwordsFor,
} from './generator';
import { findLevelShapeErrors } from './levelShape';
import type { Level, PlacedWord } from './types';

const HANDED_CORPUS = corpusFromLists(
  ['HAND', 'HEAD', 'HEN', 'HAD', 'AND', 'DEN', 'DEAD', 'DEAN', 'HANDED'],
  ['DAH', 'CATS', 'HEADS'],
  [],
);

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

describe('difficultyFor', () => {
  it('never drops below 5 letters or 5 words, and never decreases', () => {
    let previous = difficultyFor(1);
    for (let n = 1; n <= 1000; n++) {
      const current = difficultyFor(n);
      expect(current.letterCount).toBeGreaterThanOrEqual(5);
      expect(current.wordCount).toBeGreaterThanOrEqual(5);
      expect(current.letterCount).toBeGreaterThanOrEqual(previous.letterCount);
      expect(current.wordCount).toBeGreaterThanOrEqual(previous.wordCount);
      previous = current;
    }
  });

  it('uses the 101+ tier (6-7 letters, 7-11 words) for endless levels', () => {
    for (const n of [101, 150, 151, 300, 1000]) {
      const { letterCount, wordCount } = difficultyFor(n);
      expect(letterCount).toBeGreaterThanOrEqual(6);
      expect(letterCount).toBeLessThanOrEqual(7);
      expect(wordCount).toBeGreaterThanOrEqual(7);
      expect(wordCount).toBeLessThanOrEqual(11);
    }
  });
});

describe('letterSet and isPluralForm', () => {
  it('gives anagrams the same letter set', () => {
    expect(letterSet('LISTEN')).toBe(letterSet('SILENT'));
  });

  it('spots plurals whose stem is also a word', () => {
    const words = new Set(['HORSE', 'HORSES', 'BOX', 'BOXES', 'ALIAS']);
    expect(isPluralForm('HORSES', words)).toBe(true);
    expect(isPluralForm('BOXES', words)).toBe(true);
    expect(isPluralForm('ALIAS', words)).toBe(false);
    expect(isPluralForm('HORSE', words)).toBe(false);
  });
});

describe('subwordsFor', () => {
  it('finds every 3+ letter corpus word formable from the base word, excluding the base word itself', () => {
    expect(subwordsFor('HANDED', HANDED_CORPUS).sort()).toEqual(
      ['AND', 'DAH', 'DEAD', 'DEAN', 'DEN', 'HAD', 'HAND', 'HEAD', 'HEN'].sort(),
    );
  });

  it('respects letter counts (one E means no word needing two)', () => {
    const corpus = corpusFromLists(['HEED', 'HAND'], [], []);
    expect(subwordsFor('HANDED', corpus)).toEqual(['HAND']);
  });
});

describe('pickTargets', () => {
  const rankOf = new Map(['HAND', 'HEAD', 'HEN', 'HAD', 'DEAN', 'DEAD'].map((w, i) => [w, i]));

  it('picks the base word plus target-tier words only; everything else formable becomes a bonus word', () => {
    const subwords = ['HAND', 'HEAD', 'HEN', 'HAD', 'DAH', 'HEADS'];
    const result = pickTargets('HANDED', subwords, 4, rankOf, mulberry32(1));
    expect(result?.targets[0]).toBe('HANDED');
    expect(result?.targets).toHaveLength(4);
    expect(result?.targets).not.toContain('DAH'); // bonus tier, never a target
    expect(result?.bonusWords).toContain('DAH');
    const all = new Set([...(result?.targets ?? []), ...(result?.bonusWords ?? [])]);
    expect(all).toEqual(new Set(['HANDED', ...subwords]));
  });

  it('prefers 4+ letter words over equally common 3-letter ones', () => {
    const result = pickTargets('HANDED', ['HEN', 'HAD', 'HAND', 'HEAD'], 3, rankOf, mulberry32(1), {
      jitter: 0,
    });
    expect(result?.targets.slice(1).sort()).toEqual(['HAND', 'HEAD']);
  });

  it('applies the usage penalty, and never picks a banned word', () => {
    const banned = (word: string) => (word === 'HAND' || word === 'HEAD' ? Infinity : 0);
    const result = pickTargets('HANDED', ['HEN', 'HAD', 'HAND', 'HEAD'], 3, rankOf, mulberry32(1), {
      usagePenalty: banned,
    });
    expect(result?.targets.slice(1).sort()).toEqual(['HAD', 'HEN']);
    expect(result?.bonusWords).toEqual(['HAND', 'HEAD']);
  });

  it('never picks a word together with its -S form', () => {
    const ranks = new Map([
      ['SEAL', 0],
      ['SEALS', 1],
      ['LESS', 2],
    ]);
    const result = pickTargets('SEALSS', ['SEAL', 'SEALS', 'LESS'], 3, ranks, mulberry32(1), { jitter: 0 });
    expect(result?.targets).toContain('LESS');
    expect(result?.targets.filter((w) => w === 'SEAL' || w === 'SEALS')).toHaveLength(1);
  });

  it('returns null when there are not enough target-tier sub-words', () => {
    expect(pickTargets('CAT', ['ACT'], 4, new Map([['ACT', 0]]), mulberry32(1))).toBeNull();
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
    const words = [word('HANDED', 0, 0, 'across'), word('HEAD', 0, 0, 'down'), word('DEAN', 0, 3, 'down')];
    expect(isFullyConnected(words)).toBe(true);
  });

  it('is false when a word does not touch any other placed word', () => {
    expect(isFullyConnected([word('CAT', 0, 0, 'across'), word('DOG', 5, 5, 'across')])).toBe(false);
  });
});

describe('layoutWords', () => {
  const others = ['HEAD', 'HEN', 'HAD', 'DEAN', 'DEAD'];

  it('places the base word across', () => {
    const layout = layoutWords('HANDED', others, mulberry32(3));
    expect(layout?.words.find((w) => w.word === 'HANDED')?.dir).toBe('across');
  });

  it('places every requested word, fully connected, within an 8x8 box, starting at (0, 0)', () => {
    const layout = layoutWords('HANDED', others, mulberry32(3));
    expect(layout).not.toBeNull();
    expect(layout!.words).toHaveLength(others.length + 1);
    expect(layout!.rows).toBeLessThanOrEqual(8);
    expect(layout!.cols).toBeLessThanOrEqual(8);
    expect(isFullyConnected(layout!.words)).toBe(true);
    expect(Math.min(...layout!.words.map((w) => w.row))).toBe(0);
    expect(Math.min(...layout!.words.map((w) => w.col))).toBe(0);
  });

  it('produces a layout that passes findLevelShapeErrors end to end', () => {
    const layout = layoutWords('HANDED', others, mulberry32(11));
    const level: Level = {
      id: 'test-level',
      chapter: 0,
      index: 0,
      letters: 'HANDED'.split(''),
      rows: layout!.rows,
      cols: layout!.cols,
      words: layout!.words,
      bonusWords: [],
    };
    expect(findLevelShapeErrors(level)).toEqual([]);
  });

  it('returns null when a word simply cannot cross the others', () => {
    expect(layoutWords('CAT', ['DOG'], mulberry32(1))).toBeNull();
  });
});

describe('buildLevel', () => {
  it('builds a fair level with a shuffled wheel, or null when there are too few words', () => {
    const args = { id: 't', chapter: 1, index: 1, baseWord: 'HANDED', corpus: HANDED_CORPUS };
    const level = buildLevel({ ...args, wordCount: 5, random: mulberry32(5) });
    expect(level).not.toBeNull();
    expect(findLevelShapeErrors(level!)).toEqual([]);
    expect(level!.words).toHaveLength(5);
    expect([...level!.letters].sort()).toEqual('HANDED'.split('').sort());
    expect(level!.letters.join('')).not.toBe('HANDED');
    expect(buildLevel({ ...args, wordCount: 12, random: mulberry32(5) })).toBeNull();
  });

  it('is reproducible for a given seed', () => {
    const args = { id: 't', chapter: 1, index: 1, baseWord: 'HANDED', wordCount: 5, corpus: HANDED_CORPUS };
    expect(buildLevel({ ...args, random: mulberry32(9) })).toEqual(buildLevel({ ...args, random: mulberry32(9) }));
  });
});
