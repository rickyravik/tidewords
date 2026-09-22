import { describe, expect, it } from 'vitest';
import { gapBetweenLetters, hitRadius, letterPositions, nearestIndex } from './geometry';

describe('letterPositions', () => {
  it('places the first letter at the top of the circle', () => {
    const [first] = letterPositions(6, 100);
    expect(first!.x).toBeCloseTo(0);
    expect(first!.y).toBeCloseTo(-100);
  });

  it('spaces letters evenly around the circle', () => {
    const positions = letterPositions(4, 100);
    expect(positions).toHaveLength(4);
    // Opposite corners of a square inscribed in the circle.
    expect(positions[2]!.x).toBeCloseTo(0);
    expect(positions[2]!.y).toBeCloseTo(100);
  });
});

describe('gapBetweenLetters and hitRadius', () => {
  it('grows the gap as letter count shrinks for a fixed radius', () => {
    const gap3 = gapBetweenLetters(3, 100);
    const gap7 = gapBetweenLetters(7, 100);
    expect(gap3).toBeGreaterThan(gap7);
  });

  it('sets the hit radius to 60% of the gap between letters', () => {
    const gap = gapBetweenLetters(6, 100);
    expect(hitRadius(6, 100)).toBeCloseTo(gap * 0.6);
  });
});

describe('nearestIndex', () => {
  const positions = letterPositions(6, 100);

  it('finds the closest letter within range', () => {
    const target = positions[2]!;
    expect(nearestIndex({ x: target.x + 1, y: target.y }, positions, 50)).toBe(2);
  });

  it('returns -1 when nothing is within range', () => {
    expect(nearestIndex({ x: 0, y: 0 }, positions, 1)).toBe(-1);
  });
});
