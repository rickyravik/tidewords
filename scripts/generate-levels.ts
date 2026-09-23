#!/usr/bin/env -S node
/**
 * Offline level generator (Node only — never imported by the app).
 *
 * Implements HANDOVER.md section 7's algorithm for the 100 shipped levels:
 * pick a base word sized by the difficulty curve (`difficultyFor`, section
 * 7.1 with its 5-letter / 5-word floor), find its sub-words, choose targets
 * and bonus words, lay out a crossword, and validate it with the same
 * `findLevelShapeErrors` check the runtime and CI use. The algorithm itself
 * lives in src/game/generator.ts, shared with on-device endless levels.
 *
 * On top of the per-level algorithm this script adds repetition control
 * across the whole 100-level run, which only makes sense offline where every
 * level is generated in order:
 * - a target word already used by earlier levels costs more each time it is
 *   reused, and is banned outright after MAX_TARGET_USES levels;
 * - no base word, and no wheel (anagram letter set), is ever used twice.
 *
 * Every word comes from the SCOWL en_GB + frequency corpus built in
 * scripts/lib/wordlist.ts. No level's words are picked by hand.
 *
 * Run with `npm run generate-levels` (writes public/levels/chapter-0N.json
 * for N = 1..5 and public/dictionary.json), then `npm run validate-levels`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { buildCorpus, writeCorpusArtifact } from './lib/wordlist';
import { buildLevel, difficultyFor, isPluralForm, letterSet, mulberry32, shuffle } from '../src/game/generator';
import { corpusFromLists, toDictionaryFile } from '../src/game/dictionary';
import type { ChapterPack, Level, ThemeId } from '../src/game/types';

// A fixed seed makes each run reproducible: same corpus in, same 100 levels
// out, which makes review and CI diffs meaningful.
const SEED = 20260101;

const LEVELS_PER_CHAPTER = 20;
const MAX_BASE_WORD_ATTEMPTS = 80;
/** Base words are drawn from this many of the most common target-tier words of the right length. */
const BASE_WORD_POOL = 900;
/** Hard cap: no target word appears in more than this many of the 100 levels. */
const MAX_TARGET_USES = 5;
/** Score cost per earlier use of a target word (commonness is on a log2-rank scale, so ~one doubling of rank each). */
const REUSE_PENALTY = 2.5;
/** A level with fewer bonus words than this is kept only if no other base word works. */
const MIN_BONUS_WORDS = 3;

const CHAPTERS: Array<{ chapter: number; title: string; theme: ThemeId }> = [
  { chapter: 1, title: 'Harbour Mouth', theme: 'harbour' },
  { chapter: 2, title: 'Kelp Forest', theme: 'kelp' },
  { chapter: 3, title: 'Coral Reef', theme: 'reef' },
  { chapter: 4, title: 'Fjord Passage', theme: 'fjord' },
  { chapter: 5, title: 'Aurora Reach', theme: 'aurora' },
];

function pad(n: number, width: number): string {
  return String(n).padStart(width, '0');
}

function baseWordOf(level: Level): string {
  return level.words.reduce((a, b) => (b.word.length > a.word.length ? b : a)).word;
}

