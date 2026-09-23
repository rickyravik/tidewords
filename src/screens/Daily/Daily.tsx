import { useEffect, useState } from 'react';
import { calendarStrip, currentStreak, pickDailyLevelId, todayDateString } from '../../game/daily';
import type { ChapterPack } from '../../game/types';
import { dailyProgressFor, useProfileStore } from '../../state/profileStore';
import styles from './Daily.module.css';

export interface DailyProps {
  /** Called with today's daily level id and date when the player taps play. The caller
   * opens Play in daily mode for that level (see App.tsx): daily play never moves the
   * player's `currentLevelId` or `completedLevelIds`, and pays only the daily reward. */
  onPlayDaily: (levelId: string, date: string) => void;
  /** Optional back navigation to Home. */
  onBack?: () => void;
}

const CHAPTER_COUNT = 5;

const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function weekdayInitial(date: string): string {
  // Parsed as UTC midnight so this always lines up with calendarStrip's own
  // UTC day arithmetic, regardless of the player's time zone.
  return WEEKDAY_INITIALS[new Date(`${date}T00:00:00Z`).getUTCDay()] ?? '';
}

/**
 * The daily puzzle pool: every level id across all 5 chapters, in a stable
 * order (chapter, then index) — pickDailyLevelId hashes the date into this
 * list, so every player sees the same puzzle on the same day (HANDOVER.md
 * section 7.2). Reusing the full generated level set as the pool (rather
 * than a separate dedicated one) keeps this self-contained: no extra file to
 * generate or ship, and 100 levels is already plenty of daily variety.
 * Only the shipped chapter packs belong here — never levels generated on the
 * device — or players would stop sharing the same puzzle.
 */
function dailyPool(chapters: ChapterPack[]): string[] {
  return chapters.flatMap((chapter) => chapter.levels.map((level) => level.id));
}

/**
 * The daily puzzle screen (HANDOVER.md section 10 point 5): today's puzzle,
 * streak count, and a calendar strip of the last 7 days.
 */
export function Daily({ onPlayDaily, onBack }: DailyProps) {
  const [pool, setPool] = useState<string[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const daily = useProfileStore((s) => s.daily);
  const dailyProgress = useProfileStore((s) => s.dailyProgress);

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
        if (!cancelled) setPool(dailyPool(packs));
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
        Couldn&rsquo;t load today&rsquo;s puzzle: {loadError}
      </p>
    );
  }
  if (!pool) {
    return <p className={styles.message}>Loading&hellip;</p>;
  }

  const today = todayDateString();
  const dailyLevelId = pickDailyLevelId(today, pool);
  const completedToday = daily.lastCompletedDate === today;
  const inProgressToday =
    dailyLevelId !== null && dailyProgressFor(dailyProgress, today, dailyLevelId) !== undefined;
  const days = calendarStrip(today, daily);
  const streak = currentStreak(daily, today);

  return (
    <div className={styles.daily}>
      {onBack && (
        <button type="button" className={styles.backButton} onClick={onBack}>
          Back
        </button>
      )}
      <h1 className={styles.title}>Daily puzzle</h1>

      <p className={styles.streak}>
        {streak > 0 ? `${streak} day streak` : 'Play today’s puzzle to start a streak'}
      </p>

      <div className={styles.calendar} role="list" aria-label="Last 7 days">
        {days.map((day) => (
          <div key={day.date} className={styles.calendarDay} role="listitem">
            <span
              className={[
                styles.calendarDot,
                day.completed && styles.calendarDotCompleted,
                day.isToday && styles.calendarDotToday,
              ]
                .filter(Boolean)
                .join(' ')}
              aria-hidden="true"
            />
            <span className={styles.calendarLabel}>{weekdayInitial(day.date)}</span>
          </div>
        ))}
      </div>

      <button
        type="button"
        className={styles.playButton}
        disabled={!dailyLevelId || completedToday}
        onClick={() => dailyLevelId && onPlayDaily(dailyLevelId, today)}
      >
        {completedToday
          ? "Today's puzzle done"
          : inProgressToday
            ? "Continue today's puzzle"
            : "Play today's puzzle"}
      </button>
    </div>
  );
}
