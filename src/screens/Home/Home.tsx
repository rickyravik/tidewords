import { currentStreak, todayDateString } from '../../game/daily';
import { useProfileStore } from '../../state/profileStore';
import styles from './Home.module.css';

export interface HomeProps {
  /** The current level's player-facing number: 1-based position across all chapters. */
  levelNumber: number;
  /** Opens Play on the player's current level (within one tap, per Section 10). */
  onPlay: () => void;
  onSettings: () => void;
  onChart: () => void;
  onDaily: () => void;
}

export function Home({ levelNumber, onPlay, onSettings, onChart, onDaily }: HomeProps) {
  const completedCount = useProfileStore((s) => s.completedLevelIds.length);
  const daily = useProfileStore((s) => s.daily);
  const streak = currentStreak(daily, todayDateString());

  return (
    <div className={styles.home}>
      <button
        type="button"
        className={styles.settingsButton}
        onClick={onSettings}
        aria-label="Settings"
      >
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M19.4 13a7.6 7.6 0 0 0 0-2l2-1.6a.5.5 0 0 0 .1-.6l-1.9-3.3a.5.5 0 0 0-.6-.2l-2.4 1a7.6 7.6 0 0 0-1.7-1l-.4-2.5a.5.5 0 0 0-.5-.4h-3.8a.5.5 0 0 0-.5.4l-.4 2.5c-.6.2-1.2.6-1.7 1l-2.4-1a.5.5 0 0 0-.6.2L2.7 8.8a.5.5 0 0 0 .1.6l2 1.6a7.6 7.6 0 0 0 0 2l-2 1.6a.5.5 0 0 0-.1.6l1.9 3.3c.1.2.4.3.6.2l2.4-1c.5.4 1.1.8 1.7 1l.4 2.5c0 .2.3.4.5.4h3.8c.2 0 .5-.2.5-.4l.4-2.5c.6-.2 1.2-.6 1.7-1l2.4 1c.2.1.5 0 .6-.2l1.9-3.3a.5.5 0 0 0-.1-.6l-2-1.6ZM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z"
          />
        </svg>
      </button>

      <div className={styles.hero}>
        <h1 className={styles.title}>Tidewords</h1>
        <p className={styles.subtitle}>
          {completedCount} level{completedCount === 1 ? '' : 's'} completed
        </p>
      </div>

      <button type="button" className={styles.playButton} onClick={onPlay}>
        Play level {levelNumber}
      </button>

      <button type="button" className={styles.dailyCard} onClick={onDaily}>
        <span className={styles.dailyLabel}>Daily puzzle</span>
        <span className={styles.dailyStreak}>
          {streak > 0 ? `${streak} day streak` : 'Play today’s puzzle to start a streak'}
        </span>
      </button>

      <button type="button" className={styles.chartLink} onClick={onChart}>
        View chart
      </button>
    </div>
  );
}
