import { beforeEach, describe, expect, it } from 'vitest';
import { BONUS_JAR_COINS, HINT_COST, STARTING_COINS } from '../game/economy';
import { useProfileStore } from './profileStore';

beforeEach(() => {
  localStorage.clear();
  useProfileStore.persist.clearStorage();
  useProfileStore.setState(useProfileStore.getInitialState(), true);
});

describe('useProfileStore', () => {
  it('starts with the default balance and no progress', () => {
    const state = useProfileStore.getState();
    expect(state.coins).toBe(STARTING_COINS);
    expect(state.completedLevelIds).toEqual([]);
  });

  it('spends coins only when the balance covers the cost', () => {
    const { spendCoins } = useProfileStore.getState();
    expect(spendCoins(STARTING_COINS + 1)).toBe(false);
    expect(useProfileStore.getState().coins).toBe(STARTING_COINS);

    expect(spendCoins(HINT_COST)).toBe(true);
    expect(useProfileStore.getState().coins).toBe(STARTING_COINS - HINT_COST);
  });

  it('pays out on level completion once, not on repeat completions', () => {
    const { completeLevel } = useProfileStore.getState();
    completeLevel('c01-l001');
    const afterFirst = useProfileStore.getState().coins;
    expect(afterFirst).toBeGreaterThan(STARTING_COINS);

    completeLevel('c01-l001');
    expect(useProfileStore.getState().coins).toBe(afterFirst);
    expect(useProfileStore.getState().completedLevelIds).toEqual(['c01-l001']);
  });

  it('clears saved in-progress data for a level once it is completed', () => {
    const { saveLevelProgress, completeLevel } = useProfileStore.getState();
    saveLevelProgress('c01-l001', { foundWords: ['HAD'], revealedCells: [] });
    completeLevel('c01-l001');
    expect(useProfileStore.getState().levelProgress['c01-l001']).toBeUndefined();
  });

  it('fills the bonus jar and pays out once it reaches ten new words', () => {
    const { recordBonusWord } = useProfileStore.getState();
    for (let i = 0; i < 9; i++) {
      const result = recordBonusWord(`WORD${i}`);
      expect(result.isNew).toBe(true);
      expect(result.coinsEarned).toBe(0);
    }
    const tenth = recordBonusWord('WORD9');
    expect(tenth.coinsEarned).toBe(BONUS_JAR_COINS);
    expect(useProfileStore.getState().bonusJarCount).toBe(0);
  });

  it('does not re-credit or re-add an already-found bonus word', () => {
    const { recordBonusWord } = useProfileStore.getState();
    recordBonusWord('HAND');
    const before = useProfileStore.getState();
    const result = recordBonusWord('HAND');
    expect(result.isNew).toBe(false);
    expect(useProfileStore.getState().coins).toBe(before.coins);
    expect(useProfileStore.getState().bonusWordsFound.filter((w) => w === 'HAND')).toHaveLength(1);
  });

  it('advances the daily streak and pays the day 7 bonus', () => {
    const { completeDailyPuzzle } = useProfileStore.getState();
    const dates = [
      '2026-01-01',
      '2026-01-02',
      '2026-01-03',
      '2026-01-04',
      '2026-01-05',
      '2026-01-06',
      '2026-01-07',
    ];
    for (const date of dates) {
      completeDailyPuzzle(date);
    }
    expect(useProfileStore.getState().daily.streak).toBe(7);
  });

  it('does not double count completing the same day twice', () => {
    const { completeDailyPuzzle } = useProfileStore.getState();
    completeDailyPuzzle('2026-01-01');
    const afterFirst = useProfileStore.getState();
    completeDailyPuzzle('2026-01-01');
    expect(useProfileStore.getState().daily.streak).toBe(afterFirst.daily.streak);
    expect(useProfileStore.getState().coins).toBe(afterFirst.coins);
  });

  it('persists across a simulated reload via localStorage', () => {
    useProfileStore.getState().spendCoins(HINT_COST);
    const saved = localStorage.getItem('tidewords:v1');
    expect(saved).toBeTruthy();
    expect(JSON.parse(saved!).state.coins).toBe(STARTING_COINS - HINT_COST);
  });

  it('resets to a fresh profile', () => {
    useProfileStore.getState().spendCoins(HINT_COST);
    useProfileStore.getState().resetProgress();
    expect(useProfileStore.getState().coins).toBe(STARTING_COINS);
  });
});
