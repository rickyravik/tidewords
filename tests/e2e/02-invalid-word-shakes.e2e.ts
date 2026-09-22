import { expect, test } from '@playwright/test';
import { firstLevel, invalidButFormableWord } from './fixtures';
import { seedSave, swipeWord, waitForPlayScreen, wordPreview } from './wheel-helpers';

// HANDOVER.md section 15, scenario 2: "Swipe an invalid word and see the
// shake, with no state change." `invalidButFormableWord` derives a word from
// whatever the level's actual wheel letters are, guaranteed not to match any
// of that level's real target/bonus words.
test('swiping an invalid word shakes the preview and changes nothing else', async ({ page }) => {
  const level = firstLevel();
  const invalidWord = invalidButFormableWord(level);

  await page.goto('/');
  await seedSave(page, { currentLevelId: level.id });
  await page.reload();
  await waitForPlayScreen(page);

  const gridBefore = await page.locator('[role="group"][aria-label^="Crossword grid"] > div').allTextContents();

  await swipeWord(page, invalidWord);

  // WordPreview (src/components/WordPreview/WordPreview.tsx) shows the
  // rejected word and swaps in its "invalid" shake variant class.
  const preview = wordPreview(page);
  await expect(preview).toHaveText(invalidWord);
  await expect(preview).toHaveClass(/invalid/);

  // No grid cell should have filled in as a result.
  const gridAfter = await page.locator('[role="group"][aria-label^="Crossword grid"] > div').allTextContents();
  expect(gridAfter).toEqual(gridBefore);

  // Coins and progress are untouched.
  const coins = await page.locator('[aria-label$=" coins"]').textContent();
  expect(coins?.trim()).toBe('200');
});
