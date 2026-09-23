import { describe, expect, it } from 'vitest';
import shippedDictionary from '../../public/dictionary.json';
import { parseDictionary, type DictionaryFile } from './dictionary';
import {
  endlessChapterFor,
  endlessLevelId,
  endlessLevelNumber,
  generateEndlessLevel,
} from './endless';
import { findLevelShapeErrors } from './levelShape';
import type { Level } from './types';

const corpus = parseDictionary(shippedDictionary as DictionaryFile);

function baseWordOf(level: Level): string {
  return level.words.reduce((a, b) => (b.word.length > a.word.length ? b : a)).word;
}

describe('endless level ids and chapters', () => {
  it('round-trips ids', () => {
    expect(endlessLevelId(101)).toBe('endless-101');
    expect(endlessLevelNumber('endless-101')).toBe(101);
    expect(endlessLevelNumber('endless-100')).toBeNull();
    expect(endlessLevelNumber('c01-l001')).toBeNull();
  });

  it('continues chapter numbering in blocks of 20 and cycles the five themes', () => {
    expect(endlessChapterFor(101)).toMatchObject({ chapter: 6, index: 1, theme: 'harbour' });
    expect(endlessChapterFor(120)).toMatchObject({ chapter: 6, index: 20 });
    expect(endlessChapterFor(121)).toMatchObject({ chapter: 7, index: 1, theme: 'kelp' });
    expect(endlessChapterFor(201)).toMatchObject({ chapter: 11, index: 1, theme: 'harbour' });
  });
});

describe('generateEndlessLevel', () => {
  it('rejects level numbers inside the shipped 100', () => {
    expect(() => generateEndlessLevel(100, corpus)).toThrow(RangeError);
    expect(() => generateEndlessLevel(101.5, corpus)).toThrow(RangeError);
  });

  it('is deterministic: the same number gives the same level, even from a freshly parsed corpus', () => {
    const again = parseDictionary(shippedDictionary as DictionaryFile);
    expect(generateEndlessLevel(137, corpus)).toEqual(generateEndlessLevel(137, again));
  });

  const sample = [101, 102, 103, 150, 151, 152, 250, 351, 500, 1000];
  it.each(sample)('level %i is fair and follows the 101+ tier', (n) => {
    const level = generateEndlessLevel(n, corpus);
    expect(findLevelShapeErrors(level)).toEqual([]);
    expect(level.id).toBe(`endless-${n}`);
    expect(level.letters.length).toBeGreaterThanOrEqual(6);
    expect(level.letters.length).toBeLessThanOrEqual(7);
    expect(level.words.length).toBeGreaterThanOrEqual(7);
    expect(level.words.length).toBeLessThanOrEqual(11);
    expect(level.rows).toBeLessThanOrEqual(8);
    expect(level.cols).toBeLessThanOrEqual(8);
    expect(corpus.reservedBaseWords.has(baseWordOf(level))).toBe(false);
    for (const word of [...level.words.map((w) => w.word), ...level.bonusWords]) {
      expect(corpus.words.has(word)).toBe(true);
    }
  });

  it('does not repeat a base word across a run of nearby levels', () => {
    const bases = Array.from({ length: 40 }, (_, i) => baseWordOf(generateEndlessLevel(140 + i, corpus)));
    expect(new Set(bases).size).toBe(bases.length);
  });
});
