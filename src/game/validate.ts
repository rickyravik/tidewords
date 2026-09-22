import { canForm } from './letters';
import type { Level, SubmitResult } from './types';

/**
 * Classifies a submitted word against a level and what has already been
 * found, per the rules in the game design: target words fill the grid,
 * repeats pulse, bonus words go in the jar, everything else is invalid.
 */
export function classifySubmission(
  rawWord: string,
  level: Level,
  foundWords: ReadonlySet<string>,
  bonusWordsFound: ReadonlySet<string>,
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

  const isBonus = level.bonusWords.includes(word) && canForm(word, level.letters);
  if (isBonus) {
    return { kind: 'bonus', word, isNew: !bonusWordsFound.has(word) };
  }

  return { kind: 'invalid' };
}
