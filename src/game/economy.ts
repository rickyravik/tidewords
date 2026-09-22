export const STARTING_COINS = 200;

export const LEVEL_COMPLETE_COINS = 10;
export const DAILY_COMPLETE_COINS = 50;
export const DAILY_STREAK_DAY_7_COINS = 100;

export const BONUS_JAR_SIZE = 10;
export const BONUS_JAR_COINS = 25;

export const HINT_COST = 25;
export const REVEAL_COST = 75;
export const SHUFFLE_COST = 0;

export function canAfford(coins: number, cost: number): boolean {
  return coins >= cost;
}

export interface JarResult {
  jarCount: number;
  coinsEarned: number;
}

/**
 * Adds one new bonus word to the jar. The jar fills and empties at
 * BONUS_JAR_SIZE, paying out BONUS_JAR_COINS each time it does.
 */
export function addToBonusJar(jarCount: number): JarResult {
  const filled = jarCount + 1;
  if (filled >= BONUS_JAR_SIZE) {
    return { jarCount: 0, coinsEarned: BONUS_JAR_COINS };
  }
  return { jarCount: filled, coinsEarned: 0 };
}

export function applyDailyStreak(streak: number): number {
  return streak > 0 && streak % 7 === 0 ? DAILY_STREAK_DAY_7_COINS : 0;
}
