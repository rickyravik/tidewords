import { expect, test } from '@playwright/test';
import { firstLevel } from './fixtures';
import { seedSave, swipeWord } from './wheel-helpers';

// HANDOVER.md section 15, scenario 4: "Complete the sample level and land on
// the level complete screen." Swipes every one of the level's actual target
// words (rule 6: the level is complete once every grid cell is filled).
test('finding every target word lands on the level complete screen', async ({ page }) => {
  const level = firstLevel();

  await page.goto('/');
  await seedSave(page, { currentLevelId: level.id });
  await page.reload();

  for (const placed of level.words) {
    await swipeWord(page, placed.word);
  }

  // Players see one continuous level number (position across all chapters),
  // not the per-chapter `level.index`; the first level of chapter 1 is level 1.
  await expect(page.getByRole('heading', { name: 'Level 1 done' })).toBeVisible();
});
