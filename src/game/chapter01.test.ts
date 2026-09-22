import { describe, expect, it } from 'vitest';
import chapter01 from '../../public/levels/chapter-01.json';
import { findLevelShapeErrors } from './levelShape';
import type { ChapterPack } from './types';

const pack = chapter01 as ChapterPack;

describe('chapter-01.json', () => {
  it('has 20 generated levels (scripts/generate-levels.ts)', () => {
    expect(pack.levels).toHaveLength(20);
  });

  it('never drops below the 5-letter wheel minimum, and stays within the "1 to 10"/"11 to 40" curve tiers', () => {
    for (const level of pack.levels) {
      expect(level.letters.length).toBeGreaterThanOrEqual(5);
      expect(level.letters.length).toBeLessThanOrEqual(6);
    }
  });

  it('never drops below the 5-target-word floor', () => {
    for (const level of pack.levels) {
      expect(level.words.length).toBeGreaterThanOrEqual(5);
    }
    expect(pack.levels[0]?.words).toHaveLength(5);
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

  it('draws every word from the generated corpus, not a hand-picked list (no repeated base words)', () => {
    // The longest word in each level is its base word (HANDOVER.md section 7
    // step 1); the level was built entirely from it, so no two levels should
    // share one.
    const baseWords = pack.levels.map(
      (level) => level.words.reduce((a, b) => (b.word.length > a.word.length ? b : a)).word,
    );
    expect(new Set(baseWords).size).toBe(baseWords.length);
  });

  it('uses unique, sequential level ids within the chapter', () => {
    const ids = pack.levels.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    pack.levels.forEach((level, i) => {
      expect(level.index).toBe(i + 1);
      expect(level.chapter).toBe(1);
    });
  });
});
