import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WordPreview } from './WordPreview';

describe('WordPreview', () => {
  it('shows the word being built', () => {
    const { getByText } = render(<WordPreview word="HAND" />);
    expect(getByText('HAND')).toBeInTheDocument();
  });

  it('renders a non-breaking space placeholder when empty, not a blank pill', () => {
    const { container } = render(<WordPreview word="" />);
    expect(container.textContent).toBe(' ');
  });
});
