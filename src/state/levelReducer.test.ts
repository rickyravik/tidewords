import { describe, expect, it } from 'vitest';
import { SAMPLE_LEVEL } from '../game/sampleLevel';
import { initLevelState, levelReducer } from './levelReducer';

const noBonus = new Set<string>();

/** Picks a distinct wheel index for each letter of `word`, handling duplicate letters. */
function indicesForWord(word: string, wheelLetters: string[]): number[] {
  const used = new Set<number>();
  return [...word].map((letter) => {
    const index = wheelLetters.findIndex((l, i) => l === letter && !used.has(i));
    used.add(index);
    return index;
  });
}

describe('initLevelState', () => {
  it('shuffles the wheel but keeps the same letters as a multiset', () => {
    const state = initLevelState(SAMPLE_LEVEL, undefined, () => 0.5);
    expect(state.wheelLetters.slice().sort()).toEqual(SAMPLE_LEVEL.letters.slice().sort());
  });

  it('resumes found words and revealed cells from saved progress', () => {
    const state = initLevelState(SAMPLE_LEVEL, {
      foundWords: ['HAD'],
      revealedCells: ['1,2'],
    });
    expect(state.foundWords.has('HAD')).toBe(true);
    expect(state.revealedCells.has('1,2')).toBe(true);
    expect(state.isComplete).toBe(false);
  });
});

describe('levelReducer select', () => {
  it('builds up a selection across positions', () => {
    let state = initLevelState(SAMPLE_LEVEL, undefined, () => 0);
    state = levelReducer(state, { type: 'select', index: 0 });
    state = levelReducer(state, { type: 'select', index: 1 });
    expect(state.selection).toEqual([0, 1]);
  });

  it('backtracks when the pointer re-enters the second to last letter', () => {
    let state = initLevelState(SAMPLE_LEVEL, undefined, () => 0);
    state = levelReducer(state, { type: 'select', index: 0 });
    state = levelReducer(state, { type: 'select', index: 1 });
    state = levelReducer(state, { type: 'select', index: 0 }); // back to first
    expect(state.selection).toEqual([0]);
  });

  it('ignores re-entry into an already selected, non-adjacent letter', () => {
    let state = initLevelState(SAMPLE_LEVEL, undefined, () => 0);
    state = levelReducer(state, { type: 'select', index: 0 });
    state = levelReducer(state, { type: 'select', index: 1 });
    state = levelReducer(state, { type: 'select', index: 2 });
    state = levelReducer(state, { type: 'select', index: 0 }); // not second-to-last
    expect(state.selection).toEqual([0, 1, 2]);
  });
});

describe('levelReducer submit', () => {
  function submitWord(word: string) {
    let state = initLevelState(SAMPLE_LEVEL, undefined, () => 0);
    // Force a known wheel order so we can select by letter position.
    state = { ...state, wheelLetters: SAMPLE_LEVEL.letters };
    const indices = indicesForWord(word, state.wheelLetters);
    for (const index of indices) {
      state = levelReducer(state, { type: 'select', index });
    }
    return levelReducer(state, { type: 'submit', bonusWordsFound: noBonus });
  }

  it('finds a new target word and clears the selection', () => {
    const state = submitWord('HAD');
    expect(state.lastResult).toEqual({
      kind: 'found',
      word: { word: 'HAD', row: 0, col: 2, dir: 'across' },
    });
    expect(state.foundWords.has('HAD')).toBe(true);
    expect(state.selection).toEqual([]);
  });

  it('flags a repeat on the second submission of the same word', () => {
    let state = initLevelState(SAMPLE_LEVEL, undefined, () => 0);
    state = { ...state, wheelLetters: SAMPLE_LEVEL.letters };
    const select = (word: string, s: typeof state) =>
      indicesForWord(word, s.wheelLetters).reduce(
        (acc, index) => levelReducer(acc, { type: 'select', index }),
        s,
      );

    state = levelReducer(select('HAD', state), { type: 'submit', bonusWordsFound: noBonus });
    state = levelReducer(select('HAD', state), { type: 'submit', bonusWordsFound: noBonus });
    expect(state.lastResult?.kind).toBe('repeat');
  });

  it('marks completion once every word is found', () => {
    let state = initLevelState(SAMPLE_LEVEL, undefined, () => 0);
    state = { ...state, wheelLetters: SAMPLE_LEVEL.letters };
    for (const target of SAMPLE_LEVEL.words) {
      const indices = indicesForWord(target.word, state.wheelLetters);
      for (const index of indices) {
        state = levelReducer(state, { type: 'select', index });
      }
      state = levelReducer(state, { type: 'submit', bonusWordsFound: noBonus });
    }
    expect(state.isComplete).toBe(true);
  });
});

describe('levelReducer reveal', () => {
  it('adds revealed cells and can complete the level', () => {
    let state = initLevelState(SAMPLE_LEVEL, undefined, () => 0);
    const allCellKeys = Array.from(state.grid.cellsByKey.keys());
    state = levelReducer(state, { type: 'reveal', cellKeys: allCellKeys });
    expect(state.isComplete).toBe(true);
  });
});

describe('levelReducer shuffle', () => {
  it('keeps the same letters as a multiset and clears selection', () => {
    let state = initLevelState(SAMPLE_LEVEL, undefined, () => 0);
    state = levelReducer(state, { type: 'select', index: 0 });
    state = levelReducer(state, { type: 'shuffle', random: () => 0.9 });
    expect(state.selection).toEqual([]);
    expect(state.wheelLetters.slice().sort()).toEqual(SAMPLE_LEVEL.letters.slice().sort());
  });
});
