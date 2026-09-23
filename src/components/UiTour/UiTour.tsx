import { motion } from 'framer-motion';
import { useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotionPreference } from '../../hooks/useReducedMotion';
import type { TourStep } from './steps';
import styles from './UiTour.module.css';

export interface UiTourProps {
  steps: readonly TourStep[];
  onFinish: () => void;
}

const REMEASURE_MS = 500;
const SPOTLIGHT_PAD = 6;
const CARD_WIDTH = 260;
const CARD_MARGIN = 16;

// Only one Play screen is ever mounted at a time, so each `data-tour` target
// is unique on the page — no need to scope the query to a container ref.
function measure(selector: string): DOMRect | null {
  return document.querySelector(selector)?.getBoundingClientRect() ?? null;
}

/**
 * First-launch coach marks (see FirstSwipeGuide for the wheel's own hand
 * demo): a single spotlight steps through `steps` in order, dimming
 * everything else on screen. Modal by design — the backdrop takes the tap
 * that advances it, so a new player reads each caption before playing.
 */
export function UiTour({ steps, onFinish }: UiTourProps) {
  const reduceMotion = useReducedMotionPreference();
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = steps[index];

  useLayoutEffect(() => {
    if (!step) {
      return;
    }
    const update = () => setRect(measure(step.selector));
    update();
    const timer = setInterval(update, REMEASURE_MS);
    window.addEventListener('resize', update);
    return () => {
      clearInterval(timer);
      window.removeEventListener('resize', update);
    };
  }, [step]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onFinish();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onFinish]);

  if (!step) {
    return null;
  }

  const advance = () => {
    if (index + 1 < steps.length) {
      setIndex(index + 1);
    } else {
      onFinish();
    }
  };

  if (!rect) {
    // Target not mounted yet (e.g. layout still measuring): skip it rather
    // than stall the whole tour on one missing element.
    return createPortal(
      <div className={styles.overlay} data-testid="ui-tour" onClick={advance} />,
      document.body,
    );
  }

  const spotlight = {
    left: rect.left - SPOTLIGHT_PAD,
    top: rect.top - SPOTLIGHT_PAD,
    width: rect.width + SPOTLIGHT_PAD * 2,
    height: rect.height + SPOTLIGHT_PAD * 2,
  };

  const targetCenterX = rect.left + rect.width / 2;
  const below = rect.top < window.innerHeight / 2;
  const cardLeft = Math.min(
    Math.max(targetCenterX - CARD_WIDTH / 2, CARD_MARGIN),
    window.innerWidth - CARD_WIDTH - CARD_MARGIN,
  );
  const cardTop = below ? spotlight.top + spotlight.height + 12 : undefined;
  const cardBottom = below ? undefined : window.innerHeight - spotlight.top + 12;

  return createPortal(
    <div
      className={styles.overlay}
      data-testid="ui-tour"
      role="dialog"
      aria-modal="true"
      aria-label={`${step.title}, step ${index + 1} of ${steps.length}`}
      onClick={advance}
    >
      <motion.div
        className={styles.spotlight}
        initial={false}
        animate={spotlight}
        transition={{ duration: reduceMotion ? 0 : 0.25, ease: 'easeInOut' }}
      />
      <motion.div
        key={index}
        className={styles.card}
        style={{ left: cardLeft, top: cardTop, bottom: cardBottom, width: CARD_WIDTH }}
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: below ? -8 : 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0.1 : 0.18, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className={styles.title}>{step.title}</p>
        <p className={styles.body}>{step.body}</p>
        <div className={styles.footer}>
          <span className={styles.progress}>
            {index + 1} / {steps.length}
          </span>
          <button type="button" className={styles.skip} onClick={onFinish}>
            Skip
          </button>
          <button type="button" className={styles.next} onClick={advance}>
            {index + 1 < steps.length ? 'Next' : 'Got it'}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
