import { motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { playLetterTick } from '../../audio/sounds';
import { vibrateLetterSelect } from '../../haptics/haptics';
import { useReducedMotionPreference } from '../../hooks/useReducedMotion';
import { SHUFFLE_SECONDS } from '../../motion/timings';
import { useProfileStore } from '../../state/profileStore';
import {
  gapBetweenLetters,
  hitRadius,
  letterPositions,
  nearestIndex,
  type Point,
} from './geometry';
import { identitySlots, matchLettersToSlots } from './shuffleMotion';
import styles from './Wheel.module.css';

export interface WheelProps {
  letters: string[];
  selection: number[];
  onSelect: (index: number) => void;
  onSubmit: () => void;
  size?: number;
  /** Accessibility (Section 8): tap letters one by one instead of swiping,
   *  submitting and clearing with the tick/cross buttons instead of on release. */
  tapMode?: boolean;
  /** Drops the whole in-progress selection. Powers the tap-mode cross button
   *  and is used as a Backspace fallback when only one letter is selected
   *  (the reducer's own backtracking, reused below, only handles 2+). */
  onClear?: () => void;
  /** Lets the keyboard's Space key trigger a shuffle. */
  onShuffle?: () => void;
}

const DEFAULT_SIZE = 300;

export function Wheel({
  letters,
  selection,
  onSelect,
  onSubmit,
  size = DEFAULT_SIZE,
  tapMode = false,
  onClear,
  onShuffle,
}: WheelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [pointerPos, setPointerPos] = useState<Point | null>(null);
  const rectRef = useRef<DOMRect | null>(null);

  // Letter-tick sound/haptic feedback: tracked locally per drag so the tick pitch
  // rises with each distinct letter touched, independent of the parent's re-render
  // timing. Not game logic, so it stays local to this component.
  const dragLetterCountRef = useRef(0);
  const lastFeedbackIndexRef = useRef<number | null>(null);
  const soundEnabled = useProfileStore((s) => s.settings.sound);
  const hapticsEnabled = useProfileStore((s) => s.settings.haptics);

  const emitLetterFeedback = useCallback(
    (index: number) => {
      lastFeedbackIndexRef.current = index;
      if (soundEnabled) {
        playLetterTick(dragLetterCountRef.current);
      }
      if (hapticsEnabled) {
        vibrateLetterSelect();
      }
      dragLetterCountRef.current += 1;
    },
    [soundEnabled, hapticsEnabled],
  );

  const center = size / 2;
  const wheelRadius = center - 40;
  const positions = letterPositions(letters.length, wheelRadius);
  const hitR = hitRadius(letters.length, wheelRadius);
  const letterVisualRadius = Math.min(32, gapBetweenLetters(letters.length, wheelRadius) * 0.4);

  // Shuffle motion (HANDOVER 9.5): give each letter tile a stable identity
  // that survives a shuffle, so it can glide from its old slot to its new
  // one instead of just popping into place. `letters` only changes
  // reference on mount or on an actual shuffle (see levelReducer), so any
  // change here is a real shuffle event.
  const reduceMotion = useReducedMotionPreference();
  const [prevLettersSnapshot, setPrevLettersSnapshot] = useState(letters);
  const [slotToInstance, setSlotToInstance] = useState<number[]>(() =>
    identitySlots(letters.length),
  );
  const [shuffleToken, setShuffleToken] = useState(0);
  if (letters !== prevLettersSnapshot) {
    const nextMapping =
      letters.length === prevLettersSnapshot.length
        ? matchLettersToSlots(prevLettersSnapshot, slotToInstance, letters)
        : identitySlots(letters.length);
    setSlotToInstance(nextMapping);
    setPrevLettersSnapshot(letters);
    setShuffleToken((t) => t + 1);
  }

  const getLocalPoint = useCallback(
    (clientX: number, clientY: number): Point => {
      const rect = rectRef.current;
      if (!rect) {
        return { x: 0, y: 0 };
      }
      // Local coordinates are relative to the wheel's own centre, matching
      // the (0,0)-centred positions from letterPositions.
      const scaleX = size / rect.width;
      const scaleY = size / rect.height;
      return {
        x: (clientX - rect.left) * scaleX - center,
        y: (clientY - rect.top) * scaleY - center,
      };
    },
    [center, size],
  );

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    rectRef.current = e.currentTarget.getBoundingClientRect();
    const point = getLocalPoint(e.clientX, e.clientY);
    const index = nearestIndex(point, positions, hitR);
    if (index === -1) {
      return;
    }
    if (tapMode) {
      // Tap mode: one tap selects one letter; submitting happens via the
      // tick button (or Enter), not automatically on release, so skip the
      // drag/trail machinery below entirely.
      onSelect(index);
      dragLetterCountRef.current = 0;
      emitLetterFeedback(index);
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    setPointerPos(point);
    onSelect(index);
    dragLetterCountRef.current = 0;
    emitLetterFeedback(index);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDragging) {
      return;
    }
    const point = getLocalPoint(e.clientX, e.clientY);
    setPointerPos(point);
    const index = nearestIndex(point, positions, hitR);
    if (index !== -1) {
      onSelect(index);
      if (index !== lastFeedbackIndexRef.current) {
        emitLetterFeedback(index);
      }
    }
  };

  const endDrag = () => {
    if (!isDragging) {
      return;
    }
    setIsDragging(false);
    setPointerPos(null);
    onSubmit();
  };

  // Keyboard control (Section 8): typing a letter selects the first unused
  // wheel position with that letter, Enter submits, Backspace removes the
  // last selected letter, Space shuffles. Attached to the window rather than
  // the SVG so it works regardless of DOM focus, matching a single-screen
  // game where the wheel is the primary input.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }
      if (e.key === 'Enter') {
        onSubmit();
        return;
      }
      if (e.key === 'Backspace') {
        // Reuse the level reducer's own backtracking (selecting the
        // second-to-last selected position removes the last one) rather than
        // inventing a second removal mechanism.
        const secondLast = selection[selection.length - 2];
        if (secondLast !== undefined) {
          onSelect(secondLast);
        } else if (selection.length === 1) {
          onClear?.();
        }
        return;
      }
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        onShuffle?.();
        return;
      }
      if (/^[a-zA-Z]$/.test(e.key)) {
        const upper = e.key.toUpperCase();
        const index = letters.findIndex((letter, i) => letter === upper && !selection.includes(i));
        if (index !== -1) {
          onSelect(index);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [letters, selection, onSelect, onSubmit, onShuffle, onClear]);

  const trailPoints = [
    ...selection.map((i) => positions[i]),
    ...(isDragging && pointerPos ? [pointerPos] : []),
  ]
    .filter((p): p is Point => p !== undefined)
    .map((p) => `${p.x + center},${p.y + center}`)
    .join(' ');

  return (
    // The extra wrapper div (vs. returning the <svg> directly) only exists to
    // host the tap-mode tick/cross buttons alongside it; it changes no
    // existing markup or behaviour.
    <div className={styles.wheelWrapper}>
      <svg
        className={styles.wheel}
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        role="group"
        aria-label="Letter wheel"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {trailPoints && <polyline className={styles.trail} points={trailPoints} />}
        {letters.map((letter, i) => {
          const pos = positions[i];
          if (!pos) {
            return null;
          }
          const selected = selection.includes(i);
          const instanceId = slotToInstance[i] ?? i;
          const target = { x: pos.x + center, y: pos.y + center, opacity: 1 };
          // Reduced motion: remount (fresh key per shuffle) and fade in
          // place instead of gliding, per HANDOVER 9.5.
          const key = reduceMotion ? `${instanceId}-${shuffleToken}` : instanceId;
          return (
            <motion.g
              key={key}
              initial={reduceMotion ? { ...target, opacity: 0.3 } : false}
              animate={target}
              transition={
                reduceMotion
                  ? { duration: 0.18, ease: 'easeInOut' }
                  : { duration: SHUFFLE_SECONDS, ease: 'easeInOut' }
              }
              aria-label={`Letter ${letter}, position ${i + 1}${selected ? ', selected' : ''}`}
            >
              <circle
                className={`${styles.letterCircle} ${selected ? styles.selected : ''}`}
                r={letterVisualRadius}
              />
              <text
                className={`${styles.letterText} ${selected ? styles.selected : ''}`}
                fontSize={letterVisualRadius}
              >
                {letter}
              </text>
            </motion.g>
          );
        })}
      </svg>
      {tapMode && (
        <div className={styles.tapControls}>
          <button
            type="button"
            className={styles.tapButton}
            aria-label="Clear selection"
            disabled={selection.length === 0}
            onClick={() => onClear?.()}
          >
            &#10005;
          </button>
          <button
            type="button"
            className={`${styles.tapButton} ${styles.tapSubmit}`}
            aria-label="Submit word"
            disabled={selection.length === 0}
            onClick={onSubmit}
          >
            &#10003;
          </button>
        </div>
      )}
    </div>
  );
}
