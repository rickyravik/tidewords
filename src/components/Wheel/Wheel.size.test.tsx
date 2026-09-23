import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Wheel } from './Wheel';

const LETTERS = ['D', 'N', 'H', 'D', 'A', 'E'];

function letterRadius(size: number): number {
  const { container } = render(
    <Wheel letters={LETTERS} selection={[]} onSelect={vi.fn()} onSubmit={vi.fn()} size={size} />,
  );
  return Number(container.querySelector('circle')!.getAttribute('r'));
}

describe('Wheel size', () => {
  it('keeps full-size letters on a large wheel', () => {
    expect(letterRadius(300)).toBe(32);
    expect(letterRadius(360)).toBe(32);
  });

  it('spends a small wheel on its letters rather than a fixed edge margin', () => {
    // With the old fixed 40px margin a 160px wheel had 16px letters.
    const r = letterRadius(160);
    expect(r).toBeGreaterThan(20);
    expect(r).toBeLessThan(32);
  });

  it('sizes the svg to the requested diameter', () => {
    const { container } = render(
      <Wheel letters={LETTERS} selection={[]} onSelect={vi.fn()} onSubmit={vi.fn()} size={180} />,
    );
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('width')).toBe('180');
    expect(svg.getAttribute('viewBox')).toBe('0 0 180 180');
  });
});
