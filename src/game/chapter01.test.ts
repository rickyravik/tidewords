import { describe, expect, it } from 'vitest';
import chapter01 from '../../public/levels/chapter-01.json';
import { findLevelShapeErrors } from './levelShape';
import type { ChapterPack } from './types';

const pack = chapter01 as ChapterPack;

describe('chapter-01.json', () => {
  it('has 10 hand-written levels', () => {
    expect(pack.levels).toHaveLength(10);
  });

  it('never drops below the 5-letter wheel minimum, and grows up to 7 letters', () => {
    for (const level of pack.levels) {
      expect(level.letters.length).toBeGreaterThanOrEqual(5);
      expect(level.letters.length).toBeLessThanOrEqual(7);
    }
    expect(pack.levels[0]?.letters).toHaveLength(5);
    expect(pack.levels.at(-1)?.letters).toHaveLength(7);
  });

  it('includes the hand-checked HANDED sample level somewhere in the chapter', () => {
    const sample = pack.levels.find((l) => l.words.some((w) => w.word === 'HANDED'));
    expect(sample?.letters).toHaveLength(6);
    expect(sample?.words).toHaveLength(6);
  });

  it('letter and word counts never decrease from one level to the next', () => {
    for (let i = 1; i < pack.levels.length; i++) {
      const prev = pack.levels[i - 1]!;
      const curr = pack.levels[i]!;
      expect(curr.letters.length).toBeGreaterThanOrEqual(prev.letters.length);
      expect(curr.words.length).toBeGreaterThanOrEqual(prev.words.length);
    }
  });

  it.each(pack.levels.map((level) => [level.id, level] as const))(
    'level %s has no shape errors',
    (_id, level) => {
      expect(findLevelShapeErrors(level)).toEqual([]);
    },
  );

  it('uses unique, sequential level ids within the chapter', () => {
    const ids = pack.levels.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    pack.levels.forEach((level, i) => {
      expect(level.index).toBe(i + 1);
      expect(level.chapter).toBe(1);
    });
  });
});
