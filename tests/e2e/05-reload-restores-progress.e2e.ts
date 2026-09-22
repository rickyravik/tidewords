import { expect, test } from '@playwright/test';
import { cellIndex, firstLevel, letterCell, shortestTargetWord } from './fixtures';
import {
  ensureOnPlayScreen,
  gridCell,
  seedSave,
  swipeWord,
  waitForSavedProgress,
} from './wheel-helpers';

// HANDOVER.md section 15, scenario 5: "Reload mid level and find progress
// restored." Progress is saved to localStorage after every found word (see
// Play.tsx's saveLevelProgress effect) and restored via initLevelState. Once
// there's real progress, a reload now lands on Home rather than Play (see
// ensureOnPlayScreen) — the point of this test is that the progress itself
// isn't lost, not that the app must skip Home on every reload.
test('progress survives a reload', async ({ page }) => {
  const level = firstLevel();
  const target = shortestTargetWord(level);
  const firstLetterCell = letterCell(target, 0);
  const cell = gridCell(page, cellIndex(level, firstLetterCell.row, firstLetterCell.col));

  await page.goto('/');
  await seedSave(page, { currentLevelId: level.id });
  await page.reload();

  await swipeWord(page, target.word);
  await expect(cell).toHaveText(target.word[0]!);

  // Make sure the find was actually persisted before reloading (the store
  // writes to localStorage from a React effect, not synchronously on submit).
  await waitForSavedProgress(page, level.id);

  await page.reload();
  await ensureOnPlayScreen(page);

  // No re-swiping: the tile should already show its letter, restored from
  // the saved level progress rather than the (now fresh) reducer state.
  await expect(cell).toHaveText(target.word[0]!);
});
