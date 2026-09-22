import { motion, useAnimation } from 'framer-motion';
import { useEffect, useRef } from 'react';
import type { SubmitResult } from '../../game/types';
import { useReducedMotionPreference } from '../../hooks/useReducedMotion';
import { BONUS_WORD_SECONDS, INVALID_WORD_SHAKE_SECONDS } from '../../motion/timings';
import styles from './WordPreview.module.css';

export interface WordPreviewProps {
  word: string;
  resultKind?: SubmitResult['kind'] | null;
}

function variantClass(resultKind: SubmitResult['kind'] | null | undefined): string {
  switch (resultKind) {
    case 'found':
    case 'repeat':
      return styles.found ?? '';
    case 'bonus':
      return styles.bonus ?? '';
    case 'invalid':
    case 'tooShort':
      return styles.invalid ?? '';
    default:
      return '';
  }
}

const RESET = { x: 0, scale: 1, opacity: 1 };

export function WordPreview({ word, resultKind }: WordPreviewProps) {
  const controls = useAnimation();
  const reduceMotion = useReducedMotionPreference();
  // `undefined` sentinel so the very first render (result kind still
  // `undefined`) never accidentally counts as "the result changed".
  const prevKind = useRef<SubmitResult['kind'] | null | undefined>(undefined);

  useEffect(() => {
    if (resultKind === prevKind.current) {
      return;
    }
    prevKind.current = resultKind;

    if (resultKind === 'invalid' || resultKind === 'tooShort') {
      // HANDOVER 9.5 "Invalid word": pill shakes, buoy tint (the tint comes
      // from the .invalid class via variantClass, applied every render).
      void controls.start(
        reduceMotion
          ? { opacity: [1, 0.5, 1], transition: { duration: INVALID_WORD_SHAKE_SECONDS } }
          : {
              x: [0, -8, 8, -6, 6, 0],
              transition: { duration: INVALID_WORD_SHAKE_SECONDS, ease: 'easeOut' },
            },
      );
    } else if (resultKind === 'bonus') {
      // HANDOVER 9.5 "Bonus word": word shrinks into the jar, jar wobbles.
      // TODO(bonus-jar): there is no BonusJar component yet (another agent
      // owns it). Once it exists, replace this in-place shrink with a
      // shared-element animation that flies the pill to the jar icon's real
      // position and triggers the jar's own wobble there.
      void controls.start(
        reduceMotion
          ? { opacity: [1, 0.3, 1], transition: { duration: BONUS_WORD_SECONDS } }
          : {
              scale: [1, 1.05, 0.4],
              opacity: [1, 1, 0],
              transition: { duration: BONUS_WORD_SECONDS, ease: 'easeIn' },
            },
      );
    } else if (resultKind === 'found') {
      // HANDOVER 9.5 "Correct word": the letters themselves fly to their
      // tiles (see Grid/Tile's justFilled animation) — the pill just empties
      // out as they leave.
      void controls.start(
        reduceMotion
          ? { opacity: [1, 0.5, 1], transition: { duration: 0.2 } }
          : {
              scale: [1, 1.06, 0.8],
              opacity: [1, 1, 0.3],
              transition: { duration: 0.25, ease: 'easeOut' },
            },
      );
    } else {
      // Selection cleared / a new word is being typed: settle back to rest.
      void controls.start({ ...RESET, transition: { duration: reduceMotion ? 0.1 : 0.15 } });
    }
  }, [resultKind, controls, reduceMotion]);

  return (
    <motion.div
      className={`${styles.pill} ${variantClass(resultKind)}`}
      aria-live="polite"
      initial={false}
      animate={controls}
    >
      {word || ' '}
    </motion.div>
  );
}
