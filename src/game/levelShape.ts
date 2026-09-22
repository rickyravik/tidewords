import { canForm } from './letters';
import { buildGrid, cellAt, wordCells } from './grid';
import { cellKey, type Level } from './types';

/**
 * Checks a level against the fairness rule from the level generator design:
 * every run of two or more letters on the grid must be exactly one target
 * word, every target and bonus word must be formable from the wheel, and no
 * two crossing words may disagree on a shared cell's letter.
 *
 * Used both to unit test the hand-written levels in Phase 1 and, later, to
 * validate generated chapter packs (Phase 3).
 */
export function findLevelShapeErrors(level: Level): string[] {
  const errors: string[] = [];
  const targetWords = new Set(level.words.map((w) => w.word));

  const letterAt = new Map<string, string>();
  for (const word of level.words) {
    wordCells(word).forEach((pos, i) => {
      const key = cellKey(pos.row, pos.col);
      const letter = word.word[i] ?? '';
      const existing = letterAt.get(key);
      if (existing && existing !== letter) {
        errors.push(
          `Cell ${key} has conflicting letters "${existing}" and "${letter}" (word "${word.word}")`,
        );
      } else {
        letterAt.set(key, letter);
      }
      if (pos.row < 0 || pos.row >= level.rows || pos.col < 0 || pos.col >= level.cols) {
        errors.push(
          `Word "${word.word}" has a cell (${pos.row},${pos.col}) outside the ${level.rows}x${level.cols} grid`,
        );
      }
    });
  }

  const grid = buildGrid(level);

  for (let row = 0; row < grid.rows; row++) {
    checkLine(
      Array.from({ length: grid.cols }, (_, col) => cellAt(grid, row, col)?.letter),
      targetWords,
      errors,
      `Row ${row}`,
    );
  }
  for (let col = 0; col < grid.cols; col++) {
    checkLine(
      Array.from({ length: grid.rows }, (_, row) => cellAt(grid, row, col)?.letter),
      targetWords,
      errors,
      `Column ${col}`,
    );
  }

  for (const word of level.words) {
    if (!canForm(word.word, level.letters)) {
      errors.push(`Target word "${word.word}" cannot be formed from the wheel letters`);
    }
  }
  for (const bonus of level.bonusWords) {
    if (!canForm(bonus, level.letters)) {
      errors.push(`Bonus word "${bonus}" cannot be formed from the wheel letters`);
    }
    if (targetWords.has(bonus)) {
      errors.push(`Bonus word "${bonus}" duplicates a target word`);
    }
  }

  return errors;
}

function checkLine(
  letters: Array<string | undefined>,
  targetWords: ReadonlySet<string>,
  errors: string[],
  label: string,
): void {
  let run = '';
  let runStart = 0;
  for (let i = 0; i <= letters.length; i++) {
    const letter = letters[i];
    if (letter) {
      if (run === '') {
        runStart = i;
      }
      run += letter;
    } else if (run) {
      if (run.length >= 2 && !targetWords.has(run)) {
        errors.push(`${label} has an unintended run "${run}" starting at index ${runStart}`);
      }
      run = '';
    }
  }
}
