import { isLevelComplete } from '../game/completion';
import { buildGrid } from '../game/grid';
import { classifySubmission } from '../game/validate';
import type { CellKey, Grid, Level, LevelProgress, SubmitResult } from '../game/types';

export interface LevelState {
  level: Level;
  grid: Grid;
  wheelLetters: string[];
  selection: number[];
  foundWords: Set<string>;
  revealedCells: Set<CellKey>;
  lastResult: SubmitResult | null;
  lastWord: string;
  isComplete: boolean;
}

export type LevelAction =
  | { type: 'select'; index: number }
  // `dictionary`: the shipped word set once loaded (src/game/dictionary.ts);
  // omitted, only the level's own bonusWords count as bonus words.
  | { type: 'submit'; bonusWordsFound: ReadonlySet<string>; dictionary?: ReadonlySet<string> }
  | { type: 'shuffle'; random?: () => number }
  | { type: 'reveal'; cellKeys: CellKey[] }
  | { type: 'clearResult' }
  // Tap mode's cross/clear button (Section 8) needs to drop the whole
  // in-progress selection, not just backtrack one letter.
  | { type: 'clearSelection' };

function shuffled(letters: string[], random: () => number): string[] {
  const copy = [...letters];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]] as [string, string];
  }
  return copy;
}

export function initLevelState(
  level: Level,
  progress?: LevelProgress,
  random: () => number = Math.random,
): LevelState {
  const grid = buildGrid(level);
  const foundWords = new Set(progress?.foundWords ?? []);
  const revealedCells = new Set(progress?.revealedCells ?? []);
  return {
    level,
    grid,
    wheelLetters: shuffled(level.letters, random),
    selection: [],
    foundWords,
    revealedCells,
    lastResult: null,
    lastWord: '',
    isComplete: isLevelComplete(grid, foundWords, revealedCells),
  };
}

function selectIndex(selection: number[], index: number): number[] {
  const last = selection[selection.length - 1];
  if (last === index) {
    return selection;
  }
  const secondLast = selection[selection.length - 2];
  if (secondLast === index) {
    return selection.slice(0, -1);
  }
  if (selection.includes(index)) {
    return selection;
  }
  return [...selection, index];
}

export function levelReducer(state: LevelState, action: LevelAction): LevelState {
  switch (action.type) {
    case 'select':
      return { ...state, selection: selectIndex(state.selection, action.index) };

    case 'submit': {
      const word = state.selection.map((i) => state.wheelLetters[i]).join('');
      const result = classifySubmission(
        word,
        state.level,
        state.foundWords,
        action.bonusWordsFound,
        action.dictionary,
      );

      const foundWords =
        result.kind === 'found'
          ? new Set(state.foundWords).add(result.word.word)
          : state.foundWords;

      const nextState: LevelState = {
        ...state,
        selection: [],
        foundWords,
        lastResult: result,
        lastWord: word,
      };
      return {
        ...nextState,
        isComplete: isLevelComplete(nextState.grid, foundWords, nextState.revealedCells),
      };
    }

    case 'shuffle':
      return {
        ...state,
        selection: [],
        wheelLetters: shuffled(state.level.letters, action.random ?? Math.random),
      };

    case 'reveal': {
      const revealedCells = new Set(state.revealedCells);
      for (const key of action.cellKeys) {
        revealedCells.add(key);
      }
      return {
        ...state,
        revealedCells,
        isComplete: isLevelComplete(state.grid, state.foundWords, revealedCells),
      };
    }

    case 'clearResult':
      return { ...state, lastResult: null };

    case 'clearSelection':
      return { ...state, selection: [] };

    default:
      return state;
  }
}
