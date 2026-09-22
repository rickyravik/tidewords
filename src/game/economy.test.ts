import { describe, expect, it } from 'vitest';
import {
  BONUS_JAR_COINS,
  BONUS_JAR_SIZE,
  HINT_COST,
  addToBonusJar,
  applyDailyStreak,
  canAfford,
} from './economy';

describe('canAfford', () => {
  it('is true when the balance covers the cost', () => {
    expect(canAfford(100, HINT_COST)).toBe(true);
  });

  it('is false when the balance falls short', () => {
    expect(canAfford(10, HINT_COST)).toBe(false);
  });
});

describe('addToBonusJar', () => {
  it('fills the jar by one with no payout below the threshold', () => {
    expect(addToBonusJar(0)).toEqual({ jarCount: 1, coinsEarned: 0 });
  });

  it('empties the jar and pays out when it reaches the threshold', () => {
    expect(addToBonusJar(BONUS_JAR_SIZE - 1)).toEqual({
      jarCount: 0,
      coinsEarned: BONUS_JAR_COINS,
    });
  });
});

describe('applyDailyStreak', () => {
  it('pays the day 7 bonus on multiples of 7', () => {
    expect(applyDailyStreak(7)).toBe(100);
    expect(applyDailyStreak(14)).toBe(100);
  });

  it('pays nothing on other days', () => {
    expect(applyDailyStreak(1)).toBe(0);
    expect(applyDailyStreak(0)).toBe(0);
  });
});
