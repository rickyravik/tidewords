import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Settings } from './Settings';

const haptics = vi.hoisted(() => ({ supported: true }));

vi.mock('../../haptics/haptics', () => ({
  isHapticsSupported: () => haptics.supported,
}));

afterEach(() => {
  cleanup();
  haptics.supported = true;
});

describe('Settings', () => {
  it('shows the Haptics switch where the browser can vibrate', () => {
    render(<Settings />);
    expect(screen.getByText('Haptics')).toBeInTheDocument();
  });

  it('hides the Haptics switch where the browser cannot vibrate (iPhone)', () => {
    haptics.supported = false;
    render(<Settings />);
    expect(screen.queryByText('Haptics')).not.toBeInTheDocument();
    expect(screen.getByText('Sound')).toBeInTheDocument();
  });
});
