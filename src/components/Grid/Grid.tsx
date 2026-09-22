import { useState } from 'react';
import { isCellFilled } from '../../game/completion';
import { cellAt } from '../../game/grid';
import { cellKey, type CellKey, type Grid as GridData, type Level } from '../../game/types';
import { useReducedMotionPreference } from '../../hooks/useReducedMotion';
import { correctWordFlyDelay, levelCompleteFlipDelay } from '../../motion/timings';
import { Tile } from '../Tile/Tile';
import styles from './Grid.module.css';
import { rowMajorIndex, wordCellKeys, type GridResult } from './motionHelpers';

export type { GridResult } from './motionHelpers';

export interface GridProps {
  level: Level;
  grid: GridData;
  foundWords: ReadonlySet<string>;
  revealedCells: ReadonlySet<CellKey>;
  tileSize?: number;
  /** Additive hook for the Reveal helper's tile-picker (see Play.tsx). Left
   *  optional and Tile.tsx untouched so this merges easily with motion work. */
  onCellClick?: (row: number, col: number) => void;
  /** The most recent word-submission result — 'found' or 'repeat' only, since
   * hint/reveal fills have no word in the preview pill to animate from.
   * Drives the "correct word flies in" / "repeat word pulses" motion for
   * just that word's tiles (HANDOVER 9.5). */
  justResult?: GridResult | null;
  /** True once the level is complete; plays the tile-flip wave once before
   * Play hands off to the Level Complete screen (HANDOVER 9.5). */
  celebrateCompletion?: boolean;
}

const MAX_TILE_SIZE = 56;

export function Grid({
  level,
  grid,
  foundWords,
  revealedCells,
  tileSize = MAX_TILE_SIZE,
  onCellClick,
  justResult = null,
  celebrateCompletion = false,
}: GridProps) {
  const size = Math.min(tileSize, MAX_TILE_SIZE);
  const reduceMotion = useReducedMotionPreference();

  // Turn "a new result just came in" / "the level just completed" into a
  // one-shot token so the affected tiles remount and replay their entrance
  // animation, instead of fighting Framer Motion's animate-prop diffing for
  // an event that isn't a simple before/after state change.
  const [seenResult, setSeenResult] = useState(justResult);
  const [resultToken, setResultToken] = useState(0);
  if (justResult !== seenResult) {
    setSeenResult(justResult);
    if (justResult) {
      setResultToken((t) => t + 1);
    }
  }

  const [seenCelebration, setSeenCelebration] = useState(celebrateCompletion);
  const [completionToken, setCompletionToken] = useState(0);
  if (celebrateCompletion !== seenCelebration) {
    setSeenCelebration(celebrateCompletion);
    if (celebrateCompletion) {
      setCompletionToken((t) => t + 1);
    }
  }

  const affectedCellOrder = justResult ? wordCellKeys(justResult.word) : [];

  const cells = [];

  for (let row = 0; row < level.rows; row++) {
    for (let col = 0; col < level.cols; col++) {
      const cell = cellAt(grid, row, col);
      const key = cellKey(row, col);
      const filled = cell ? isCellFilled(cell, foundWords, revealedCells) : false;

      const letterIndexInWord = affectedCellOrder.indexOf(key);
      const isAffected = letterIndexInWord !== -1;

      // Remount just the tiles for this event (or every tile for the
      // completion wave) so each entrance animation plays exactly once.
      const reactKey = celebrateCompletion
        ? `${key}-complete-${completionToken}`
        : isAffected
          ? `${key}-result-${resultToken}`
          : key;

      const clickable = Boolean(cell && onCellClick);
      cells.push(
        <div
          key={reactKey}
          style={{ gridRow: row + 1, gridColumn: col + 1 }}
          onClick={clickable ? () => onCellClick?.(row, col) : undefined}
          onKeyDown={
            clickable
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onCellClick?.(row, col);
                  }
                }
              : undefined
          }
          role={clickable ? 'button' : undefined}
          tabIndex={clickable ? 0 : undefined}
          aria-label={clickable ? `Reveal the word through row ${row + 1}, column ${col + 1}` : undefined}
        >
          {cell && (
            <Tile
              letter={filled ? cell.letter : null}
              size={size}
              justFilled={isAffected && justResult?.kind === 'found'}
              flyDelay={isAffected ? correctWordFlyDelay(letterIndexInWord) : 0}
              pulse={isAffected && justResult?.kind === 'repeat'}
              flipDelay={
                celebrateCompletion ? levelCompleteFlipDelay(rowMajorIndex(row, col, level.cols)) : null
              }
              reduceMotion={reduceMotion}
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
