import { useEffect, useState } from 'react';
import type { ChapterPack } from '../../game/types';
import { useProfileStore } from '../../state/profileStore';
import styles from './Chart.module.css';

export interface ChartProps {
  /** Called when the player taps an unlocked level's dot. The Chart screen doesn't own
   * navigation (see CLAUDE.md / this task's report for how App.tsx should wire this up):
   * the caller is expected to set the profile store's current level and switch to Play. */
  onSelectLevel: (levelId: string) => void;
  /** Optional back navigation to Home, matching Settings' own back button. */
  onBack?: () => void;
}

const CHAPTER_COUNT = 5;

function BoatMarker() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="var(--deep-sea)"
        d="M4 15h16l-2.2 4.2a2 2 0 0 1-1.78 1.08H7.98a2 2 0 0 1-1.78-1.08L4 15Z"
      />
      <path fill="var(--deep-sea)" d="M11 3h1v9h-1z" />
      <path fill="var(--deep-sea)" d="M12 4l6 4-6 2.4V4Z" />
    </svg>
  );
}

/**
 * The chapter map (HANDOVER.md section 10 point 2): a boat marker on the
 * current level, completed levels as small lit dots, locked levels dimmed.
 * Tapping a completed or current level replays/resumes it; tapping a locked
 * one does nothing.
 */
export function Chart({ onSelectLevel, onBack }: ChartProps) {
  const [chapters, setChapters] = useState<ChapterPack[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const currentLevelId = useProfileStore((s) => s.currentLevelId);
  const completedLevelIds = useProfileStore((s) => s.completedLevelIds);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      Array.from({ length: CHAPTER_COUNT }, (_, i) => {
        const n = String(i + 1).padStart(2, '0');
        return fetch(`/levels/chapter-${n}.json`).then((res) => {
          if (!res.ok) throw new Error(`chapter-${n}.json: ${res.status} ${res.statusText}`);
          return res.json() as Promise<ChapterPack>;
        });
      }),
    )
      .then((packs) => {
        if (!cancelled) setChapters(packs);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loadError) {
    return (
      <p role="alert" className={styles.message}>
        Couldn&rsquo;t load the chart: {loadError}
      </p>
    );
  }
  if (!chapters) {
    return <p className={styles.message}>Loading&hellip;</p>;
  }

  const completedSet = new Set(completedLevelIds);
  const orderedIds = chapters.flatMap((chapter) => chapter.levels.map((level) => level.id));
  const currentPosition = Math.max(0, orderedIds.indexOf(currentLevelId));

  return (
    <div className={styles.chart}>
      <div className={styles.header}>
        <h1 className={styles.title}>Chart</h1>
        {onBack && (
          <button type="button" className={styles.backButton} onClick={onBack}>
            Back
          </button>
        )}
      </div>
      {chapters.map((chapter) => (
        <section key={chapter.chapter} className={styles.chapterSection} data-theme={chapter.theme}>
          <h2 className={styles.chapterTitle}>{chapter.title}</h2>
          <div className={styles.levelRow}>
            {chapter.levels.map((level) => {
              const completed = completedSet.has(level.id);
              const isCurrent = level.id === currentLevelId;
              const position = orderedIds.indexOf(level.id);
              const unlocked = completed || isCurrent || position <= currentPosition;

              const label = isCurrent
                ? `Level ${position + 1}, current level`
                : completed
                  ? `Level ${position + 1}, completed. Replay.`
                  : unlocked
                    ? `Level ${position + 1}`
                    : `Level ${position + 1}, locked`;

              return (
                <button
                  key={level.id}
                  type="button"
                  className={[
                    styles.dot,
                    completed && styles.dotCompleted,
                    isCurrent && styles.dotCurrent,
                    !unlocked && styles.dotLocked,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  disabled={!unlocked}
                  onClick={() => onSelectLevel(level.id)}
                  aria-label={label}
                  aria-current={isCurrent ? 'true' : undefined}
                >
                  {isCurrent ? <BoatMarker /> : null}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
