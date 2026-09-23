import styles from './TopBar.module.css';

export interface TopBarProps {
  coins: number;
  levelLabel: string;
  /** Leaves Play for Home. Progress is saved as you go, so nothing is lost. */
  onHome?: () => void;
}

export function TopBar({ coins, levelLabel, onHome }: TopBarProps) {
  return (
    <div className={styles.bar}>
      <div className={styles.start}>
        {onHome && (
          <button type="button" className={styles.homeButton} onClick={onHome} aria-label="Home">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path
                fill="currentColor"
                d="M12 3.2 2.6 11a1 1 0 0 0 1.3 1.5L5 11.6V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-8.4l1.1.9A1 1 0 0 0 21.4 11Z"
              />
            </svg>
          </button>
        )}
        <span className={styles.coins} aria-label={`${coins} coins`}>
          {coins}
        </span>
      </div>
      <span className={styles.level}>{levelLabel}</span>
    </div>
  );
}
