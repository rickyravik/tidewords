import { afterEach, describe, expect, it, vi } from 'vitest';
import shippedDictionary from '../../public/dictionary.json';
import {
  corpusFromLists,
  loadDictionary,
  loadedDictionaryWords,
  parseDictionary,
  resetDictionaryCache,
  toDictionaryFile,
  type DictionaryFile,
} from './dictionary';

const file = shippedDictionary as DictionaryFile;

describe('dictionary file format', () => {
  it('round-trips a corpus', () => {
    const corpus = corpusFromLists(['SEA', 'TIDE'], ['EBB'], ['HANDED']);
    const parsed = parseDictionary(toDictionaryFile(corpus));
    expect(parsed.targets).toEqual(['SEA', 'TIDE']);
    expect(parsed.words).toEqual(new Set(['SEA', 'TIDE', 'EBB']));
    expect(parsed.reservedBaseWords).toEqual(new Set(['HANDED']));
  });

  it('rejects an unknown format', () => {
    expect(() => parseDictionary(['SEA'] as unknown as DictionaryFile)).toThrow();
  });
});

describe('public/dictionary.json', () => {
  const corpus = parseDictionary(file);

  it('is large, uppercase letters only, 3-7 letters long', () => {
    expect(corpus.words.size).toBeGreaterThan(20000);
    for (const word of corpus.words) {
      expect(word).toMatch(/^[A-Z]{3,7}$/);
    }
  });

  it('keeps blocklisted words out', () => {
    for (const word of ['FUCK', 'SHIT', 'CUNT', 'NIGGER', 'RAPE', 'MILF', 'WANKER']) {
      expect(corpus.words.has(word)).toBe(false);
    }
  });

  it('uses British, not American-only, spellings', () => {
    expect(corpus.words.has('COLOUR')).toBe(true);
    expect(corpus.words.has('COLOR')).toBe(false);
    expect(corpus.words.has('HARBOUR')).toBe(true);
    expect(corpus.words.has('HARBOR')).toBe(false);
  });

  it('lists every target-tier word as a dictionary word too, and reserves the 100 shipped base words', () => {
    expect(corpus.targets.every((word) => corpus.words.has(word))).toBe(true);
    expect(corpus.reservedBaseWords.size).toBe(100);
  });
});

describe('loadDictionary', () => {
  afterEach(() => resetDictionaryCache());

  it('fetches once and caches the parsed corpus', async () => {
    const fetchFn = vi.fn(async () => ({ ok: true, json: async () => toDictionaryFile(corpusFromLists(['SEA'], [], [])) }));
    expect(loadedDictionaryWords()).toBeUndefined();
    const [a, b] = await Promise.all([loadDictionary(fetchFn), loadDictionary(fetchFn)]);
    expect(a).toBe(b);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(loadedDictionaryWords()?.has('SEA')).toBe(true);
    await loadDictionary(fetchFn);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('resolves to null on failure and retries on the next call', async () => {
    const failing = vi.fn(async () => {
      throw new Error('offline');
    });
    expect(await loadDictionary(failing)).toBeNull();
    expect(loadedDictionaryWords()).toBeUndefined();
    const working = vi.fn(async () => ({ ok: true, json: async () => toDictionaryFile(corpusFromLists(['SEA'], [], [])) }));
    expect(await loadDictionary(working)).not.toBeNull();
  });
});
