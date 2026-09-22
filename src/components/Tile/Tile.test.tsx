import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Tile } from './Tile';

describe('Tile', () => {
  it('shows nothing for an empty cell', () => {
    const { container } = render(<Tile letter={null} />);
    expect(container.textContent).toBe('');
    expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy();
  });

  it('shows the letter for a filled cell', () => {
    const { container } = render(<Tile letter="H" />);
    expect(container.textContent).toBe('H');
    expect(container.querySelector('[aria-hidden="false"]')).toBeTruthy();
  });
});
