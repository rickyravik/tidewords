// Play screen sizing maths (HANDOVER 9.4). Pure functions, no DOM, so they
// can be unit tested; Play.tsx feeds them measured element sizes.

export interface Size {
  width: number;
  height: number;
}

/** Must match `gap` in Grid.module.css. */
export const GRID_GAP = 4;
/** Must match `.gridArea` padding in Play.module.css. */
export const GRID_AREA_PADDING = 8;
export const MAX_TILE_SIZE = 56;
/** Floor so a tile never collapses to nothing, even in a tiny window. */
export const MIN_TILE_SIZE = 12;

export const MAX_WHEEL_SIZE = 360;
/** Below this letters get cramped; at 6 letters the hit circles are still 55px across. */
export const MIN_WHEEL_SIZE = 140;
const PHONE_WHEEL_WIDTH_SHARE = 0.7;
/** Portrait: the wheel's minimum share of the height left for grid + wheel. */
const PORTRAIT_WHEEL_HEIGHT_SHARE = 0.45;
/** Landscape: the wheel column never takes more than this share of the width. */
const LANDSCAPE_WHEEL_WIDTH_SHARE = 0.4;

/**
 * Vertical space taken by everything except the grid and the wheel (top bar,
 * pill + jar row, helper buttons, wheel padding: about 185px), plus slack. In
 * landscape the slack also covers the Reveal hint line, which sits in the
 * wheel column there; in portrait the grid simply gives up that room.
 */
export const PORTRAIT_CHROME = 200;
export const LANDSCAPE_CHROME = 210;
/** Tap mode's tick/cross buttons under the wheel (48px + 12px gap). */
export const TAP_CONTROLS_HEIGHT = 60;

/** Grid on the left, wheel on the right (HANDOVER 9.4). */
export function isLandscape(screen: Size): boolean {
  return screen.width > screen.height;
}

/** Largest tile (capped at 56px) that fits a rows x cols grid inside `area`. */
export function fitTileSize(area: Size, rows: number, cols: number): number {
  const fitWidth = Math.floor((area.width - GRID_GAP * (cols - 1)) / cols);
  const fitHeight = Math.floor((area.height - GRID_GAP * (rows - 1)) / rows);
  return Math.max(MIN_TILE_SIZE, Math.min(MAX_TILE_SIZE, fitWidth, fitHeight));
}

/** Rendered height (or width) of `count` tiles plus the gaps between them. */
export function gridExtent(count: number, tileSize: number): number {
  return count * tileSize + GRID_GAP * (count - 1);
}

export interface WheelSizeOptions {
  rows: number;
  cols: number;
  /** Extra fixed-height UI under the wheel, e.g. tap-mode buttons. */
  extraChrome?: number;
}

/**
 * Wheel diameter for the Play screen's size (`screen` = the Play root).
 * About 70% of the width on phones, capped at 360px, and shrunk on short
 * screens so the grid keeps reasonable room. In portrait, a small grid that
 * doesn't need all its share hands the rest back to the wheel.
 */
export function wheelSize(screen: Size, { rows, cols, extraChrome = 0 }: WheelSizeOptions): number {
  if (isLandscape(screen)) {
    const heightLeft = screen.height - LANDSCAPE_CHROME - extraChrome;
    const size = Math.min(
      MAX_WHEEL_SIZE,
      screen.width * LANDSCAPE_WHEEL_WIDTH_SHARE,
      Math.max(MIN_WHEEL_SIZE, heightLeft),
    );
    return Math.floor(size);
  }

  const widthCap = Math.min(MAX_WHEEL_SIZE, screen.width * PHONE_WHEEL_WIDTH_SHARE);
  const heightLeft = screen.height - PORTRAIT_CHROME - extraChrome;
  // How tall the grid would be with tiles as big as the width allows.
  const gridWidth = screen.width - 2 * GRID_AREA_PADDING;
  const tileAtFullWidth = fitTileSize({ width: gridWidth, height: Infinity }, rows, cols);
  const gridNeed = gridExtent(rows, tileAtFullWidth) + 2 * GRID_AREA_PADDING;
  const size = Math.max(PORTRAIT_WHEEL_HEIGHT_SHARE * heightLeft, heightLeft - gridNeed);
  return Math.floor(Math.min(widthCap, Math.max(MIN_WHEEL_SIZE, size)));
}
