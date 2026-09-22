#!/usr/bin/env -S node
/**
 * Offline level generator (Node only — never imported by the app).
 *
 * Implements HANDOVER.md section 7's algorithm: pick a base word sized by
 * the difficulty curve (section 7.1, with the coordinator's word-count floor
 * of 5 applied throughout), find its sub-words, choose targets and bonus
 * words, lay out a crossword by crossing words longest-first over ~200
 * shuffled attempts, and validate the result with the same
 * `findLevelShapeErrors` fairness check the runtime and CI both use.
 *
 * Every word that can appear in a level — base, target or bonus — comes from
 * the fair corpus built in scripts/lib/wordlist.ts (a hand-curated common
 * word seed plus its dictionary-checked regular inflections). No level's
 * words are picked by hand: this script is the only thing that chooses them.
 *
 * Run with `npm run generate-levels` (writes public/levels/chapter-0N.json
 * for N = 1..5), then `npm run validate-levels` to double-check the output.
 */
import fs from 'node:fs';
import path from 'node:path';
import { buildCorpus, writeCorpusArtifact, type CorpusResult } from './lib/wordlist';
import { isFullyConnected, layoutWords, mulberry32, pickTargets, shuffle, subwordsFor } from './lib/generator';
import { findLevelShapeErrors } from '../src/game/levelShape';
import type { ChapterPack, Level, ThemeId } from '../src/game/types';

// A fixed seed makes each run reproducible: same corpus in, same 100 levels
// out, which makes review and CI diffs meaningful.
const SEED = 20260101;

const LEVELS_PER_CHAPTER = 20;
const MAX_BASE_WORD_ATTEMPTS = 60;
const WORD_COUNT_FLOOR = 5;
const LETTER_COUNT_CEILING = 6; // this generator run never needs the 101+ tier's 7-letter wheels

const CHAPTERS: Array<{ chapter: number; title: string; theme: ThemeId }> = [
  { chapter: 1, title: 'Harbour Mouth', theme: 'harbour' },
  { chapter: 2, title: 'Kelp Forest', theme: 'kelp' },
  { chapter: 3, title: 'Coral Reef', theme: 'reef' },
  { chapter: 4, title: 'Fjord Passage', theme: 'fjord' },
  { chapter: 5, title: 'Aurora Reach', theme: 'aurora' },
];

/**
 * Difficulty curve (HANDOVER.md section 7.1, global level number `n` across
 * all 5 chapters), with the coordinator's update applied: word count never
 * drops below 5 anywhere (the original spec's 1-10 tier allowed as few as
 * 3). Both functions are non-decreasing in `n`, so difficulty never dips
 * from one level to the next across the whole 100-level sequence.
 *
 *   n  1-10   : 5 letters, 5 words   (tier "1 to 10": floor now equals the old ceiling)
 *   n 11-40   : 5-6 letters, 5-6 words (tier "11 to 40": floor raised from 4 to 5)
 *   n 41-100  : 6 letters, 6-8 words  (tier "41 to 100": already >= 5, unchanged)
 *   (tier "101+" is never reached — this run only generates levels 1-100)
 */
function targetLetterCount(n: number): number {
  return n <= 25 ? 5 : 6;
}

function targetWordCount(n: number): number {
  if (n <= 20) return 5;
  if (n <= 60) return 6;
  if (n <= 80) return 7;
  return 8;
}

function pad(n: number, width: number): string {
  return String(n).padStart(width, '0');
}

function shuffleWheelLetters(baseWord: string, random: () => number): string[] {
  const original = baseWord.split('');
  let attempt = shuffle(original, random);
  // Section 7 step 7: don't let the wheel just spell the base word in order.
  for (let i = 0; i < 5 && attempt.join('') === original.join(''); i++) {
    attempt = shuffle(original, random);
  }
  return attempt;
}

interface GenerateArgs {
  chapter: number;
  index: number;
  letterCount: number;
  wordCount: number;
  corpus: CorpusResult;
  usedBaseWords: Set<string>;
  random: () => number;
}

