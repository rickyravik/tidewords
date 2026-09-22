// Playwright-page-dependent helpers for driving the SVG wheel the same way
// HANDOVER.md section 15 describes: read the aria-labels the Wheel component
// renders ("Letter X, position N") to find each letter's hit circle, then
// drive a real pointer path with page.mouse. There is no existing e2e test
// to copy this pattern from — this file establishes it for future tests.
import { expect, type Page } from '@playwright/test';

const WHEEL_SELECTOR = 'svg[aria-label="Letter wheel"]';
const SAVE_KEY = 'tidewords:v1';

const DEFAULT_SETTINGS = {
  sound: true,
  music: false,
  haptics: true,
  reducedMotion: false,
  highContrast: false,
  dyslexiaFont: false,
  tapMode: false,
};

export interface SaveOverrides {
  currentLevelId: string;
}

/**
 * Seeds the profile store's localStorage save (see the `SaveData` shape in
 * HANDOVER.md section 11 / src/state/profileStore.ts) with a fresh profile
 * pointed at the given level. Call this once, right after the first
 * `page.goto`, then `page.reload()` to boot the app from it — do NOT use
 * `addInitScript` for this, since it would re-seed (and so wipe) progress on
 * every later reload, which breaks the "progress survives a reload" test.
 */
export async function seedSave(page: Page, overrides: SaveOverrides): Promise<void> {
  const save = {
    version: 1,
    coins: 200,
    currentLevelId: overrides.currentLevelId,
    completedLevelIds: [],
    levelProgress: {},
    bonusJarCount: 0,
    bonusWordsFound: [],
    daily: { lastCompletedDate: null, streak: 0 },
    settings: DEFAULT_SETTINGS,
  };
  await page.evaluate(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: SAVE_KEY, value: JSON.stringify({ state: save, version: 1 }) },
  );
}

/**
 * Waits until the profile store has actually persisted progress for
 * `levelId` to localStorage (the store saves after every found word — see
 * Play.tsx), so a subsequent reload has something real to restore.
 */
export async function waitForSavedProgress(page: Page, levelId: string): Promise<void> {
  await page.waitForFunction(
    ({ key, levelId: id }) => {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return false;
        const parsed = JSON.parse(raw) as {
          state?: { levelProgress?: Record<string, { foundWords?: string[] }> };
        };
        const found = parsed.state?.levelProgress?.[id]?.foundWords;
        return Array.isArray(found) && found.length > 0;
      } catch {
        return false;
      }
    },
    { key: SAVE_KEY, levelId },
  );
}

/**
 * Waits for the Play screen to have actually rendered (wheel + grid both
 * mount in the same render pass). Call this right after `page.reload()`
 * before reading ANY DOM state with a non-auto-waiting API (`evaluateAll`,
 * `allTextContents`, etc.) — the app loads all 5 chapter packs and shows
 * "Loading…" first, so there's a real gap between reload and Play appearing.
 * Locator actions/assertions (`.click()`, `expect(...).toHaveText()`, …)
 * already auto-wait and don't strictly need this, but it doesn't hurt.
 */
export async function waitForPlayScreen(page: Page): Promise<void> {
  await page.locator(WHEEL_SELECTOR).waitFor({ state: 'visible' });
}

/**
 * Reloading with any real progress (even just one found word, not just a
 * fresh/empty profile) now lands on Home, not Play directly — "skip Home"
 * only applies to a true first-ever launch (HANDOVER.md section 10), and
 * Home's own "Play level N" button is exactly how a returning player resumes.
 * Progress itself isn't lost either way; this just gets back to the wheel so
 * a test can assert on it, tapping Play if Home is what's showing.
 */
export async function ensureOnPlayScreen(page: Page): Promise<void> {
  const playButton = page.getByRole('button', { name: /^Play/ });
  const wheel = page.locator(WHEEL_SELECTOR);
  await expect(playButton.or(wheel)).toBeVisible();
  if (await playButton.isVisible()) {
    await playButton.click();
  }
  await waitForPlayScreen(page);
}

/**
 * The wheel's current (shuffled — see levelReducer's `initLevelState`)
 * letter order, read straight from the rendered aria-labels. List index i
 * corresponds to "position i + 1" in the Wheel component's own labelling.
 */
export async function readWheelLayout(page: Page): Promise<string[]> {
  // `evaluateAll` reads the DOM immediately with no auto-wait (unlike
  // locator actions/assertions), so make sure the wheel has actually
  // rendered first.
  await waitForPlayScreen(page);
  return page.locator(`${WHEEL_SELECTOR} g`).evaluateAll((nodes) =>
    nodes.map((node) => {
      const label = node.getAttribute('aria-label') ?? '';
      const match = /^Letter (.)/.exec(label);
      if (!match) {
        throw new Error(`Unexpected wheel letter aria-label: "${label}"`);
      }
      return match[1] as string;
    }),
  );
}

/** Greedily maps each character of `word` to an unused matching wheel index. */
export function wordToIndices(layout: string[], word: string): number[] {
  const used = new Array<boolean>(layout.length).fill(false);
  const indices: number[] = [];
  for (const ch of word.toUpperCase()) {
    const idx = layout.findIndex((letter, i) => letter === ch && !used[i]);
    if (idx === -1) {
      throw new Error(`Cannot form "${word}" from wheel [${layout.join('')}]`);
    }
    used[idx] = true;
    indices.push(idx);
  }
  return indices;
}

/** Centre point (page coordinates) of the wheel letter at DOM order `index`. */
export async function centreOfWheelLetter(
  page: Page,
  index: number,
): Promise<{ x: number; y: number }> {
  const circle = page.locator(`${WHEEL_SELECTOR} g`).nth(index).locator('circle');
  const box = await circle.boundingBox();
  if (!box) {
    throw new Error(`Wheel letter at index ${index} has no bounding box (not visible?)`);
  }
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Number of wheel letters currently marked selected (mid-swipe). */
export async function selectedLetterCount(page: Page): Promise<number> {
  return page.locator(`${WHEEL_SELECTOR} g[aria-label*=", selected"]`).count();
}

/** Swipes a full word across the wheel in one continuous pointer gesture. */
export async function swipeWord(page: Page, word: string): Promise<void> {
  const layout = await readWheelLayout(page);
  const indices = wordToIndices(layout, word);
  const centres: { x: number; y: number }[] = [];
  for (const index of indices) {
    centres.push(await centreOfWheelLetter(page, index));
  }
  const [first, ...rest] = centres;
  if (!first) {
    return;
  }
  await page.mouse.move(first.x, first.y);
  await page.mouse.down();
  for (const point of rest) {
    // No intermediate `steps`: the wheel's hit-testing is nearest-letter by
    // distance (see geometry.ts), and letters sit on a circle, so a
    // multi-step straight-line interpolation between two non-adjacent
    // letters can graze a third letter's hit circle and select it by
    // mistake. A single direct jump avoids that.
    await page.mouse.move(point.x, point.y);
  }
  await page.mouse.up();
}

/** Locator for the crossword grid's Nth (row-major) cell div. */
export function gridCell(page: Page, index: number) {
  return page.locator('[role="group"][aria-label^="Crossword grid"] > div').nth(index);
}

/**
 * Locator for the visible word-preview pill. Play.tsx also renders a
 * visually-hidden `aria-live="polite"` announcer div, so this can't just
 * match on `aria-live` alone; WordPreview.module.css's CSS-module class
 * always compiles to `_pill_<hash>`, which is what disambiguates the two.
 */
export function wordPreview(page: Page) {
  return page.locator('[aria-live="polite"][class*="_pill_"]');
}
