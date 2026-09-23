import { useEffect, useMemo, useState } from 'react';
import styles from './App.module.css';
import { UpdatePrompt } from './components/Modal/UpdatePrompt';
import { loadDictionary } from './game/dictionary';
import {
  FIRST_ENDLESS_LEVEL,
  endlessLevelId,
  endlessLevelNumber,
  generateEndlessLevel,
} from './game/endless';
import type { WordCorpus } from './game/generator';
import type { ChapterPack, Level } from './game/types';
import { Chart } from './screens/Chart/Chart';
import { Daily } from './screens/Daily/Daily';
import { Home } from './screens/Home/Home';
import { LevelComplete } from './screens/LevelComplete/LevelComplete';
import { Play } from './screens/Play/Play';
import { Settings } from './screens/Settings/Settings';
import { useProfileStore } from './state/profileStore';

type Screen = 'home' | 'play' | 'complete' | 'settings' | 'chart' | 'daily';

interface CompleteResult {
  coinsEarned: number;
  bonusWordsFound: number;
  /** Set when the finished puzzle was the daily: the streak after finishing it. */
  dailyStreak?: number;
}

/** The daily puzzle being played: which level, and the date it's the daily for. */
interface DailyPlay {
  levelId: string;
  date: string;
}

const CHAPTER_COUNT = 5;

function chapterUrl(n: number): string {
  return `/levels/chapter-${String(n).padStart(2, '0')}.json`;
}

