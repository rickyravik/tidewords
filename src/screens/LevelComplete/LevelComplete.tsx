import { motion } from 'framer-motion';
import { useReducedMotionPreference } from '../../hooks/useReducedMotion';
import { LEVEL_COMPLETE_SUMMARY_SECONDS } from '../../motion/timings';
import styles from './LevelComplete.module.css';

export interface LevelCompleteProps {
  /** The player-facing level number: 1-based position across all chapters. */
  levelNumber: number;
  coinsEarned: number;
  bonusWordsFound: number;
  /** Set when the finished puzzle was the daily: the player's streak after finishing it. */
  dailyStreak?: number;
  /** "Next level" for a normal level; back to Home after the daily. */
  onNext: () => void;
  /** Overrides the button text, e.g. "Back to chart" after replaying an old level. */
  nextLabel?: string;
}

export function LevelComplete({
  levelNumber,
  coinsEarned,
  bonusWordsFound,
  dailyStreak,
  onNext,
  nextLabel,
}: LevelCompleteProps) {
  const isDaily = dailyStreak !== undefined;
  const reduceMotion = useReducedMotionPreference();

  // HANDOVER 9.5 "Level complete": tiles flip in a wave (Grid/Tile, played
  // while Play is still on screen), then this summary slides up. Reduced
  // motion swaps the slide for a short fade in place.
  const initial = reduceMotion ? { opacity: 0 } : { opacity: 0, y: 40 };
  const animate = reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 };

  return (
    <motion.div
      className={styles.screen}
      initial={initial}
      animate={animate}
      transition={{ duration: LEVEL_COMPLETE_SUMMARY_SECONDS, ease: 'easeOut' }}
    >
      <h1 className={styles.title}>
        {isDaily ? 'Daily puzzle done' : `Level ${levelNumber} done`}
      </h1>
      {isDaily && dailyStreak > 0 && <p className={styles.streak}>{dailyStreak} day streak</p>}
      <div className={styles.stats}>
        <span className={styles.coins}>+{coinsEarned} coins</span>
        {bonusWordsFound > 0 && (
          <span className={styles.bonus}>
            {bonusWordsFound} bonus word{bonusWordsFound === 1 ? '' : 's'}
          </span>
        )}
      </div>
      <button type="button" className={styles.nextButton} onClick={onNext}>
        {nextLabel ?? (isDaily ? 'Back home' : 'Next level')}
      </button>
    </motion.div>
  );
}
