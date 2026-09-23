/**
 * Pure helpers for the first-launch swipe guide (HANDOVER 10): "drop
 * straight into level 1 with a gentle animated hand showing one swipe.
 * Remove the hand after the first correct word."
 */

export interface FirstPlayProfile {
  completedLevelIds: readonly string[];
  levelProgress: Readonly<Record<string, unknown>>;
  bonusWordsFound: readonly string[];
}

/**
 * A genuine first play: nothing completed, no level in progress and no bonus
 * word ever found. Checked once when Play mounts, so a hint used before the
 * first word (which saves progress) doesn't remove the hand early.
 */
export function isFirstPlay(profile: FirstPlayProfile): boolean {
  return (
    profile.completedLevelIds.length === 0 &&
    Object.keys(profile.levelProgress).length === 0 &&
    profile.bonusWordsFound.length === 0
  );
}

/**
 * The wheel positions to visit, in order, to spell `word` on the current
 * (shuffled) wheel: each letter takes the first position with that letter
 * not already used. Null if the wheel can't spell it.
 */
export function wheelPathFor(word: string, wheelLetters: readonly string[]): number[] | null {
  const used = new Set<number>();
  const path: number[] = [];
  for (const letter of word.toUpperCase()) {
    const index = wheelLetters.findIndex((l, i) => l === letter && !used.has(i));
    if (index === -1) {
      return null;
    }
    used.add(index);
    path.push(index);
  }
  return path;
}

/**
 * The word the hand demonstrates: the shortest target word the wheel can
 * spell (one short swipe is the gentlest example), earliest in the level's
 * own order on a tie.
 */
export function pickGuideWord(
  targetWords: readonly string[],
  wheelLetters: readonly string[],
): string | null {
  let best: string | null = null;
  for (const word of targetWords) {
    if (wheelPathFor(word, wheelLetters) && (best === null || word.length < best.length)) {
      best = word;
    }
  }
  return best;
}
