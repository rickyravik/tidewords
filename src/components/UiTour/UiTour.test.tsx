import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import chapter01 from '../../../public/levels/chapter-01.json';
import type { ChapterPack, Level } from '../../game/types';
import { Play } from '../../screens/Play/Play';
import { useProfileStore, type SaveData } from '../../state/profileStore';
import { UI_TOUR_STEPS } from './steps';

const LEVEL_1 = (chapter01 as ChapterPack).levels[0] as Level;

function seed(patch: Partial<SaveData> = {}, settings: Partial<SaveData['settings']> = {}) {
  useProfileStore.setState({
    ...patch,
    settings: { ...useProfileStore.getState().settings, sound: false, haptics: false, ...settings },
  });
}

function renderPlay(props: { dailyDate?: string } = {}) {
  return render(<Play level={LEVEL_1} levelNumber={1} onComplete={vi.fn()} {...props} />);
}

const tour = () => screen.queryByTestId('ui-tour');

beforeEach(() => {
  localStorage.clear();
  useProfileStore.persist.clearStorage();
  useProfileStore.setState(useProfileStore.getInitialState(), true);
});

afterEach(() => {
  cleanup();
});

describe('UiTour on the Play screen', () => {
  it('shows on a genuine first play, portalled to the body', () => {
    seed();
    renderPlay();
    const overlay = tour();
    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveAttribute('role', 'dialog');
    expect(overlay?.parentElement).toBe(document.body);
  });

  it('does not show once hasSeenUiTour is set, or on the daily puzzle', () => {
    seed({ hasSeenUiTour: true });
    const first = renderPlay();
    expect(tour()).not.toBeInTheDocument();
    first.unmount();

    useProfileStore.setState(useProfileStore.getInitialState(), true);
    seed();
    renderPlay({ dailyDate: '2026-09-23' });
    expect(tour()).not.toBeInTheDocument();
  });

  it('steps through every target and marks itself seen when finished', () => {
    seed();
    renderPlay();
    expect(useProfileStore.getState().hasSeenUiTour).toBe(false);

    for (let i = 0; i < UI_TOUR_STEPS.length; i++) {
      expect(tour()).toBeInTheDocument();
      fireEvent.click(tour()!);
    }

    expect(tour()).not.toBeInTheDocument();
    expect(useProfileStore.getState().hasSeenUiTour).toBe(true);
  });

  it('skips immediately and marks itself seen', () => {
    seed();
    renderPlay();
    fireEvent.click(screen.getByText('Skip'));
    expect(tour()).not.toBeInTheDocument();
    expect(useProfileStore.getState().hasSeenUiTour).toBe(true);
  });

  it('blocks the swipe guide until it is dismissed', () => {
    seed();
    renderPlay();
    expect(screen.queryByTestId('first-swipe-guide')).not.toBeInTheDocument();
    for (let i = 0; i < UI_TOUR_STEPS.length; i++) {
      fireEvent.click(tour()!);
    }
    expect(screen.queryByTestId('first-swipe-guide')).toBeInTheDocument();
  });
});
