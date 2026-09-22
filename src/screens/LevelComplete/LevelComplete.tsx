import { motion } from 'framer-motion';
import { useReducedMotionPreference } from '../../hooks/useReducedMotion';
import { LEVEL_COMPLETE_SUMMARY_SECONDS } from '../../motion/timings';
import styles from './LevelComplete.module.css';

export interface LevelCompleteProps {
  levelIndex: number;
  coinsEarned: number;
  bonusWordsFound: number;
  hasNext: boolean;
  onNext: () => void;
}

export function LevelComplete({
  levelIndex,
  coinsEarned,
  bonusWordsFound,
  hasNext,
  onNext,
}: LevelCompleteProps) {
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
      <h1 className={styles.title}>Level {levelIndex} done</h1>
      <div className={styles.stats}>
        <span className={styles.coins}>+{coinsEarned} coins</span>
        {bonusWordsFound > 0 && (
          <span className={styles.bonus}>
            {bonusWordsFound} bonus word{bonusWordsFound === 1 ? '' : 's'}
          </span>
        )}
      </div>
      <button type="button" className={styles.nextButton} onClick={onNext}>
        {hasNext ? 'Next level' : "That's every level so far"}
      </button>
    </motion.div>
  );
}
