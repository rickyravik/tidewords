import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import wordListPath from 'word-list';

/**
 * Builds the fair, filtered word corpus the level generator draws from.
 *
 * `data/wordlists/common-roots.txt` is the one hand-picked artefact in the
 * whole content pipeline: a seed of everyday English words. Everything else
 * here is derived from it programmatically — regular inflections (plurals,
 * -ed, -ing, -er/-est) are generated for each root and kept only when the
 * result is BOTH a real dictionary entry (checked against the `word-list`
 * npm package's 274k-word corpus, so spelling is genuine) AND not present in
 * `data/blocklist.txt`. This is the "cross-reference against a smaller
 * definitely-common seed list" approach from HANDOVER.md section 7: the
 * SCOWL/wordfreq data the spec asks for isn't available in this sandbox, so
 * commonness is guaranteed by construction (every word traces back to a
 * hand-picked common root) rather than by a frequency cut-off.
 *
 * The level generator (scripts/generate-levels.ts) never invents a word
 * outside this corpus, so every base, target and bonus word it ships is
 * either one of the curated roots or a genuine, dictionary-checked
 * inflection of one.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(HERE, '../..');

const ROOTS_PATH = path.join(PROJECT_ROOT, 'data/wordlists/common-roots.txt');
const BLOCKLIST_PATH = path.join(PROJECT_ROOT, 'data/blocklist.txt');
const CORPUS_OUT_PATH = path.join(PROJECT_ROOT, 'data/wordlists/generated-corpus.txt');

const ALPHA_ONLY = /^[a-z]+$/;
const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);

function readLines(filePath: string): string[] {
  return fs
    .readFileSync(filePath, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function loadBlocklist(): Set<string> {
  const lines = readLines(BLOCKLIST_PATH)
    .filter((line) => !line.startsWith('#'))
    .map((line) => line.toLowerCase());
  return new Set(lines);
}

export type PartOfSpeech = 'noun' | 'verb' | 'adj';

/**
 * Which inflections are safe to try for a root, by rough part of speech.
 * common-roots.txt groups roots under `# --- ... ---` section headers; a
 * header naming "verbs" or "adjectives" switches the category for the roots
 * beneath it, everything else defaults to noun. This matters for fairness:
 * blindly applying -ed/-ing/-er to every root produces coincidental but
 * obscure real dictionary words (e.g. the insect "ant" plus -ed lands on
 * "anted", the poker term, and "ant" plus -ing lands on "anting", a real but
 * obscure ornithology word) — restricting each root to the inflections that
 * actually apply to its part of speech avoids that.
 */
function posForHeader(header: string): PartOfSpeech {
  const lower = header.toLowerCase();
  if (lower.includes('verb')) return 'verb';
  if (lower.includes('adjective')) return 'adj';
  return 'noun';
}

/** Loads roots paired with the part of speech implied by their section header. */
export function loadTaggedRoots(): Array<{ word: string; pos: PartOfSpeech }> {
  const blocklist = loadBlocklist();
  let pos: PartOfSpeech = 'noun';
  const seen = new Set<string>();
  const result: Array<{ word: string; pos: PartOfSpeech }> = [];

  for (const rawLine of readLines(ROOTS_PATH)) {
    if (rawLine.startsWith('#')) {
      if (rawLine.startsWith('# ---')) {
        pos = posForHeader(rawLine);
      }
      continue;
    }
    const word = rawLine.toLowerCase();
    if (!ALPHA_ONLY.test(word) || word.length < 3 || blocklist.has(word) || seen.has(word)) {
      continue;
    }
    seen.add(word);
    result.push({ word, pos });
  }
  return result;
}

export function loadRoots(): string[] {
  return loadTaggedRoots().map((r) => r.word);
}

/** The real dictionary (word-list npm package), as an uppercase lookup set, used only to confirm a *derived* inflection is genuine English spelling. */
export function loadDictionarySet(): Set<string> {
  const raw = fs.readFileSync(wordListPath, 'utf8').split('\n');
  const set = new Set<string>();
  for (const line of raw) {
    const word = line.trim().toLowerCase();
    if (ALPHA_ONLY.test(word)) {
      set.add(word.toUpperCase());
    }
  }
  return set;
}

function isConsonant(letter: string): boolean {
  return /[a-z]/.test(letter) && !VOWELS.has(letter);
}

/** True for a short root ending consonant-vowel-consonant, e.g. "hop", "swim" — the classic doubling case for -ed/-ing ("hopped", "swimming"). */
function endsInDoublingPattern(root: string): boolean {
  if (root.length < 3) return false;
  const [a, b, c] = root.slice(-3);
  return (
    isConsonant(a ?? '') &&
    VOWELS.has(b ?? '') &&
    isConsonant(c ?? '') &&
    c !== 'w' &&
    c !== 'x' &&
    c !== 'y'
  );
}

