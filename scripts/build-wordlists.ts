#!/usr/bin/env -S node
/**
 * One-off importer that turns the raw third-party word lists into the two
 * trimmed data files the level generator reads (Node only, not shipped).
 * Re-run it only when upgrading a source list; the generator itself never
 * touches the network.
 *
 *   curl -sSL -o scowl.tar.gz https://downloads.sourceforge.net/wordlist/scowl-2020.12.07.tar.gz
 *   tar xzf scowl.tar.gz
 *   curl -sSL -o en_50k.txt https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/en/en_50k.txt
 *   npx tsx scripts/build-wordlists.ts scowl-2020.12.07/final en_50k.txt
 *
 * Outputs (licences in CREDITS.md):
 * - data/wordlists/scowl-en-gb.txt — every lowercase, letters-only, 3-7
 *   letter word in SCOWL's "english" + "british" lists (i.e. en_GB -ise
 *   spelling, no American-only, variant or -ize-only spellings) up to size
 *   50, with the SCOWL size it first appears at. Capitalised entries (proper
 *   nouns), abbreviations, contractions and anything with an apostrophe or
 *   accent never make it in.
 * - data/wordlists/subtitle-frequency.txt — the frequency rank (1 = most
 *   common) of each of those words in the OpenSubtitles 2018 top-50k list,
 *   for words that appear there at all. Only ranks for SCOWL words are kept.
 */
import fs from 'node:fs';
import path from 'node:path';

const SCOWL_SIZES = [10, 20, 35, 40, 50] as const;
const SCOWL_VARIANTS = ['english', 'british'] as const;
const WORD = /^[a-z]{3,7}$/;

function main(): void {
  const [scowlFinalDir, frequencyFile] = process.argv.slice(2);
  if (!scowlFinalDir || !frequencyFile) {
    console.error('Usage: tsx scripts/build-wordlists.ts <scowl>/final <en_50k.txt>');
    process.exit(1);
  }
  const outDir = path.resolve(import.meta.dirname, '..', 'data', 'wordlists');

  const sizeOf = new Map<string, number>();
  for (const size of SCOWL_SIZES) {
    for (const variant of SCOWL_VARIANTS) {
      const file = path.join(scowlFinalDir, `${variant}-words.${size}`);
      if (!fs.existsSync(file)) continue;
      // SCOWL ships ISO-8859-1; accented entries simply fail the WORD test.
      for (const word of fs.readFileSync(file, 'latin1').split('\n')) {
        if (WORD.test(word) && !sizeOf.has(word)) sizeOf.set(word, size);
      }
    }
  }

  const rankOf = new Map<string, number>();
  const frequencyLines = fs.readFileSync(frequencyFile, 'utf8').split('\n');
  frequencyLines.forEach((line, i) => {
    const word = line.split(' ')[0] ?? '';
    if (sizeOf.has(word) && !rankOf.has(word)) rankOf.set(word, i + 1);
  });

  const words = [...sizeOf.keys()].sort();
  fs.writeFileSync(
    path.join(outDir, 'scowl-en-gb.txt'),
    '# word<TAB>SCOWL size. Built by scripts/build-wordlists.ts from SCOWL 2020.12.07 (english + british, sizes 10-50). Licence: see CREDITS.md.\n' +
      words.map((w) => `${w}\t${sizeOf.get(w)}`).join('\n') +
      '\n',
    'utf8',
  );
  const ranked = words.filter((w) => rankOf.has(w));
  fs.writeFileSync(
    path.join(outDir, 'subtitle-frequency.txt'),
    '# word<TAB>rank (1 = most frequent) in hermitdave/FrequencyWords en_50k (OpenSubtitles 2018), CC BY-SA 4.0. Built by scripts/build-wordlists.ts; only SCOWL words kept.\n' +
      ranked.map((w) => `${w}\t${rankOf.get(w)}`).join('\n') +
      '\n',
    'utf8',
  );
  console.log(`SCOWL en_GB words (3-7 letters, size <= 50): ${words.length}; with a frequency rank: ${ranked.length}.`);
}

main();
