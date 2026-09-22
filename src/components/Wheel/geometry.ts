export interface Point {
  x: number;
  y: number;
}

/**
 * Positions for `count` letters evenly spaced on a circle of `radius`
 * centred at (0,0), starting at the top and going clockwise.
 */
export function letterPositions(count: number, radius: number): Point[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
  });
}

/** Straight-line distance between adjacent letters on the wheel. */
export function gapBetweenLetters(count: number, radius: number): number {
  if (count < 2) {
    return radius;
  }
  return 2 * radius * Math.sin(Math.PI / count);
}

/** The hit radius for a letter: forgiving enough that fast swipes don't miss. */
export function hitRadius(count: number, radius: number): number {
  return 0.6 * gapBetweenLetters(count, radius);
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** The index of the closest letter to `point`, or -1 if none is within reach. */
export function nearestIndex(point: Point, positions: Point[], maxDistance: number): number {
  let best = -1;
  let bestDistance = Infinity;
  positions.forEach((pos, i) => {
    const d = distance(point, pos);
    if (d <= maxDistance && d < bestDistance) {
      best = i;
      bestDistance = d;
    }
  });
  return best;
}
