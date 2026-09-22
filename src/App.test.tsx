import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import chapter01 from '../public/levels/chapter-01.json';
import { useProfileStore } from './state/profileStore';

beforeEach(() => {
  localStorage.clear();
  useProfileStore.persist.clearStorage();
  useProfileStore.setState(useProfileStore.getInitialState(), true);
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(chapter01), { status: 200 })),
  );
});

describe('App', () => {
  it('loads chapter one and plays straight into level 1', async () => {
    render(<App />);
    expect(await screen.findByText('Level 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Letter wheel')).toBeInTheDocument();
  });

  it('shows an error if the level file fails to load', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('nope', { status: 500, statusText: 'Server Error' })),
    );
    render(<App />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });
});