/**
 * Regular English inflections of `root` (lowercase candidates; not all are
 * real words — callers validate against the dictionary). `pos` restricts
 * which categories are tried, so a noun like "ant" never gets a spurious
 * "-ed"/"-ing" form: see `loadTaggedRoots` for why that matters.
 */
export function inflections(root: string, pos: PartOfSpeech): string[] {
  const forms = new Set<string>();
  const last = root.slice(-1);
  const last2 = root.slice(-2);
  const endsConsonantY = last === 'y' && isConsonant(root.slice(-2, -1));
  const doubled = endsInDoublingPattern(root) ? root + last : null;

  if (pos === 'noun' || pos === 'verb') {
    // Plural (noun) / third person singular (verb) -s.
    if (['s', 'x', 'z', 'ch', 'sh'].some((suffix) => root.endsWith(suffix))) {
      forms.add(root + 'es');
    } else if (endsConsonantY) {
      forms.add(root.slice(0, -1) + 'ies');
    } else {
      forms.add(root + 's');
    }
  }

  if (pos === 'verb') {
    // Past tense -ed. When the CVC doubling rule applies (e.g. "trap" ->
    // "trapped"), that's the only correct form — the undoubled guess
    // ("traped") is skipped rather than left for the dictionary check to
    // catch, because the noisy word-list corpus sometimes contains that
    // wrong spelling too (as an archaic/dialectal variant), which would
    // otherwise slip a nonstandard word past the filter.
    if (last === 'e') {
      forms.add(root + 'd');
    } else if (endsConsonantY) {
      forms.add(root.slice(0, -1) + 'ied');
    } else if (doubled) {
      forms.add(doubled + 'ed');
    } else {
      forms.add(root + 'ed');
    }

    // Present participle -ing.
    if (last === 'e' && last2 !== 'ee') {
      forms.add(root.slice(0, -1) + 'ing');
    } else if (doubled) {
      forms.add(doubled + 'ing');
    } else {
      forms.add(root + 'ing');
    }
  }

  if (pos === 'adj') {
    // Comparative / superlative -er/-est, only worth trying for short words.
    if (root.length <= 6) {
      if (last === 'e') {
        forms.add(root + 'r');
        forms.add(root + 'st');
      } else if (endsConsonantY) {
        forms.add(root.slice(0, -1) + 'ier');
        forms.add(root.slice(0, -1) + 'iest');
      } else if (doubled) {
        forms.add(doubled + 'er');
        forms.add(doubled + 'est');
      } else {
        forms.add(root + 'er');
        forms.add(root + 'est');
      }
    }
  }

  forms.delete(root);
  return [...forms];
}

export interface CorpusResult {
  /** Uppercase, deduped, sorted, every word 3+ letters. */
  words: string[];
  /** The subset of `words` that are hand-curated roots rather than derived inflections — used to prefer the most obviously common words when a level picks its target words. */
  rootWords: Set<string>;
  rootCount: number;
  derivedCount: number;
}

/** Builds the full fair corpus: curated roots plus their dictionary-checked inflections, minus anything blocklisted. */
export function buildCorpus(): CorpusResult {
  const blocklist = loadBlocklist();
  const taggedRoots = loadTaggedRoots();
  const dictionary = loadDictionarySet();

  const words = new Set<string>();
  const rootWords = new Set<string>();
  for (const { word } of taggedRoots) {
    words.add(word.toUpperCase());
    rootWords.add(word.toUpperCase());
  }
  let derivedCount = 0;
  for (const { word: root, pos } of taggedRoots) {
    for (const candidate of inflections(root, pos)) {
      if (blocklist.has(candidate)) continue;
      if (!dictionary.has(candidate.toUpperCase())) continue;
      if (!words.has(candidate.toUpperCase())) derivedCount++;
      words.add(candidate.toUpperCase());
    }
  }

  const sorted = [...words].filter((w) => w.length >= 3).sort();
  return { words: sorted, rootWords, rootCount: taggedRoots.length, derivedCount };
}

/** Writes the corpus to data/wordlists/generated-corpus.txt as a debuggable intermediate artefact (not shipped). */
export function writeCorpusArtifact(result: CorpusResult): void {
  const header = `# Generated corpus: ${result.rootCount} curated roots + ${result.derivedCount} dictionary-checked inflections = ${result.words.length} words.\n# Not shipped — see public/dictionary.json for the shipped, compact version.\n`;
  fs.writeFileSync(CORPUS_OUT_PATH, header + result.words.join('\n') + '\n', 'utf8');
}

export { PROJECT_ROOT };
