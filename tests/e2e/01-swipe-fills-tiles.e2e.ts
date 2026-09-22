import { expect, test } from '@playwright/test';
import { cellIndex, firstLevel, letterCell, shortestTargetWord } from './fixtures';
import { gridCell, seedSave, swipeWord } from './wheel-helpers';

// HANDOVER.md section 15, scenario 1: "Swipe H A N D E D on the sample level
// and see the tiles fill." Chapter 1's content is generated and can change,
// so this swipes whichever target word chapter-01.json's first level
// actually has, rather than a hardcoded word.
test('swiping a target word fills its grid tiles', async ({ page }) => {
  const level = firstLevel();
  const target = shortestTargetWord(level);

  await page.goto('/');
  await seedSave(page, { currentLevelId: level.id });
  await page.reload();

  await expect(page.locator('svg[aria-label="Letter wheel"]')).toBeVisible();

  for (let i = 0; i < target.word.length; i++) {
    const { row, col } = letterCell(target, i);
    await expect(gridCell(page, cellIndex(level, row, col))).toHaveText('');
  }

  await swipeWord(page, target.word);

  for (let i = 0; i < target.word.length; i++) {
    const { row, col } = letterCell(target, i);
    await expect(gridCell(page, cellIndex(level, row, col))).toHaveText(target.word[i]!);
  }
});
