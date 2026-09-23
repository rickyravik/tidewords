import { canForm } from './letters';
import type { Level, SubmitResult } from './types';

/**
 * Classifies a submitted word against a level and what has already been
 * found, per the rules in the game design: target words fill the grid,
 * repeats pulse, bonus words go in the jar, everything else is invalid.
 *
 * A bonus word is any dictionary word of 3+ letters formable from the wheel
 * that isn't a target (HANDOVER.md section 4). `dictionary` is the shipped
 * word set (see ./dictionary.ts); until it has loaded, or if it failed to,
 * the level's own precomputed `bonusWords` are the fallback.
 */
export function classifySubmission(
  rawWord: string,
  level: Level,
  foundWords: ReadonlySet<string>,
  bonusWordsFound: ReadonlySet<string>,
  dictionary?: ReadonlySet<string>,
): SubmitResult {
  const word = rawWord.toUpperCase();

  if (word.length < 3) {
    return { kind: 'tooShort' };
  }

  const target = level.words.find((placed) => placed.word === word);
  if (target) {
    return foundWords.has(word)
      ? { kind: 'repeat', word: target }
      : { kind: 'found', word: target };
  }

  const isKnownWord = level.bonusWords.includes(word) || (dictionary?.has(word) ?? false);
  if (isKnownWord && canForm(word, level.letters)) {
    return { kind: 'bonus', word, isNew: !bonusWordsFound.has(word) };
  }

  return { kind: 'invalid' };
}