function generateLevel(args: GenerateArgs): { level: Level; baseWord: string } | null {
  const { chapter, index, letterCount, wordCount, corpus, usedBaseWords, random } = args;

  const candidates = shuffle(
    corpus.words.filter((w) => w.length === letterCount && !usedBaseWords.has(w)),
    random,
  ).slice(0, MAX_BASE_WORD_ATTEMPTS);

  for (const baseWord of candidates) {
    const subwords = subwordsFor(baseWord, corpus.words);
    const picked = pickTargets(baseWord, subwords, wordCount, corpus.rootWords, random);
    if (!picked) continue;

    const layout = layoutWords(baseWord, picked.targets.slice(1), random, 200);
    if (!layout || layout.rows > 8 || layout.cols > 8) continue;
    if (!isFullyConnected(layout.words)) continue;

    const level: Level = {
      id: `c${pad(chapter, 2)}-l${pad(index, 3)}`,
      chapter,
      index,
      letters: shuffleWheelLetters(baseWord, random),
      rows: layout.rows,
      cols: layout.cols,
      words: layout.words,
      bonusWords: picked.bonusWords,
    };

    if (findLevelShapeErrors(level).length > 0) continue; // defensive: should be unreachable
    return { level, baseWord };
  }

  // Graceful degradation: never below the word-count floor or above the
  // letter-count ceiling this run needs, but try a slightly easier shape
  // before giving up on this level slot entirely.
  if (wordCount > WORD_COUNT_FLOOR) {
    return generateLevel({ ...args, wordCount: wordCount - 1 });
  }
  if (letterCount < LETTER_COUNT_CEILING) {
    return generateLevel({ ...args, letterCount: letterCount + 1 });
  }
  return null;
}

function main(): void {
  const corpus = buildCorpus();
  writeCorpusArtifact(corpus);
  console.log(
    `Corpus: ${corpus.rootCount} curated roots + ${corpus.derivedCount} dictionary-checked inflections = ${corpus.words.length} words.`,
  );

  const random = mulberry32(SEED);
  const usedBaseWords = new Set<string>();
  const levelsRoot = path.resolve(import.meta.dirname, '..', 'public', 'levels');

  let generated = 0;
  let failed = 0;

  for (const chapterDef of CHAPTERS) {
    const levels: Level[] = [];
    for (let index = 1; index <= LEVELS_PER_CHAPTER; index++) {
      const n = (chapterDef.chapter - 1) * LEVELS_PER_CHAPTER + index;
      const result = generateLevel({
        chapter: chapterDef.chapter,
        index,
        letterCount: targetLetterCount(n),
        wordCount: targetWordCount(n),
        corpus,
        usedBaseWords,
        random,
      });
      if (!result) {
        failed++;
        console.error(`Chapter ${chapterDef.chapter} level ${index} (global #${n}): could not generate a valid layout.`);
        continue;
      }
      usedBaseWords.add(result.baseWord);
      levels.push(result.level);
      generated++;
    }

    const pack: ChapterPack = { chapter: chapterDef.chapter, title: chapterDef.title, theme: chapterDef.theme, levels };
    const outPath = path.join(levelsRoot, `chapter-${pad(chapterDef.chapter, 2)}.json`);
    fs.writeFileSync(outPath, JSON.stringify(pack, null, 2) + '\n', 'utf8');
    console.log(`Wrote ${outPath}: ${levels.length}/${LEVELS_PER_CHAPTER} levels.`);
  }

  writeDictionary(corpus);

  console.log(`\nGenerated ${generated} levels, ${failed} failed.`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

/**
 * The compact, shipped bonus-word dictionary (public/dictionary.json — see
 * HANDOVER.md section 3's project structure). It's the same fair corpus the
 * generator draws from, so anything the runtime might one day look up here
 * is already blocklist-filtered and dictionary-checked. As of this change
 * `classifySubmission` in src/game/validate.ts still only checks a level's
 * own `bonusWords` array; wiring this file in as a fallback lookup for
 * *unplanned* bonus words is forward-looking infrastructure, left for
 * whoever picks that up (see this task's final report).
 */
function writeDictionary(corpus: CorpusResult): void {
  const outPath = path.resolve(import.meta.dirname, '..', 'public', 'dictionary.json');
  fs.writeFileSync(outPath, JSON.stringify(corpus.words) + '\n', 'utf8');
  console.log(`Wrote ${outPath}: ${corpus.words.length} words.`);
}

main();
