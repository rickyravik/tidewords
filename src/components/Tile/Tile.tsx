import styles from './Tile.module.css';

export interface TileProps {
  letter: string | null;
  size?: number;
}

export function Tile({ letter, size = 48 }: TileProps) {
  const filled = letter !== null;
  return (
    <div
      className={`${styles.tile} ${filled ? styles.filled : styles.empty}`}
      style={{ width: size, height: size, fontSize: size * 0.5 }}
      aria-hidden={!filled}
    >
      {filled ? letter : ''}
    </div>
  );
}
