import { describe, expect, it } from 'vitest';
import {
  fitTileSize,
  gridExtent,
  isLandscape,
  MAX_TILE_SIZE,
  MAX_WHEEL_SIZE,
  MIN_TILE_SIZE,
  MIN_WHEEL_SIZE,
  PORTRAIT_CHROME,
  wheelSize,
} from './layout';

describe('fitTileSize', () => {
  it('caps tiles at 56px when there is plenty of room', () => {
    expect(fitTileSize({ width: 1000, height: 1000 }, 5, 5)).toBe(MAX_TILE_SIZE);
  });

  it('fits the width, accounting for the 4px gaps', () => {
    // 8 tiles + 7 gaps of 4px = 8t + 28 <= 300  ->  t = 34
    expect(fitTileSize({ width: 300, height: 1000 }, 8, 8)).toBe(34);
  });

  it('fits the height too, not just the width', () => {
    // 8t + 28 <= 200  ->  t = 21
    expect(fitTileSize({ width: 1000, height: 200 }, 8, 8)).toBe(21);
  });

  it('uses rows for height and cols for width', () => {
    // 3 rows in 200px would allow 64 (capped 56), 7 cols in 300px allow 39.
    expect(fitTileSize({ width: 300, height: 200 }, 3, 7)).toBe(39);
  });

  it('never returns less than the minimum tile size', () => {
    expect(fitTileSize({ width: 0, height: 0 }, 8, 8)).toBe(MIN_TILE_SIZE);
  });

  it('always yields a grid that fits the area it was given', () => {
    for (const [w, h] of [
      [304, 211],
      [359, 262],
      [374, 390],
      [520, 326],
    ] as const) {
      for (const [rows, cols] of [
        [8, 8],
        [7, 6],
        [3, 7],
      ] as const) {
        const tile = fitTileSize({ width: w, height: h }, rows, cols);
        expect(gridExtent(cols, tile)).toBeLessThanOrEqual(w);
        expect(gridExtent(rows, tile)).toBeLessThanOrEqual(h);
      }
    }
  });
});

describe('isLandscape', () => {
  it('is true only when wider than tall', () => {
    expect(isLandscape({ width: 844, height: 390 })).toBe(true);
    expect(isLandscape({ width: 390, height: 844 })).toBe(false);
    expect(isLandscape({ width: 500, height: 500 })).toBe(false);
  });
});

describe('wheelSize', () => {
  const big = { rows: 8, cols: 8 };
  const small = { rows: 3, cols: 7 };

  it('is about 70% of the width on a tall phone', () => {
    expect(wheelSize({ width: 390, height: 844 }, big)).toBe(273);
    expect(wheelSize({ width: 430, height: 932 }, big)).toBe(301);
  });

  it('never exceeds 360px, however big the screen', () => {
    expect(wheelSize({ width: 1024, height: 1366 }, big)).toBe(MAX_WHEEL_SIZE);
    expect(wheelSize({ width: 1920, height: 1080 }, big)).toBe(MAX_WHEEL_SIZE);
  });

  it('shrinks on short phones so the grid keeps room', () => {
    const size = wheelSize({ width: 320, height: 568 }, big);
    expect(size).toBeLessThan(0.7 * 320);
    expect(size).toBeGreaterThanOrEqual(MIN_WHEEL_SIZE);
    // The grid still gets more than half of what's left.
    expect(568 - PORTRAIT_CHROME - size).toBeGreaterThan(size);
  });

  it('gives a small grid’s unused room back to the wheel', () => {
    const screen = { width: 375, height: 667 };
    expect(wheelSize(screen, small)).toBeGreaterThan(wheelSize(screen, big));
    expect(wheelSize(screen, small)).toBeLessThanOrEqual(0.7 * 375);
  });

  it('fits the wheel column height in landscape', () => {
    const size = wheelSize({ width: 844, height: 390 }, big);
    expect(size).toBeGreaterThanOrEqual(MIN_WHEEL_SIZE);
    expect(size).toBeLessThan(390 - 150);
  });

  it('makes room for extra chrome such as tap-mode buttons', () => {
    const screen = { width: 375, height: 667 };
    expect(wheelSize(screen, { ...big, extraChrome: 60 })).toBeLessThan(wheelSize(screen, big));
  });

  it('never goes below the minimum usable size', () => {
    expect(wheelSize({ width: 320, height: 400 }, big)).toBe(MIN_WHEEL_SIZE);
    expect(wheelSize({ width: 700, height: 300 }, big)).toBe(MIN_WHEEL_SIZE);
  });
});
