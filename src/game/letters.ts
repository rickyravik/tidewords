/** Counts how many of each letter appear, e.g. ["D","N","D"] -> {D: 2, N: 1}. */
export function letterCounts(letters: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const letter of letters) {
    const upper = letter.toUpperCase();
    counts[upper] = (counts[upper] ?? 0) + 1;
  }
  return counts;
}

/**
 * True if `word` can be spelt using the wheel letters, respecting how many of
 * each letter the wheel actually has (a word needing three Ds fails against a
 * wheel with only two).
 */
export function canForm(word: string, wheelLetters: string[]): boolean {
  const available = letterCounts(wheelLetters);
  const needed = letterCounts(word.split(''));

  for (const letter of Object.keys(needed)) {
    if ((available[letter] ?? 0) < (needed[letter] ?? 0)) {
      return false;
    }
  }
  return true;
}