export function App() {
  const [chapters, setChapters] = useState<ChapterPack[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [result, setResult] = useState<CompleteResult>({ coinsEarned: 0, bonusWordsFound: 0 });
  // Non-null while the daily is on screen (Play or its complete screen). The
  // daily is played "on the side": it never changes currentLevelId.
  const [dailyPlay, setDailyPlay] = useState<DailyPlay | null>(null);
  // Non-null while replaying an earlier level picked on the Chart. Like the
  // daily, a replay is played on the side and never moves currentLevelId,
  // so the player's place on the chart isn't lost.
  const [replayLevelId, setReplayLevelId] = useState<string | null>(null);
  // The shipped dictionary doubles as the corpus endless levels (101+) are
  // generated from on the device. Play loads the same cached promise for
  // bonus words, so this costs no extra request.
  const [corpus, setCorpus] = useState<WordCorpus | null>(null);
  const [corpusFailed, setCorpusFailed] = useState(false);

  const currentLevelId = useProfileStore((s) => s.currentLevelId);
  const setCurrentLevel = useProfileStore((s) => s.setCurrentLevel);
  const highContrast = useProfileStore((s) => s.settings.highContrast);
  const reducedMotion = useProfileStore((s) => s.settings.reducedMotion);
  const dyslexiaFont = useProfileStore((s) => s.settings.dyslexiaFont);

  // First launch (Section 10): skip Home and drop straight into level 1.
  // Computed once from the store's state at mount, not re-derived on every
  // render, so completing the first level doesn't retroactively change it.
  const [screen, setScreen] = useState<Screen>(() => {
    const state = useProfileStore.getState();
    const isFirstLaunch =
      state.completedLevelIds.length === 0 && !state.levelProgress[state.currentLevelId];
    return isFirstLaunch ? 'play' : 'home';
  });

  // High contrast / reduced motion are document-level CSS hooks (tokens.css,
  // Wheel.module.css) read via `:root[data-*]` selectors, so they need to
  // stay in sync app-wide, not just while the Settings screen is mounted.
  useEffect(() => {
    document.documentElement.dataset.highContrast = String(highContrast);
  }, [highContrast]);
  useEffect(() => {
    document.documentElement.dataset.reducedMotion = String(reducedMotion);
  }, [reducedMotion]);
  useEffect(() => {
    document.documentElement.dataset.dyslexiaFont = String(dyslexiaFont);
  }, [dyslexiaFont]);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      Array.from({ length: CHAPTER_COUNT }, (_, i) =>
        fetch(chapterUrl(i + 1)).then((res) => {
          if (!res.ok) {
            throw new Error(`chapter-${i + 1}: ${res.status} ${res.statusText}`);
          }
          return res.json() as Promise<ChapterPack>;
        }),
      ),
    )
      .then((packs) => {
        if (!cancelled) {
          setChapters(packs);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : String(err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadDictionary().then((loaded) => {
      if (cancelled) return;
      if (loaded) {
        setCorpus(loaded);
      } else {
        setCorpusFailed(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // loadDictionary caches a success and allows a fresh attempt after a failure.
  const retryCorpus = () => {
    setCorpusFailed(false);
    void loadDictionary().then((loaded) => {
      if (loaded) {
        setCorpus(loaded);
      } else {
        setCorpusFailed(true);
      }
    });
  };

  // Generating a level takes tens of milliseconds, so only redo it when the
  // endless level number or the corpus actually changes.
  const endlessNumber = endlessLevelNumber(currentLevelId);
  const endlessLevel = useMemo(
    () => (endlessNumber !== null && corpus ? generateEndlessLevel(endlessNumber, corpus) : null),
    [endlessNumber, corpus],
  );

  if (loadError) {
    return <p role="alert">Couldn&rsquo;t load the levels: {loadError}</p>;
  }
  if (!chapters) {
    return <p>Loading&hellip;</p>;
  }

  const orderedLevels: Level[] = chapters.flatMap((chapter) => chapter.levels);
  if (orderedLevels.length === 0) {
    return <p role="alert">No levels are available yet.</p>;
  }

  // Players see one continuous level number: a shipped level's 1-based
  // position in the ordered list (the Chart labels its dots the same way),
  // then endless levels carry on from FIRST_ENDLESS_LEVEL.
  let currentLevel: Level | null;
  let currentNumber: number;
  let nextLevelId: string;
  if (endlessNumber !== null) {
    currentLevel = endlessLevel; // null until the corpus has loaded
    currentNumber = endlessNumber;
    nextLevelId = endlessLevelId(endlessNumber + 1);
  } else {
    const index = Math.max(
      0,
      orderedLevels.findIndex((l) => l.id === currentLevelId),
    );
    currentLevel = orderedLevels[index] ?? null;
    currentNumber = index + 1;
    nextLevelId = orderedLevels[index + 1]?.id ?? endlessLevelId(FIRST_ENDLESS_LEVEL);
  }

  // What Play shows: the daily's level while playing the daily, an earlier
  // level while replaying one from the Chart (both always shipped levels),
  // otherwise the player's own current level.
  const sideLevelId = dailyPlay?.levelId ?? replayLevelId;
  const sideIndex = sideLevelId ? orderedLevels.findIndex((l) => l.id === sideLevelId) : -1;
  const playLevel = sideIndex >= 0 ? (orderedLevels[sideIndex] ?? null) : currentLevel;
  const playNumber = sideIndex >= 0 ? sideIndex + 1 : currentNumber;
  const playDailyDate = dailyPlay && sideIndex >= 0 ? dailyPlay.date : undefined;
  const isReplay = !dailyPlay && replayLevelId !== null && sideIndex >= 0;

  const clearSidePlay = () => {
    setDailyPlay(null);
    setReplayLevelId(null);
  };

  const goHome = () => {
    clearSidePlay();
    setScreen('home');
  };

  const handlePlay = () => {
    clearSidePlay();
    setScreen('play');
  };

  const handlePlayDaily = (levelId: string, date: string) => {
    setReplayLevelId(null);
    setDailyPlay({ levelId, date });
    setScreen('play');
  };

  const handleSelectLevel = (levelId: string) => {
    clearSidePlay();
    // Tapping the boat just continues; tapping any earlier dot replays it.
    if (levelId !== currentLevelId) {
      setReplayLevelId(levelId);
    }
    setScreen('play');
  };

  const handleComplete = (coinsEarned: number, bonusWordsFound: number) => {
    // Play has already recorded the completion in the profile store (the
    // daily via completeDailyPuzzle, a normal level via completeLevel).
    setResult({
      coinsEarned,
      bonusWordsFound,
      dailyStreak: playDailyDate ? useProfileStore.getState().daily.streak : undefined,
    });
    setScreen('complete');
  };

  const handleNext = () => {
    if (result.dailyStreak !== undefined) {
      goHome();
    } else if (isReplay) {
      clearSidePlay();
      setScreen('chart');
    } else {
      // After the last shipped level this moves on to endless level 101.
      setCurrentLevel(nextLevelId);
      clearSidePlay();
      setScreen('play');
    }
  };

  return (
    <>
      <UpdatePrompt />
      {screen === 'home' && (
        <Home
          levelNumber={currentNumber}
          onPlay={handlePlay}
          onSettings={() => setScreen('settings')}
          onChart={() => setScreen('chart')}
          onDaily={() => setScreen('daily')}
        />
      )}
      {screen === 'settings' && <Settings onBack={goHome} />}
      {screen === 'chart' && <Chart onSelectLevel={handleSelectLevel} onBack={goHome} />}
      {screen === 'daily' && <Daily onPlayDaily={handlePlayDaily} onBack={goHome} />}
      {screen === 'play' && playLevel && (
        <Play
          key={
            playDailyDate
              ? `daily-${playDailyDate}-${playLevel.id}`
              : isReplay
                ? `replay-${playLevel.id}`
                : playLevel.id
          }
          level={playLevel}
          levelNumber={playNumber}
          dailyDate={playDailyDate}
          onComplete={handleComplete}
          onExit={goHome}
        />
      )}
      {screen === 'play' && !playLevel && (
        // Only reachable for an endless level while the dictionary it's
        // generated from is still loading, or couldn't be fetched (offline
        // before it was ever cached).
        <div className={styles.waiting}>
          {corpusFailed ? (
            <>
              <p role="alert">Couldn&rsquo;t load level {playNumber}. Check your connection.</p>
              <button type="button" className={styles.button} onClick={retryCorpus}>
                Try again
              </button>
              <button type="button" className={styles.button} onClick={goHome}>
                Back home
              </button>
            </>
          ) : (
            <p>Charting level {playNumber}&hellip;</p>
          )}
        </div>
      )}
      {screen === 'complete' && (
        <LevelComplete
          levelNumber={playNumber}
          dailyStreak={result.dailyStreak}
          coinsEarned={result.coinsEarned}
          bonusWordsFound={result.bonusWordsFound}
          onNext={handleNext}
          nextLabel={isReplay ? 'Back to chart' : undefined}
        />
      )}
    </>
  );
}
