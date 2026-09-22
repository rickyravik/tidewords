import { HINT_COST, REVEAL_COST } from '../../game/economy';
import styles from './HelperButtons.module.css';

export interface HelperButtonsProps {
  coins: number;
  onShuffle: () => void;
  onHint: () => void;
  onReveal: () => void;
}

export function HelperButtons({ coins, onShuffle, onHint, onReveal }: HelperButtonsProps) {
  return (
    <div className={styles.row}>
      <button type="button" className={styles.button} onClick={onShuffle}>
        Shuffle
        <span className={styles.cost}>Free</span>
      </button>
      <button type="button" className={styles.button} onClick={onHint} disabled={coins < HINT_COST}>
        Hint
        <span className={styles.cost}>{HINT_COST} coins</span>
      </button>
      <button
        type="button"
        className={styles.button}
        onClick={onReveal}
        disabled={coins < REVEAL_COST}
      >
        Reveal
        <span className={styles.cost}>{REVEAL_COST} coins</span>
      </button>
    </div>
  );
}
