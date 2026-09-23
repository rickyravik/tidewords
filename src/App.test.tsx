import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import chapter01 from '../public/levels/chapter-01.json';
import chapter02 from '../public/levels/chapter-02.json';
import chapter03 from '../public/levels/chapter-03.json';
import chapter04 from '../public/levels/chapter-04.json';
import chapter05 from '../public/levels/chapter-05.json';
import dictionaryFile from '../public/dictionary.json';
import { pickDailyLevelId, todayDateString } from './game/daily';
import { resetDictionaryCache } from './game/dictionary';
import { DAILY_COMPLETE_COINS, LEVEL_COMPLETE_COINS, STARTING_COINS } from './game/economy';
import type { ChapterPack, Level, PlacedWord } from './game/types';
import { type SaveData, useProfileStore } from './state/profileStore';

const CHAPTERS = [chapter01, chapter02, chapter03, chapter04, chapter05] as ChapterPack[];
const ALL_LEVELS: Level[] = CHAPTERS.flatMap((chapter) => chapter.levels);

function levelById(id: string): Level {
  const level = ALL_LEVELS.find((l) => l.id === id);
  if (!level) throw new Error(`No level ${id}`);
  return level;
}

function wordCells(word: PlacedWord): string[] {
  return Array.from({ length: word.word.length }, (_, i) =>
    word.dir === 'across' ? `${word.row},${word.col + i}` : `${word.row + i},${word.col}`,
  );
}

/**
 * Splits a level into "already found" words plus one final word that still
 * has a cell of its own, so finding that final word is what completes it.
 */
function allButOneWord(level: Level): { found: string[]; last: string } {
  for (const candidate of level.words) {
    const others = level.words.filter((w) => w !== candidate);
    const covered = new Set(others.flatMap(wordCells));
    if (wordCells(candidate).some((cell) => !covered.has(cell))) {
      return { found: others.map((w) => w.word), last: candidate.word };
    }
  }
  throw new Error(`Level ${level.id} has no word with an uncrossed cell`);
}

/** Types a word on the wheel via its keyboard control, then submits it. */
function typeWord(word: string) {
  for (const letter of word) {
    fireEvent.keyDown(window, { key: letter.toLowerCase() });
  }
  fireEvent.keyDown(window, { key: 'Enter' });
}

/** Seeds the profile store. Reduced motion skips the tile-flip hand-off delay. */
function seed(patch: Partial<SaveData>) {
  useProfileStore.setState({
    ...patch,
    settings: { ...useProfileStore.getState().settings, reducedMotion: true },
  });
}

beforeEach(() => {
  localStorage.clear();
  useProfileStore.persist.clearStorage();
  useProfileStore.setState(useProfileStore.getInitialState(), true);
  resetDictionaryCache();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (String(url).endsWith('/dictionary.json')) {
        return new Response(JSON.stringify(dictionaryFile), { status: 200 });
      }
      const match = /chapter-(\d+)\.json$/.exec(String(url));
      const pack = match ? CHAPTERS[Number(match[1]) - 1] : undefined;
      return pack
        ? new Response(JSON.stringify(pack), { status: 200 })
        : new Response('missing', { status: 404, statusText: 'Not Found' });
    }),
  );
});

afterEach(() => {
  cleanup();
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

describe('App level numbering', () => {
  it('numbers levels continuously across chapters on Home, Play and Level complete', async () => {
    const level = levelById('c02-l001');
    const { found, last } = allButOneWord(level);
    seed({
      currentLevelId: level.id,
      completedLevelIds: CHAPTERS[0]!.levels.map((l) => l.id),
      levelProgress: { [level.id]: { foundWords: found, revealedCells: [] } },
    });
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Play level 21' }));
    expect(screen.getByText('Level 21')).toBeInTheDocument();

    typeWord(last);
    expect(await screen.findByRole('heading', { name: 'Level 21 done' })).toBeInTheDocument();
    expect(useProfileStore.getState().coins).toBe(STARTING_COINS + LEVEL_COMPLETE_COINS);

    fireEvent.click(screen.getByRole('button', { name: 'Next level' }));
    expect(screen.getByText('Level 22')).toBeInTheDocument();
    expect(useProfileStore.getState().currentLevelId).toBe('c02-l002');
  });
});

describe('App daily puzzle', () => {
  const pool = ALL_LEVELS.map((l) => l.id);
  const completedBefore = ['c01-l001', 'c01-l002', 'c01-l003', 'c01-l004'];

  async function openDailyAsLevel5Player(patch: Partial<SaveData> = {}) {
    seed({ currentLevelId: 'c01-l005', completedLevelIds: completedBefore, ...patch });
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /^Daily puzzle/ }));
  }

  it('saves mid-daily progress apart from normal level progress', async () => {
    const today = todayDateString();
    const dailyLevel = levelById(pickDailyLevelId(today, pool)!);
    await openDailyAsLevel5Player();

    fireEvent.click(await screen.findByRole('button', { name: "Play today's puzzle" }));
    expect(screen.getByText('Daily puzzle')).toBeInTheDocument();
    const firstWord = dailyLevel.words[0]!.word;
    typeWord(firstWord);

    await waitFor(() =>
      expect(useProfileStore.getState().dailyProgress?.progress.foundWords).toContain(firstWord),
    );
    const state = useProfileStore.getState();
    expect(state.dailyProgress).toMatchObject({ date: today, levelId: dailyLevel.id });
    expect(state.levelProgress).toEqual({});
    expect(state.currentLevelId).toBe('c01-l005');
  });

  it('finishing the daily pays only the daily reward and never moves progression', async () => {
    const today = todayDateString();
    const dailyLevel = levelById(pickDailyLevelId(today, pool)!);
    const { found, last } = allButOneWord(dailyLevel);
    await openDailyAsLevel5Player({
      dailyProgress: {
        date: today,
        levelId: dailyLevel.id,
        progress: { foundWords: found, revealedCells: [] },
      },
    });

    fireEvent.click(await screen.findByRole('button', { name: "Continue today's puzzle" }));
    typeWord(last);

    expect(await screen.findByRole('heading', { name: 'Daily puzzle done' })).toBeInTheDocument();
    expect(screen.getByText('1 day streak')).toBeInTheDocument();
    expect(screen.getByText(`+${DAILY_COMPLETE_COINS} coins`)).toBeInTheDocument();

    const state = useProfileStore.getState();
    expect(state.currentLevelId).toBe('c01-l005');
    expect(state.completedLevelIds).toEqual(completedBefore);
    expect(state.levelProgress).toEqual({});
    expect(state.dailyProgress).toBeNull();
    expect(state.coins).toBe(STARTING_COINS + DAILY_COMPLETE_COINS);
    expect(state.daily).toEqual({ lastCompletedDate: today, streak: 1 });

    fireEvent.click(screen.getByRole('button', { name: 'Back home' }));
    expect(screen.getByRole('button', { name: 'Play level 5' })).toBeInTheDocument();
  });
});

