import styles from './TopBar.module.css';

export interface TopBarProps {
  coins: number;
  levelLabel: string;
}

export function TopBar({ coins, levelLabel }: TopBarProps) {
  return (
    <div className={styles.bar}>
      <span className={styles.coins} aria-label={`${coins} coins`}>
        {coins}
      </span>
      <span className={styles.level}>{levelLabel}</span>
    </div>
  );
}
