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
  return (
    <div className={styles.screen}>
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
    </div>
  );
}
