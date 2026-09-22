import { fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Wheel } from './Wheel';
import { letterPositions } from './geometry';

const SIZE = 300;
const LETTERS = ['D', 'N', 'H', 'D', 'A', 'E'];

function clientPointFor(index: number) {
  const center = SIZE / 2;
  const wheelRadius = center - 40;
  const pos = letterPositions(LETTERS.length, wheelRadius)[index]!;
  return { clientX: pos.x + center, clientY: pos.y + center };
}

beforeEach(() => {
  // jsdom has no layout engine, so pin the SVG's rect to match `size`.
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    width: SIZE,
    height: SIZE,
    right: SIZE,
    bottom: SIZE,
    x: 0,
    y: 0,
    toJSON: () => '',
  });
  // jsdom does not implement the Pointer Events capture API.
  Object.assign(SVGElement.prototype, {
    setPointerCapture: vi.fn(),
    releasePointerCapture: vi.fn(),
    hasPointerCapture: vi.fn(() => false),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Wheel', () => {
  it('selects the letter under a pointerdown', () => {
    const onSelect = vi.fn();
    const { container } = render(
      <Wheel letters={LETTERS} selection={[]} onSelect={onSelect} onSubmit={vi.fn()} size={SIZE} />,
    );
    const svg = container.querySelector('svg')!;
    const point = clientPointFor(2);

    fireEvent(
      svg,
      new window.PointerEvent('pointerdown', { pointerId: 1, bubbles: true, ...point }),
    );

    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it('does not select anything when the pointer is far from every letter', () => {
    const onSelect = vi.fn();
    const { container } = render(
      <Wheel letters={LETTERS} selection={[]} onSelect={onSelect} onSubmit={vi.fn()} size={SIZE} />,
    );
    const svg = container.querySelector('svg')!;

    fireEvent(
      svg,
      new window.PointerEvent('pointerdown', {
        pointerId: 1,
        bubbles: true,
        clientX: SIZE / 2,
        clientY: SIZE / 2,
      }),
    );

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('selects each letter it moves over, then submits on release', () => {
    const onSelect = vi.fn();
    const onSubmit = vi.fn();
    const { container } = render(
      <Wheel
        letters={LETTERS}
        selection={[]}
        onSelect={onSelect}
        onSubmit={onSubmit}
        size={SIZE}
      />,
    );
    const svg = container.querySelector('svg')!;

    fireEvent(
      svg,
      new window.PointerEvent('pointerdown', { pointerId: 1, bubbles: true, ...clientPointFor(0) }),
    );
    fireEvent(
      svg,
      new window.PointerEvent('pointermove', { pointerId: 1, bubbles: true, ...clientPointFor(1) }),
    );
    fireEvent(svg, new window.PointerEvent('pointerup', { pointerId: 1, bubbles: true }));

    expect(onSelect.mock.calls.map((c) => c[0])).toEqual([0, 1]);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('renders every letter with an accessible label', () => {
    const { container } = render(
      <Wheel letters={LETTERS} selection={[]} onSelect={vi.fn()} onSubmit={vi.fn()} size={SIZE} />,
    );
    const groups = container.querySelectorAll('g[aria-label]');
    expect(groups).toHaveLength(LETTERS.length);
    expect(groups[2]?.getAttribute('aria-label')).toContain('Letter H');
  });
});
