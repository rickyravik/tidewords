import { motion } from 'framer-motion';
import { useLayoutEffect, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotionPreference } from '../../hooks/useReducedMotion';
import { HandIcon } from './HandIcon';
import { wheelPathFor } from './firstSwipe';
import { HAND_TIP, HAND_VIEWBOX, handKeyframes, type GuidePoint } from './handMotion';
import styles from './FirstSwipeGuide.module.css';

export interface FirstSwipeGuideProps {
  /** The live, shuffled wheel order (levelReducer's `wheelLetters`). */
  wheelLetters: readonly string[];
  /** The target word to demonstrate. */
  word: string;
  /** An element containing the Wheel. Letter positions are measured from
   *  the rendered wheel, so its size and layout can change freely. */
  wheelRef: RefObject<HTMLElement | null>;
  tapMode?: boolean;
  /** Fades the guide out without unmounting, e.g. while the player is mid-swipe. */
  hidden?: boolean;
}

interface WheelLayout {
  letters: GuidePoint[];
  letterRadius: number;
  center: GuidePoint;
  diameter: number;
}

const REMEASURE_MS = 500;
const LOOP_PAUSE_S = 1.1;
/** Below this free radius inside the ring of letters, the caption is left out. */
const MIN_CAPTION_ROOM = 48;

function centreOf(rect: DOMRect): GuidePoint {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

/** Reads each letter's on-screen centre from the Wheel's own markup (the same
 *  aria-labelled groups the e2e helpers use), in wheel position order. */
function measureWheel(container: HTMLElement | null): WheelLayout | null {
  const svg = container?.querySelector('svg[aria-label="Letter wheel"]');
  if (!svg) {
    return null;
  }
  const circles = Array.from(svg.querySelectorAll('g[aria-label^="Letter "] circle'));
  const firstCircle = circles[0];
  if (!firstCircle) {
    return null;
  }
  const rect = svg.getBoundingClientRect();
  return {
    letters: circles.map((c) => centreOf(c.getBoundingClientRect())),
    letterRadius: firstCircle.getBoundingClientRect().width / 2,
    center: centreOf(rect),
    diameter: Math.min(rect.width, rect.height),
  };
}

function sameLayout(a: WheelLayout | null, b: WheelLayout | null): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * First-launch hand (HANDOVER 10) tracing one real target word across the
 * wheel. Purely visual: aria-hidden and pointer-events: none, so it never
 * blocks play. Under reduced motion it shows a still hand on the first
 * letter with numbered steps instead of moving.
 */
export function FirstSwipeGuide({
  wheelLetters,
  word,
  wheelRef,
  tapMode = false,
  hidden = false,
}: FirstSwipeGuideProps) {
  const reduceMotion = useReducedMotionPreference();
  const [layout, setLayout] = useState<WheelLayout | null>(null);

  // Measure now, then keep re-measuring while mounted: cheap (a handful of
  // rects), and covers resizes, responsive wheel sizing and the 400ms shuffle
  // glide without needing hooks into the Wheel itself.
  useLayoutEffect(() => {
    const update = () => {
      const next = measureWheel(wheelRef.current);
      setLayout((prev) => (sameLayout(prev, next) ? prev : next));
    };
    update();
    const timer = setInterval(update, REMEASURE_MS);
    window.addEventListener('resize', update);
    return () => {
      clearInterval(timer);
      window.removeEventListener('resize', update);
    };
  }, [wheelRef, wheelLetters]);

  const path = wheelPathFor(word, wheelLetters);
  if (!layout || !path || layout.letters.length !== wheelLetters.length) {
    return null;
  }
  const points = path.map((i) => layout.letters[i]).filter((p): p is GuidePoint => !!p);
  const keyframes = handKeyframes(points, tapMode);
  const first = points[0];
  if (!keyframes || !first) {
    return null;
  }

  const handWidth = Math.max(40, Math.min(60, layout.diameter * 0.17));
  const handHeight = (handWidth * HAND_VIEWBOX.height) / HAND_VIEWBOX.width;
  // Offsets that put the fingertip, not the icon's corner, on each point.
  const tipOffset = {
    marginLeft: -(handWidth * HAND_TIP.x) / HAND_VIEWBOX.width,
    marginTop: -(handHeight * HAND_TIP.y) / HAND_VIEWBOX.height,
    // Press (scale) around the fingertip too, so it doesn't drift off the letter.
    transformOrigin: `${(HAND_TIP.x / HAND_VIEWBOX.width) * 100}% ${(HAND_TIP.y / HAND_VIEWBOX.height) * 100}%`,
  };

  const caption = tapMode ? 'Tap letters, then the tick' : 'Swipe to make a word';
  // The caption sits in the empty middle of the wheel, sized to fit inside
  // the ring of letters whatever size the wheel currently is.
  const captionRoom =
    Math.hypot(first.x - layout.center.x, first.y - layout.center.y) - layout.letterRadius;

  // Reduced motion: a still hand resting just below the first letter, so it
  // points at it without covering the glyph.
  const restingTip = { x: first.x, y: first.y + layout.letterRadius * 0.55 };

  // Numbered step badges sit just outside each letter, away from the centre.
  const stepBadge = (p: GuidePoint) => {
    const dx = p.x - layout.center.x;
    const dy = p.y - layout.center.y;
    const len = Math.hypot(dx, dy) || 1;
    const push = layout.letterRadius * 0.95;
    return { left: p.x + (dx / len) * push, top: p.y + (dy / len) * push };
  };

  return createPortal(
    <div
      className={`${styles.overlay} ${hidden ? styles.hidden : ''}`}
      aria-hidden="true"
      data-testid="first-swipe-guide"
    >
      {!tapMode && points.length > 1 && (
        <svg className={styles.pathLayer}>
          <polyline className={styles.path} points={points.map((p) => `${p.x},${p.y}`).join(' ')} />
        </svg>
      )}
      {reduceMotion &&
        points.map((p, i) => (
          <span key={i} className={styles.step} style={stepBadge(p)}>
            {i + 1}
          </span>
        ))}
      <motion.div
        className={styles.hand}
        style={{ width: handWidth, height: handHeight, ...tipOffset }}
        initial={{ x: first.x, y: first.y, opacity: 0, scale: 1 }}
        animate={
          reduceMotion
            ? { x: restingTip.x, y: restingTip.y, opacity: 1, scale: 1 }
            : {
                x: keyframes.x,
                y: keyframes.y,
                opacity: keyframes.opacity,
                scale: keyframes.scale,
              }
        }
        transition={
          reduceMotion
            ? { duration: 0 }
            : {
                duration: keyframes.duration,
                times: keyframes.times,
                ease: 'easeInOut',
                repeat: Infinity,
                repeatDelay: LOOP_PAUSE_S,
              }
        }
      >
        <HandIcon />
      </motion.div>
      {captionRoom >= MIN_CAPTION_ROOM && (
        <p
          className={styles.caption}
          style={{ left: layout.center.x, top: layout.center.y, maxWidth: captionRoom * 1.65 }}
        >
          {caption}
        </p>
      )}
    </div>,
    document.body,
  );
}