describe('App endless levels', () => {
  it('moves on from level 100 to generated level 101', async () => {
    const level = ALL_LEVELS[ALL_LEVELS.length - 1]!;
    const { found, last } = allButOneWord(level);
    seed({
      currentLevelId: level.id,
      completedLevelIds: ALL_LEVELS.slice(0, -1).map((l) => l.id),
      levelProgress: { [level.id]: { foundWords: found, revealedCells: [] } },
    });
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Play level 100' }));
    typeWord(last);
    expect(await screen.findByRole('heading', { name: 'Level 100 done' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next level' }));
    expect(await screen.findByText('Level 101')).toBeInTheDocument();
    expect(screen.getByLabelText('Letter wheel')).toBeInTheDocument();
    expect(useProfileStore.getState().currentLevelId).toBe('endless-101');
  });

  it('shows an endless player as past the charted coast, with a way to continue', async () => {
    seed({ currentLevelId: 'endless-150', completedLevelIds: ALL_LEVELS.map((l) => l.id) });
    render(<App />);
    expect(await screen.findByRole('button', { name: 'Play level 150' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'View chart' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Continue level 150' }));
    expect(await screen.findByText('Level 150')).toBeInTheDocument();
  });

  it('offers a retry if the dictionary behind endless levels cannot be loaded', async () => {
    const realFetch = globalThis.fetch;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        String(url).endsWith('/dictionary.json')
          ? new Response('offline', { status: 503 })
          : realFetch(url),
      ),
    );
    seed({ currentLevelId: 'endless-120', completedLevelIds: ALL_LEVELS.map((l) => l.id) });
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Play level 120' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t load level 120');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});

describe('App replaying from the chart', () => {
  it('replays an earlier level without losing the player’s place', async () => {
    const replayed = levelById('c01-l002');
    const { found, last } = allButOneWord(replayed);
    seed({
      currentLevelId: 'c01-l005',
      completedLevelIds: ['c01-l001', 'c01-l002', 'c01-l003', 'c01-l004'],
      levelProgress: { [replayed.id]: { foundWords: found, revealedCells: [] } },
    });
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'View chart' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Level 2, completed. Replay.' }));
    expect(await screen.findByText('Level 2')).toBeInTheDocument();
    expect(useProfileStore.getState().currentLevelId).toBe('c01-l005');

    typeWord(last);
    expect(await screen.findByRole('heading', { name: 'Level 2 done' })).toBeInTheDocument();
    // Already completed once: a replay pays no level reward.
    expect(useProfileStore.getState().coins).toBe(STARTING_COINS);

    fireEvent.click(screen.getByRole('button', { name: 'Back to chart' }));
    expect(await screen.findByRole('heading', { name: 'Chart' })).toBeInTheDocument();
    expect(useProfileStore.getState().currentLevelId).toBe('c01-l005');
  });
});

describe('App leaving a level', () => {
  it('goes Home from the top bar without changing progress', async () => {
    seed({ currentLevelId: 'c01-l003', completedLevelIds: ['c01-l001', 'c01-l002'] });
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Play level 3' }));
    expect(await screen.findByText('Level 3')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Home' }));
    expect(screen.getByRole('button', { name: 'Play level 3' })).toBeInTheDocument();
    expect(useProfileStore.getState().currentLevelId).toBe('c01-l003');
  });
});
