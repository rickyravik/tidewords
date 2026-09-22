import { isCellFilled } from '../../game/completion';
import { cellAt } from '../../game/grid';
import type { CellKey, Grid as GridData, Level } from '../../game/types';
import { Tile } from '../Tile/Tile';
import styles from './Grid.module.css';

export interface GridProps {
  level: Level;
  grid: GridData;
  foundWords: ReadonlySet<string>;
  revealedCells: ReadonlySet<CellKey>;
  tileSize?: number;
}

const MAX_TILE_SIZE = 56;

export function Grid({
  level,
  grid,
  foundWords,
  revealedCells,
  tileSize = MAX_TILE_SIZE,
}: GridProps) {
  const size = Math.min(tileSize, MAX_TILE_SIZE);
  const cells = [];

  for (let row = 0; row < level.rows; row++) {
    for (let col = 0; col < level.cols; col++) {
      const cell = cellAt(grid, row, col);
      cells.push(
        <div key={`${row},${col}`} style={{ gridRow: row + 1, gridColumn: col + 1 }}>
          {cell && (
            <Tile
              letter={isCellFilled(cell, foundWords, revealedCells) ? cell.letter : null}
              size={size}
            />
          )}
        </div>,
      );
    }
  }

  return (
    <div
      className={styles.grid}
      role="group"
      aria-label={`Crossword grid, ${level.rows} by ${level.cols}`}
      style={{
        gridTemplateColumns: `repeat(${level.cols}, ${size}px)`,
        gridTemplateRows: `repeat(${level.rows}, ${size}px)`,
      }}
    >
      {cells}
    </div>
  );
}
