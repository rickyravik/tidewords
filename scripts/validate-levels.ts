#!/usr/bin/env -S node
/**
 * CI-style gate for shipped level content (Node only, not shipped).
 *
 * Loads every chapter pack in public/levels/ and runs
 * `findLevelShapeErrors` (the same fairness validator the app and its unit
 * tests use — HANDOVER.md section 7 step 6) over every level. Prints a
 * report and exits non-zero if any level has an error, so this can be wired
 * into CI directly: `npm run validate-levels`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { findLevelShapeErrors } from '../src/game/levelShape';
import type { ChapterPack } from '../src/game/types';

const levelsRoot = path.resolve(import.meta.dirname, '..', 'public', 'levels');

function main(): void {
  const files = fs
    .readdirSync(levelsRoot)
    .filter((f) => f.startsWith('chapter-') && f.endsWith('.json'))
    .sort();

  if (files.length === 0) {
    console.error(`No chapter packs found in ${levelsRoot}`);
    process.exit(1);
  }

  let totalLevels = 0;
  let totalErrors = 0;
  const letterCounts = new Map<number, number>();
  const wordCounts = new Map<number, number>();

  for (const file of files) {
    const pack = JSON.parse(fs.readFileSync(path.join(levelsRoot, file), 'utf8')) as ChapterPack;
    let chapterErrors = 0;

    for (const level of pack.levels) {
      totalLevels++;
      letterCounts.set(level.letters.length, (letterCounts.get(level.letters.length) ?? 0) + 1);
      wordCounts.set(level.words.length, (wordCounts.get(level.words.length) ?? 0) + 1);

      if (level.letters.length < 5) {
        console.error(`${file} ${level.id}: wheel has only ${level.letters.length} letters (minimum is 5)`);
        chapterErrors++;
      }
      if (level.words.length < 5) {
        console.error(`${file} ${level.id}: only ${level.words.length} target words (minimum is 5)`);
        chapterErrors++;
      }

      const errors = findLevelShapeErrors(level);
      for (const error of errors) {
        console.error(`${file} ${level.id}: ${error}`);
      }
      chapterErrors += errors.length;
    }

    console.log(`${file}: ${pack.levels.length} levels, ${chapterErrors} error(s)`);
    totalErrors += chapterErrors;
  }

  console.log(`\n${totalLevels} levels checked, ${totalErrors} error(s).`);
  console.log('Letters per wheel:', Object.fromEntries([...letterCounts.entries()].sort()));
  console.log('Words per level:', Object.fromEntries([...wordCounts.entries()].sort()));

  if (totalErrors > 0) {
    process.exitCode = 1;
  }
}

main();
