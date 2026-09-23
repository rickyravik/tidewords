import {
  buildLevel,
  difficultyFor,
  isPluralForm,
  letterSet,
  mixSeed,
  mulberry32,
  shuffle,
  type WordCorpus,
} from './generator';
import type { Level, ThemeId } from './types';

/**
 * Endless levels: level 101 onwards, generated on the device from the
 * shipped dictionary, so there is always another level after the last
 * chapter pack.
 *
 * Determinism: level N depends only on N and the corpus (public/
 * dictionary.json), never on the player or on earlier levels, so every
 * player gets the same level N and a level can be regenerated at any time
 * (e.g. after a reload) without replaying 101..N-1. Regenerating
 * dictionary.json changes endless content, so ship dictionary changes
 * deliberately.
 *
 * Repeat avoidance, without cross-level state:
 * - Base words come from the target tier (everyday words) of the wheel's
 *   length, minus the 100 shipped base words and their anagrams, minus
 *   plurals of other words, with one word per anagram letter set.
 * - That pool is put in a seeded order, and level N owns the block of
 *   CANDIDATES_PER_LEVEL consecutive entries at slot (N - 101). Consecutive
 *   levels own disjoint blocks, so a base word (or wheel) cannot repeat
 *   until the pool has been walked through — roughly pool size / 4 levels
 *   (several hundred). Each pass uses a fresh order.
 * - Limits: target words are chosen per level, so a common short word such
 *   as TEA can still turn up in nearby levels (the offline cap used for the
 *   shipped levels needs every earlier level in memory). The rare level
 *   whose whole block fails falls back to hashed picks from anywhere in the
 *   pool, which may repeat a base word from another level.
 */

export const FIRST_ENDLESS_LEVEL = 101;
export const ENDLESS_LEVELS_PER_CHAPTER = 20;
const CANDIDATES_PER_LEVEL = 4;
const FALLBACK_CANDIDATES = 40;
const MIN_ENDLESS_WORD_COUNT = 7;
/** Fewer shuffled layout orderings than the offline generator's 200: plenty for these word counts, and a lot faster on a phone. */
const LAYOUT_ATTEMPTS = 60;
const ENDLESS_SEED = 0x7e1d;

const ENDLESS_THEMES: readonly ThemeId[] = ['harbour', 'kelp', 'reef', 'fjord', 'aurora'];

/** Level id for global level `n` (101+), e.g. "endless-101". Distinct from chapter pack ids so a future chapter-06 pack can never collide with saved endless progress. */
export function endlessLevelId(n: number): string {
  return `endless-${n}`;
}

/** Parses an id from `endlessLevelId` back to its global level number, or null for any other id. */
export function endlessLevelNumber(id: string): number | null {
  const match = /^endless-(\d+)$/.exec(id);
  if (!match) return null;
  const n = Number(match[1]);
  return n >= FIRST_ENDLESS_LEVEL ? n : null;
}

/**
 * Suggested presentation for endless levels: they continue the chapter
 * numbering in blocks of 20 (level 101 is chapter 6, index 1) and cycle
 * through the five existing chapter themes.
 */
export function endlessChapterFor(n: number): { chapter: number; index: number; title: string; theme: ThemeId } {
  const offset = n - FIRST_ENDLESS_LEVEL;
  const chapter = 6 + Math.floor(offset / ENDLESS_LEVELS_PER_CHAPTER);
  const theme = ENDLESS_THEMES[(chapter - 6) % ENDLESS_THEMES.length] as ThemeId;
  return { chapter, index: (offset % ENDLESS_LEVELS_PER_CHAPTER) + 1, title: 'Open Water', theme };
}

const poolCache = new WeakMap<WordCorpus, Map<number, string[]>>();

function basePool(corpus: WordCorpus, letterCount: number): string[] {
  let byLength = poolCache.get(corpus);
  if (!byLength) {
    byLength = new Map();
    poolCache.set(corpus, byLength);
  }
  let pool = byLength.get(letterCount);
  if (!pool) {
    const reservedWheels = new Set([...corpus.reservedBaseWords].map(letterSet));
    const seenWheels = new Set<string>();
    pool = [];
    for (const word of corpus.targets) {
      if (word.length !== letterCount || isPluralForm(word, corpus.words)) continue;
      const wheel = letterSet(word);
      if (reservedWheels.has(wheel) || seenWheels.has(wheel)) continue;
      seenWheels.add(wheel);
      pool.push(word);
    }
    byLength.set(letterCount, pool);
  }
  return pool;
}

/** The base words level `n` will try, in order: its own block of the seeded pool order. */
function blockCandidates(pool: readonly string[], n: number, letterCount: number): string[] {
  const start = (n - FIRST_ENDLESS_LEVEL) * CANDIDATES_PER_LEVEL;
  const pass = Math.floor(start / pool.length);
  const order = shuffle(pool, mulberry32(mixSeed(ENDLESS_SEED, letterCount, pass)));
  return Array.from(
    { length: Math.min(CANDIDATES_PER_LEVEL, pool.length) },
    (_, i) => order[(start + i) % order.length] as string,
  );
}

/**
 * Deterministically generates global level `n` (101 or more) from `corpus`
 * (the parsed public/dictionary.json — see `loadDictionary`). Follows the
 * difficulty curve's "101+" tier (6-7 letter wheels, 8-10 words, <= 8x8
 * grid); every level returned passes `findLevelShapeErrors`.
 *
 * Throws a RangeError for n < 101 or a non-integer, and an Error only if the
 * corpus is far too small to build any level (never for the shipped one).
 */
export function generateEndlessLevel(n: number, corpus: WordCorpus): Level {
  if (!Number.isInteger(n) || n < FIRST_ENDLESS_LEVEL) {
    throw new RangeError(`Endless levels start at ${FIRST_ENDLESS_LEVEL}, got ${n}`);
  }
  const { letterCount, wordCount } = difficultyFor(n);
  const { chapter, index } = endlessChapterFor(n);
  const pool = basePool(corpus, letterCount);
  if (pool.length === 0) throw new Error(`No ${letterCount}-letter base words in the corpus`);

  const attempt = (baseWord: string, words: number, salt: number) =>
    buildLevel({
      id: endlessLevelId(n),
      chapter,
      index,
      baseWord,
      wordCount: words,
      corpus,
      random: mulberry32(mixSeed(ENDLESS_SEED, n, salt)),
      layoutAttempts: LAYOUT_ATTEMPTS,
      selectionAttempts: 2,
    });

  const candidates = blockCandidates(pool, n, letterCount);
  for (let words = wordCount; words >= MIN_ENDLESS_WORD_COUNT; words--) {
    for (const [i, baseWord] of candidates.entries()) {
      const level = attempt(baseWord, words, i);
      if (level) return level;
    }
  }

  // Rare: the whole block failed. Try hashed picks from anywhere in the pool.
  for (let i = 0; i < FALLBACK_CANDIDATES; i++) {
    const baseWord = pool[mixSeed(ENDLESS_SEED, n, 1000 + i) % pool.length] as string;
    const level = attempt(baseWord, MIN_ENDLESS_WORD_COUNT, 1000 + i);
    if (level) return level;
  }
  throw new Error(`Could not generate endless level ${n}`);
}
