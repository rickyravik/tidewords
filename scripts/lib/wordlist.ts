import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

/**
 * Builds the fair, frequency-ranked word corpus every level is generated
 * from (HANDOVER.md section 7 "Word lists"). Inputs, all in data/ (see
 * scripts/build-wordlists.ts for how the third-party files were imported,
 * and CREDITS.md for their licences):
 *
 * - wordlists/scowl-en-gb.txt — SCOWL en_GB words (3-7 letters) with the
 *   SCOWL size each first appears at. Size <= 50 is the bonus tier: real,
 *   British-spelt words, but some are uncommon.
 * - wordlists/subtitle-frequency.txt — each word's rank in a 50k-word
 *   OpenSubtitles frequency list: how often people actually say it.
 * - wordlists/common-roots.txt — the earlier hand-curated seed of everyday
 *   (and nautical) words. Any of these at SCOWL size <= 35 is always target
 *   eligible, even if subtitles rarely mention it ("oar", "keel").
 * - wordlists/not-targets.txt — real words fine as bonus words but poor
 *   crossword answers (interjections, apostrophe fragments like "don").
 * - blocklist.txt — dropped everywhere: never a base, target, bonus or
 *   dictionary word.
 *
 * Target tier = SCOWL size <= 35 (SCOWL's "common words" level) AND within
 * the frequency cut-off (or a curated root), minus not-targets. It is
 * returned ranked most-common first, which is what "choose the most common
 * sub words" in section 7 step 3 uses.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(HERE, '../..');
const DATA = path.join(PROJECT_ROOT, 'data');

const SCOWL_PATH = path.join(DATA, 'wordlists/scowl-en-gb.txt');
const FREQUENCY_PATH = path.join(DATA, 'wordlists/subtitle-frequency.txt');
const ROOTS_PATH = path.join(DATA, 'wordlists/common-roots.txt');
const NOT_TARGETS_PATH = path.join(DATA, 'wordlists/not-targets.txt');
const BLOCKLIST_PATH = path.join(DATA, 'blocklist.txt');
const CORPUS_OUT_PATH = path.join(DATA, 'wordlists/generated-corpus.txt');

/** SCOWL's "common words" size, per section 7's "around size 35 for target words". */
const TARGET_MAX_SCOWL_SIZE = 35;
/** Frequency-rank cut-off for target words. 3-letter words get a stricter one: that's where obscure crossword-ese hides. */
const TARGET_MAX_RANK: Record<number, number> = { 3: 12000 };
const TARGET_MAX_RANK_DEFAULT = 20000;

function readWordLines(filePath: string): string[] {
  return fs
    .readFileSync(filePath, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
}

function readWordSet(filePath: string): Set<string> {
  return new Set(readWordLines(filePath).map((line) => line.toLowerCase()));
}

function readWordNumbers(filePath: string): Map<string, number> {
  const result = new Map<string, number>();
  for (const line of readWordLines(filePath)) {
    const [word, value] = line.split('\t');
    if (word && value) result.set(word, Number(value));
  }
  return result;
}

export function loadBlocklist(): Set<string> {
  return readWordSet(BLOCKLIST_PATH);
}

export interface CorpusResult {
  /** Target-eligible words, uppercase, most common first. */
  targets: string[];
  /** Every other accepted word (bonus tier only), uppercase, alphabetical. */
  bonusOnly: string[];
}

export function buildCorpus(): CorpusResult {
  const scowlSize = readWordNumbers(SCOWL_PATH);
  const frequencyRank = readWordNumbers(FREQUENCY_PATH);
  const curatedRoots = readWordSet(ROOTS_PATH);
  const notTargets = readWordSet(NOT_TARGETS_PATH);
  const blocklist = loadBlocklist();

  const ranked: Array<{ word: string; rank: number }> = [];
  const bonusOnly: string[] = [];

  for (const [word, size] of scowlSize) {
    if (blocklist.has(word)) continue;
    const cutoff = TARGET_MAX_RANK[word.length] ?? TARGET_MAX_RANK_DEFAULT;
    const rank = frequencyRank.get(word) ?? Infinity;
    const isTarget =
      size <= TARGET_MAX_SCOWL_SIZE && !notTargets.has(word) && (rank <= cutoff || curatedRoots.has(word));
    if (isTarget) {
      // A curated root outside the frequency cut-off ranks as if at the cut-off.
      ranked.push({ word: word.toUpperCase(), rank: Math.min(rank, cutoff) });
    } else {
      bonusOnly.push(word.toUpperCase());
    }
  }

  ranked.sort((a, b) => a.rank - b.rank || (a.word < b.word ? -1 : 1));
  return { targets: ranked.map((r) => r.word), bonusOnly: bonusOnly.sort() };
}

/** Writes the ranked target tier to data/wordlists/generated-corpus.txt as a debuggable intermediate artefact (not shipped). */
export function writeCorpusArtifact(result: CorpusResult): void {
  const header =
    `# Generated corpus: ${result.targets.length} target-tier words (most common first) + ${result.bonusOnly.length} bonus-only words.\n` +
    '# Not shipped — see public/dictionary.json for the shipped, compact version. Target tier below, one per line.\n';
  fs.writeFileSync(CORPUS_OUT_PATH, header + result.targets.join('\n') + '\n', 'utf8');
}

export { PROJECT_ROOT };
