import { useEffect, useState } from 'react';
import { LevelComplete } from './screens/LevelComplete/LevelComplete';
import { Play } from './screens/Play/Play';
import type { ChapterPack } from './game/types';
import { useProfileStore } from './state/profileStore';

interface CompleteResult {
  coinsEarned: number;
  bonusWordsFound: number;
}

export function App() {
  const [chapter, setChapter] = useState<ChapterPack | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [phase, setPhase] = useState<'play' | 'complete'>('play');
  const [result, setResult] = useState<CompleteResult>({ coinsEarned: 0, bonusWordsFound: 0 });

  const currentLevelId = useProfileStore((s) => s.currentLevelId);
  const setCurrentLevel = useProfileStore((s) => s.setCurrentLevel);

  useEffect(() => {
    fetch('/levels/chapter-01.json')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`${res.status} ${res.statusText}`);
        }
        return res.json() as Promise<ChapterPack>;
      })
      .then(setChapter)
      .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : String(err)));
  }, []);

  if (loadError) {
    return <p role="alert">Couldn&rsquo;t load the levels: {loadError}</p>;
  }
  if (!chapter) {
    return <p>Loading&hellip;</p>;
  }

  const currentIndex = Math.max(
    0,
    chapter.levels.findIndex((l) => l.id === currentLevelId),
  );
  const level = chapter.levels[currentIndex];
  if (!level) {
    return <p role="alert">No levels are available yet.</p>;
  }
  const hasNext = currentIndex < chapter.levels.length - 1;

  const handleComplete = (coinsEarned: number, bonusWordsFound: number) => {
    setResult({ coinsEarned, bonusWordsFound });
    setPhase('complete');
  };

  const handleNext = () => {
    const nextLevel = chapter.levels[currentIndex + 1];
    if (nextLevel) {
      setCurrentLevel(nextLevel.id);
    }
    setPhase('play');
  };

  if (phase === 'complete') {
    return (
      <LevelComplete
        levelIndex={level.index}
        coinsEarned={result.coinsEarned}
        bonusWordsFound={result.bonusWordsFound}
        hasNext={hasNext}
        onNext={handleNext}
      />
    );
  }

  return <Play key={level.id} level={level} onComplete={handleComplete} />;
}
