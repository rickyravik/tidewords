import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Wheel } from './Wheel';
import { letterPositions } from './geometry';

// Covers Section 8's accessibility input paths: tap mode (tap-to-select plus
// tick/cross buttons) and keyboard control (letters, Enter, Backspace,
// Space). The existing pointer-swipe tests in Wheel.test.tsx are untouched.

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
  // This project's Vitest config has no global testing-library setup, so
  // (unlike the existing Wheel.test.tsx, which only ever queries its own
  // `container`) explicit cleanup is needed here between the getByLabelText
  // assertions below, which query the whole document by default.
  cleanup();
  vi.restoreAllMocks();
});

describe('Wheel tap mode', () => {
  it('selects a letter on a single tap without requiring a drag or auto-submitting', () => {
    const onSelect = vi.fn();
    const onSubmit = vi.fn();
    const { container } = render(
      <Wheel
        letters={LETTERS}
        selection={[]}
        onSelect={onSelect}
        onSubmit={onSubmit}
        size={SIZE}
        tapMode
      />,
    );
    const svg = container.querySelector('svg')!;
    const point = clientPointFor(2);

    fireEvent(svg, new window.PointerEvent('pointerdown', { pointerId: 1, bubbles: true, ...point }));
    fireEvent(svg, new window.PointerEvent('pointerup', { pointerId: 1, bubbles: true }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(2);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('renders a tick and cross button that call onSubmit and onClear', () => {
    const onSubmit = vi.fn();
    const onClear = vi.fn();
    const { getByLabelText } = render(
      <Wheel
        letters={LETTERS}
        selection={[0, 1]}
        onSelect={vi.fn()}
        onSubmit={onSubmit}
        onClear={onClear}
        size={SIZE}
        tapMode
      />,
    );

    fireEvent.click(getByLabelText('Submit word'));
    fireEvent.click(getByLabelText('Clear selection'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('disables the tick and cross buttons when nothing is selected', () => {
    const { getByLabelText } = render(
      <Wheel letters={LETTERS} selection={[]} onSelect={vi.fn()} onSubmit={vi.fn()} size={SIZE} tapMode />,
    );

    expect(getByLabelText('Submit word')).toBeDisabled();
    expect(getByLabelText('Clear selection')).toBeDisabled();
  });

  it('does not render tap controls when tapMode is off', () => {
    const { queryByLabelText } = render(
      <Wheel letters={LETTERS} selection={[]} onSelect={vi.fn()} onSubmit={vi.fn()} size={SIZE} />,
    );

    expect(queryByLabelText('Submit word')).toBeNull();
    expect(queryByLabelText('Clear selection')).toBeNull();
  });
});

describe('Wheel keyboard control', () => {
  it('typing a letter selects the first unused matching wheel position', () => {
    const onSelect = vi.fn();
    render(
      <Wheel letters={LETTERS} selection={[0]} onSelect={onSelect} onSubmit={vi.fn()} size={SIZE} />,
    );

    // LETTERS[0] and LETTERS[3] are both "D"; index 0 is already selected.
    fireEvent.keyDown(window, { key: 'd' });

    expect(onSelect).toHaveBeenCalledWith(3);
  });

  it('ignores a letter with no remaining unused position', () => {
    const onSelect = vi.fn();
    render(
      <Wheel letters={LETTERS} selection={[]} onSelect={onSelect} onSubmit={vi.fn()} size={SIZE} />,
    );

    fireEvent.keyDown(window, { key: 'z' });

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('Enter submits the current selection', () => {
    const onSubmit = vi.fn();
    render(
      <Wheel letters={LETTERS} selection={[0, 1]} onSelect={vi.fn()} onSubmit={onSubmit} size={SIZE} />,
    );

    fireEvent.keyDown(window, { key: 'Enter' });

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('Backspace with two or more letters selects the second-to-last position (reducer backtracking)', () => {
    const onSelect = vi.fn();
    render(
      <Wheel letters={LETTERS} selection={[0, 1, 2]} onSelect={onSelect} onSubmit={vi.fn()} size={SIZE} />,
    );

    fireEvent.keyDown(window, { key: 'Backspace' });

    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('Backspace with exactly one letter selected falls back to onClear', () => {
    const onSelect = vi.fn();
    const onClear = vi.fn();
    render(
      <Wheel
        letters={LETTERS}
        selection={[0]}
        onSelect={onSelect}
        onSubmit={vi.fn()}
        onClear={onClear}
        size={SIZE}
      />,
    );

    fireEvent.keyDown(window, { key: 'Backspace' });

    expect(onSelect).not.toHaveBeenCalled();
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('Space triggers onShuffle', () => {
    const onShuffle = vi.fn();
    render(
      <Wheel
        letters={LETTERS}
        selection={[]}
        onSelect={vi.fn()}
        onSubmit={vi.fn()}
        onShuffle={onShuffle}
        size={SIZE}
      />,
    );

    fireEvent.keyDown(window, { key: ' ', code: 'Space' });

    expect(onShuffle).toHaveBeenCalledTimes(1);
  });
});
