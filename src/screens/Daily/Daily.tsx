import { useEffect, useState } from 'react';
import { calendarStrip, pickDailyLevelId, todayDateString } from '../../game/daily';
import type { ChapterPack } from '../../game/types';
import { useProfileStore } from '../../state/profileStore';
import styles from './Daily.module.css';

export interface DailyProps {
  /** Called with today's daily level id when the player taps play. The Daily screen doesn't
   * own navigation (see this task's report for how App.tsx should wire this up): the caller
   * is expected to switch to Play with that level, and to call the profile store's
   * `completeDailyPuzzle(todayDateString())` once that level is completed. */
  onPlayDaily: (levelId: string) => void;
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
 */
function dailyPool(chapters: ChapterPack[]): string[] {
  return chapters.flatMap((chapter) => chapter.levels.map((level) => level.id));
}

/**
 * The daily puzzle screen (HANDOVER.md section 10 point 5): today's puzzle,
 * streak count, and a calendar strip of the last 7 days.
 */
export function Daily({ onPlayDaily }: DailyProps) {
  const [pool, setPool] = useState<string[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const daily = useProfileStore((s) => s.daily);

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
  const days = calendarStrip(today, daily);

  return (
    <div className={styles.daily}>
      <h1 className={styles.title}>Daily puzzle</h1>

      <p className={styles.streak}>
        {daily.streak > 0
          ? `${daily.streak} day streak`
          : 'Play today’s puzzle to start a streak'}
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
        onClick={() => dailyLevelId && onPlayDaily(dailyLevelId)}
      >
        {completedToday ? "Today's puzzle done" : "Play today's puzzle"}
      </button>
    </div>
  );
}
