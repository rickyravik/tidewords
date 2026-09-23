import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import chapter01 from '../../../public/levels/chapter-01.json';
import type { ChapterPack, Level } from '../../game/types';
import { Play } from '../../screens/Play/Play';
import { pickGuideWord } from './firstSwipe';
import { useProfileStore, type SaveData } from '../../state/profileStore';

const LEVEL_1 = (chapter01 as ChapterPack).levels[0] as Level;
const TARGETS = LEVEL_1.words.map((w) => w.word);
const GUIDE_WORD = pickGuideWord(TARGETS, LEVEL_1.letters)!;

/** A 3-letter string the wheel can spell that is neither a target nor a bonus word. */
function invalidWord(): string {
  const [a, b, c] = LEVEL_1.letters as [string, string, string];
  const known = new Set([...TARGETS, ...LEVEL_1.bonusWords]);
  const candidates = [a + b + c, a + c + b, b + a + c, b + c + a, c + a + b, c + b + a];
  const word = candidates.find((w) => !known.has(w));
  if (!word) throw new Error('No invalid word to test with');
  return word;
}

// hasSeenUiTour: true by default so the UI tour (which runs first on a
// genuine first play, see UiTour.test.tsx) doesn't mask the swipe guide here.
function seed(patch: Partial<SaveData> = {}, settings: Partial<SaveData['settings']> = {}) {
  useProfileStore.setState({
    hasSeenUiTour: true,
    ...patch,
    settings: { ...useProfileStore.getState().settings, sound: false, haptics: false, ...settings },
  });
}

function renderPlay(props: { dailyDate?: string } = {}) {
  return render(<Play level={LEVEL_1} levelNumber={1} onComplete={vi.fn()} {...props} />);
}

const guide = () => screen.queryByTestId('first-swipe-guide');

/** Types a word on the wheel via its keyboard control, then submits it. */
function typeWord(word: string) {
  for (const letter of word) {
    fireEvent.keyDown(window, { key: letter.toLowerCase() });
  }
  fireEvent.keyDown(window, { key: 'Enter' });
}

beforeEach(() => {
  localStorage.clear();
  useProfileStore.persist.clearStorage();
  useProfileStore.setState(useProfileStore.getInitialState(), true);
});

afterEach(() => {
  cleanup();
});

describe('FirstSwipeGuide on the Play screen', () => {
  it('shows on a genuine first play, hidden from assistive tech and taps', () => {
    seed();
    renderPlay();
    const overlay = guide();
    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveAttribute('aria-hidden', 'true');
    // Portalled out of the Play tree, so it can't sit on top of the wheel's hit area in the DOM.
    expect(overlay?.parentElement).toBe(document.body);
  });

  it('is removed after the first correct word', () => {
    seed();
    renderPlay();
    expect(guide()).toBeInTheDocument();
    typeWord(GUIDE_WORD);
    expect(guide()).not.toBeInTheDocument();
  });

  it('stays after an invalid word, and fades out while a word is being made', () => {
    seed();
    renderPlay();
    typeWord(invalidWord());
    expect(guide()).toBeInTheDocument();
    fireEvent.keyDown(window, { key: GUIDE_WORD[0]!.toLowerCase() });
    expect(guide()?.className).toMatch(/hidden/);
  });

  it('does not show for a returning player or on the daily puzzle', () => {
    seed({ completedLevelIds: ['c01-l001'] });
    const first = renderPlay();
    expect(guide()).not.toBeInTheDocument();
    first.unmount();

    useProfileStore.setState(useProfileStore.getInitialState(), true);
    seed({ levelProgress: { 'c01-l002': { foundWords: [TARGETS[0]!], revealedCells: [] } } });
    const second = renderPlay();
    expect(guide()).not.toBeInTheDocument();
    second.unmount();

    useProfileStore.setState(useProfileStore.getInitialState(), true);
    seed();
    renderPlay({ dailyDate: '2026-09-23' });
    expect(guide()).not.toBeInTheDocument();
  });

  it('shows numbered steps instead of movement under reduced motion', () => {
    seed({}, { reducedMotion: true });
    renderPlay();
    const steps = Array.from({ length: GUIDE_WORD.length }, (_, i) => i + 1).join('');
    expect(guide()?.textContent).toContain(steps);
  });

  it('draws the swipe route only when swiping, not in tap mode', () => {
    seed();
    const swipe = renderPlay();
    expect(guide()?.querySelector('polyline')).toBeInTheDocument();
    swipe.unmount();

    seed({}, { tapMode: true });
    renderPlay();
    expect(guide()).toBeInTheDocument();
    expect(guide()?.querySelector('polyline')).not.toBeInTheDocument();
  });
});
