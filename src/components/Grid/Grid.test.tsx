import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { buildGrid } from '../../game/grid';
import { SAMPLE_LEVEL } from '../../game/sampleLevel';
import { Grid } from './Grid';

describe('Grid', () => {
  const grid = buildGrid(SAMPLE_LEVEL);

  it('shows a found word’s letters and hides everything else', () => {
    const { container } = render(
      <Grid
        level={SAMPLE_LEVEL}
        grid={grid}
        foundWords={new Set(['HAD'])}
        revealedCells={new Set()}
      />,
    );
    const filled = container.querySelectorAll('[aria-hidden="false"]');
    expect(filled).toHaveLength(3); // H, A, D
    expect([...filled].map((el) => el.textContent)).toEqual(['H', 'A', 'D']);
  });

  it('shows a revealed cell even if its word was never found', () => {
    const { container } = render(
      <Grid
        level={SAMPLE_LEVEL}
        grid={grid}
        foundWords={new Set()}
        revealedCells={new Set(['2,0'])}
      />,
    );
    const filled = container.querySelectorAll('[aria-hidden="false"]');
    expect(filled).toHaveLength(1);
    expect(filled[0]?.textContent).toBe('H');
  });

  it('renders no tile at all for cells outside every placed word', () => {
    const { container } = render(
      <Grid level={SAMPLE_LEVEL} grid={grid} foundWords={new Set()} revealedCells={new Set()} />,
    );
    // (0,0) is outside every word in the sample level.
    const cellAt00 = container.querySelector('[style*="grid-row: 1"][style*="grid-column: 1"]');
    expect(cellAt00?.children).toHaveLength(0);
  });
});
