import { useEffect, useState } from 'react';
import { UpdatePrompt } from './components/Modal/UpdatePrompt';
import { todayDateString } from './game/daily';
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
}

const CHAPTER_COUNT = 5;

function chapterUrl(n: number): string {
  return `/levels/chapter-${String(n).padStart(2, '0')}.json`;
}

export function App() {
  const [chapters, setChapters] = useState<ChapterPack[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [result, setResult] = useState<CompleteResult>({ coinsEarned: 0, bonusWordsFound: 0 });
  const [isDailyPlay, setIsDailyPlay] = useState(false);

  const currentLevelId = useProfileStore((s) => s.currentLevelId);
  const setCurrentLevel = useProfileStore((s) => s.setCurrentLevel);
  const completeDailyPuzzle = useProfileStore((s) => s.completeDailyPuzzle);
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

  if (loadError) {
    return <p role="alert">Couldn&rsquo;t load the levels: {loadError}</p>;
  }
  if (!chapters) {
    return <p>Loading&hellip;</p>;
  }

  const orderedLevels: Level[] = chapters.flatMap((chapter) => chapter.levels);
  const currentIndex = Math.max(
    0,
    orderedLevels.findIndex((l) => l.id === currentLevelId),
  );
  const level = orderedLevels[currentIndex];
  if (!level) {
    return <p role="alert">No levels are available yet.</p>;
  }
  const nextLevel = orderedLevels[currentIndex + 1];

  const goHome = () => setScreen('home');

  const handlePlay = () => {
    setIsDailyPlay(false);
    setScreen('play');
  };

  const handlePlayDaily = (levelId: string) => {
    setCurrentLevel(levelId);
    setIsDailyPlay(true);
    setScreen('play');
  };

  const handleSelectLevel = (levelId: string) => {
    setCurrentLevel(levelId);
    setIsDailyPlay(false);
    setScreen('play');
  };

  const handleComplete = (coinsEarned: number, bonusWordsFound: number) => {
    if (isDailyPlay) {
      completeDailyPuzzle(todayDateString());
    }
    setResult({ coinsEarned, bonusWordsFound });
    setScreen('complete');
  };

  const handleNext = () => {
    if (nextLevel) {
      setCurrentLevel(nextLevel.id);
      setIsDailyPlay(false);
      setScreen('play');
    } else {
      goHome();
    }
  };

  return (
    <>
      <UpdatePrompt />
      {screen === 'home' && (
        <Home
          onPlay={handlePlay}
          onSettings={() => setScreen('settings')}
          onChart={() => setScreen('chart')}
          onDaily={() => setScreen('daily')}
        />
      )}
      {screen === 'settings' && <Settings onBack={goHome} />}
      {screen === 'chart' && <Chart onSelectLevel={handleSelectLevel} onBack={goHome} />}
      {screen === 'daily' && <Daily onPlayDaily={handlePlayDaily} onBack={goHome} />}
      {screen === 'play' && <Play key={level.id} level={level} onComplete={handleComplete} />}
      {screen === 'complete' && (
        <LevelComplete
          levelIndex={level.index}
          coinsEarned={result.coinsEarned}
          bonusWordsFound={result.bonusWordsFound}
          hasNext={Boolean(nextLevel)}
          onNext={handleNext}
        />
      )}
    </>
  );
}
