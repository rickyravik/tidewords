import type { WordCorpus } from './generator';

/**
 * The shipped word dictionary (public/dictionary.json), written by
 * scripts/generate-levels.ts from the SCOWL en_GB + frequency corpus (see
 * CREDITS.md). Already blocklist-filtered and limited to 3-7 letter words,
 * the longest a wheel can spell. Word lists are space-separated strings
 * rather than JSON arrays: same data, noticeably smaller file.
 */
export interface DictionaryFile {
  version: 1;
  /** Target-eligible everyday words, most common first. */
  targets: string;
  /** Wider, bonus-only words, alphabetical. */
  bonus: string;
  /** Base words the 100 shipped levels use (endless levels avoid them). */
  reservedBaseWords: string;
}

function splitWords(list: string): string[] {
  return list.length === 0 ? [] : list.split(' ');
}

export function corpusFromLists(
  targets: readonly string[],
  bonusOnly: readonly string[],
  reservedBaseWords: readonly string[],
): WordCorpus {
  return {
    targets,
    words: new Set([...targets, ...bonusOnly]),
    reservedBaseWords: new Set(reservedBaseWords),
  };
}

export function toDictionaryFile(corpus: WordCorpus): DictionaryFile {
  const targetSet = new Set(corpus.targets);
  const bonusOnly = [...corpus.words].filter((word) => !targetSet.has(word)).sort();
  return {
    version: 1,
    targets: corpus.targets.join(' '),
    bonus: bonusOnly.join(' '),
    reservedBaseWords: [...corpus.reservedBaseWords].sort().join(' '),
  };
}

export function parseDictionary(file: DictionaryFile): WordCorpus {
  if (file.version !== 1 || typeof file.targets !== 'string' || typeof file.bonus !== 'string') {
    throw new Error('Unrecognised dictionary.json format');
  }
  return corpusFromLists(
    splitWords(file.targets),
    splitWords(file.bonus),
    splitWords(file.reservedBaseWords ?? ''),
  );
}

let loaded: WordCorpus | null = null;
let pending: Promise<WordCorpus | null> | null = null;

/**
 * Fetches and parses /dictionary.json once; later calls share the same
 * promise. Resolves to null (and allows a retry on the next call) if the
 * fetch fails, e.g. offline before the file was ever cached — callers then
 * fall back to a level's own precomputed `bonusWords`.
 */
export function loadDictionary(
  fetchFn: (url: string) => Promise<{ ok: boolean; json(): Promise<unknown> }> = (url) => fetch(url),
): Promise<WordCorpus | null> {
  if (loaded) return Promise.resolve(loaded);
  pending ??= Promise.resolve()
    .then(() => fetchFn('/dictionary.json'))
    .then(async (response) => {
      if (!response.ok) throw new Error('dictionary.json request failed');
      loaded = parseDictionary((await response.json()) as DictionaryFile);
      return loaded;
    })
    .catch(() => {
      pending = null;
      return null;
    });
  return pending;
}

/** The dictionary's word set if it has finished loading, otherwise undefined (callers fall back to `level.bonusWords`). */
export function loadedDictionaryWords(): ReadonlySet<string> | undefined {
  return loaded?.words;
}

/** Test-only: forget the cached dictionary. */
export function resetDictionaryCache(): void {
  loaded = null;
  pending = null;
}