function main(): void {
  const lists = buildCorpus();
  writeCorpusArtifact(lists);
  const corpus = corpusFromLists(lists.targets, lists.bonusOnly, []);
  console.log(
    `Corpus: ${lists.targets.length} target-tier words + ${lists.bonusOnly.length} bonus-only words = ${corpus.words.size}.`,
  );

  const random = mulberry32(SEED);
  const usedBaseWords = new Set<string>();
  const usedWheels = new Set<string>();
  const targetUses = new Map<string, number>();
  const usagePenalty = (word: string) => {
    const uses = targetUses.get(word) ?? 0;
    return uses >= MAX_TARGET_USES ? Infinity : uses * REUSE_PENALTY;
  };

  const levelsRoot = path.resolve(import.meta.dirname, '..', 'public', 'levels');
  const allLevels: Level[] = [];
  let failed = 0;

  for (const chapterDef of CHAPTERS) {
    const levels: Level[] = [];
    for (let index = 1; index <= LEVELS_PER_CHAPTER; index++) {
      const n = (chapterDef.chapter - 1) * LEVELS_PER_CHAPTER + index;
      const { letterCount, wordCount } = difficultyFor(n);
      const pool = corpus.targets
        .filter((w) => w.length === letterCount && !isPluralForm(w, corpus.words))
        .slice(0, BASE_WORD_POOL);
      const candidates = shuffle(
        pool.filter((w) => !usedBaseWords.has(w) && !usedWheels.has(letterSet(w))),
        random,
      ).slice(0, MAX_BASE_WORD_ATTEMPTS);

      // Take the first base word that lays out with a few bonus words to find;
      // settle for a bonus-poor one only if nothing better turns up.
      let level: Level | null = null;
      for (const baseWord of candidates) {
        const built = buildLevel({
          id: `c${pad(chapterDef.chapter, 2)}-l${pad(index, 3)}`,
          chapter: chapterDef.chapter,
          index,
          baseWord,
          wordCount,
          corpus,
          random,
          preferences: { usagePenalty },
        });
        if (!built) continue;
        if (!level || built.bonusWords.length > level.bonusWords.length) level = built;
        if (level.bonusWords.length >= MIN_BONUS_WORDS) break;
      }
      if (!level) {
        failed++;
        console.error(`Chapter ${chapterDef.chapter} level ${index} (global #${n}): could not generate a valid layout.`);
        continue;
      }

      const baseWord = baseWordOf(level);
      usedBaseWords.add(baseWord);
      usedWheels.add(letterSet(baseWord));
      for (const placed of level.words) {
        targetUses.set(placed.word, (targetUses.get(placed.word) ?? 0) + 1);
      }
      levels.push(level);
      allLevels.push(level);
    }

    const pack: ChapterPack = { chapter: chapterDef.chapter, title: chapterDef.title, theme: chapterDef.theme, levels };
    const outPath = path.join(levelsRoot, `chapter-${pad(chapterDef.chapter, 2)}.json`);
    fs.writeFileSync(outPath, JSON.stringify(pack, null, 2) + '\n', 'utf8');
    console.log(`Wrote ${outPath}: ${levels.length}/${LEVELS_PER_CHAPTER} levels.`);
  }

  writeDictionary(corpusFromLists(lists.targets, lists.bonusOnly, [...usedBaseWords]));
  printStats(allLevels, targetUses);

  console.log(`\nGenerated ${allLevels.length} levels, ${failed} failed.`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

/**
 * The compact, shipped dictionary (public/dictionary.json, format in
 * src/game/dictionary.ts): the whole blocklist-filtered corpus, used at
 * runtime for bonus-word lookups and as the source for endless levels, plus
 * the shipped base words so endless levels can avoid them.
 */
function writeDictionary(corpus: ReturnType<typeof corpusFromLists>): void {
  const outPath = path.resolve(import.meta.dirname, '..', 'public', 'dictionary.json');
  const json = JSON.stringify(toDictionaryFile(corpus)) + '\n';
  fs.writeFileSync(outPath, json, 'utf8');
  console.log(`Wrote ${outPath}: ${corpus.words.size} words, ${(json.length / 1024).toFixed(0)} KB.`);
}

function printStats(levels: readonly Level[], targetUses: ReadonlyMap<string, number>): void {
  const mostUsed = [...targetUses].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const zeroBonus = levels.filter((l) => l.bonusWords.length === 0).length;
  const bonusTotal = levels.reduce((sum, l) => sum + l.bonusWords.length, 0);
  const placements = levels.reduce((sum, l) => sum + l.words.length, 0);
  const threeLetter = levels.reduce((sum, l) => sum + l.words.filter((w) => w.word.length === 3).length, 0);
  console.log(
    `\nTargets: ${placements} placements, ${targetUses.size} unique, ${Math.round((100 * threeLetter) / placements)}% 3-letter.` +
      `\nMost used: ${mostUsed.map(([w, n]) => `${w}×${n}`).join(', ')}.` +
      `\nBonus words: avg ${(bonusTotal / levels.length).toFixed(1)} per level, ${zeroBonus} level(s) with none.`,
  );
}

main();
