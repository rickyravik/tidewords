import { motion, type Target, type Transition } from 'framer-motion';
import { CORRECT_WORD_TILE_SECONDS, REPEAT_WORD_PULSE_SECONDS } from '../../motion/timings';
import styles from './Tile.module.css';

export interface TileProps {
  letter: string | null;
  size?: number;
  /** Plays the "correct word" fly-in entrance once (HANDOVER 9.5: "letters
   * fly from preview pill to their tiles"). `flyDelay` (seconds) staggers it
   * across the word, 40ms per letter. Grid remounts the tile for each new
   * result, so this only ever plays once per word found. */
  justFilled?: boolean;
  flyDelay?: number;
  /** Plays the "repeat word" pulse (HANDOVER 9.5: matching tiles pulse, 400ms). */
  pulse?: boolean;
  /** Plays the level-complete tile-flip wave, delayed (seconds) by its
   * row-major position in the grid. Omit/null outside that moment. */
  flipDelay?: number | null;
  reduceMotion?: boolean;
}

export function Tile({
  letter,
  size = 48,
  justFilled = false,
  flyDelay = 0,
  pulse = false,
  flipDelay = null,
  reduceMotion = false,
}: TileProps) {
  const filled = letter !== null;

  let initial: Target | boolean = false;
  let animate: Target | undefined;
  let transition: Transition | undefined;

  if (flipDelay !== null) {
    // Level complete: tiles flip in a wave.
    initial = reduceMotion ? { opacity: 0 } : { rotateX: -90, opacity: 0.4 };
    animate = reduceMotion ? { opacity: 1 } : { rotateX: 0, opacity: 1 };
    transition = { delay: flipDelay, duration: reduceMotion ? 0.2 : 0.35, ease: 'easeOut' };
  } else if (justFilled) {
    // Correct word: letters fly from the preview pill to their tiles.
    initial = reduceMotion ? { opacity: 0 } : { y: 14, opacity: 0, scale: 0.7 };
    animate = reduceMotion ? { opacity: 1 } : { y: 0, opacity: 1, scale: 1 };
    transition = {
      delay: flyDelay,
      duration: reduceMotion ? 0.15 : CORRECT_WORD_TILE_SECONDS,
      ease: 'easeOut',
    };
  } else if (pulse) {
    // Repeat word: matching tiles pulse.
    animate = reduceMotion ? { opacity: [1, 0.5, 1] } : { scale: [1, 1.12, 1] };
    transition = { duration: REPEAT_WORD_PULSE_SECONDS, ease: 'easeInOut' };
  }

  return (
    <motion.div
      className={`${styles.tile} ${filled ? styles.filled : styles.empty}`}
      style={{ width: size, height: size, fontSize: size * 0.5 }}
      aria-hidden={!filled}
      initial={initial}
      animate={animate}
      transition={transition}
    >
      {filled ? letter : ''}
    </motion.div>
  );
}
