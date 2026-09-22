import { expect, test } from '@playwright/test';
import { firstLevel, shortestTargetWord } from './fixtures';
import {
  centreOfWheelLetter,
  readWheelLayout,
  seedSave,
  selectedLetterCount,
  wordToIndices,
} from './wheel-helpers';

// HANDOVER.md section 15, scenario 3: "Backtracking during a swipe removes
// the last letter." Per section 8: re-entering the second-to-last selected
// letter mid-swipe drops the last one (see `selectIndex` in levelReducer.ts).
test('re-entering the second-to-last letter removes the last selection', async ({ page }) => {
  const level = firstLevel();
  // Game rule: target words are always 3+ letters, so every level has at
  // least one word with a first-3-letters path to swipe and backtrack on.
  const target = shortestTargetWord(level);

  await page.goto('/');
  await seedSave(page, { currentLevelId: level.id });
  await page.reload();

  const layout = await readWheelLayout(page);
  const path = wordToIndices(layout, target.word).slice(0, 3);
  const [first, second, third] = await Promise.all(path.map((i) => centreOfWheelLetter(page, i)));

  // No intermediate `steps`: see the comment in wheel-helpers.ts's swipeWord
  // — a straight-line interpolation between non-adjacent letters on the
  // circular wheel can graze and select an unintended third letter.
  await page.mouse.move(first!.x, first!.y);
  await page.mouse.down();
  await page.mouse.move(second!.x, second!.y);
  await page.mouse.move(third!.x, third!.y);
  await expect.poll(() => selectedLetterCount(page)).toBe(3);

  // Re-enter the second letter (now second-to-last) to backtrack off the third.
  await page.mouse.move(second!.x, second!.y);
  await expect.poll(() => selectedLetterCount(page)).toBe(2);

  await page.mouse.up();
});
