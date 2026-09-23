import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useReducedMotionPreference } from '../../hooks/useReducedMotion';
import {
  COINS_MESSAGE_MS,
  HELPER_COSTS,
  notEnoughCoinsMessage,
  type PaidHelper,
} from './coinsMessage';
import styles from './HelperButtons.module.css';

export interface HelperButtonsProps {
  coins: number;
  onShuffle: () => void;
  onHint: () => void;
  onReveal: () => void;
  /** While Reveal's tile picker is armed, tapping Reveal again cancels it,
   *  so it must stay usable even if the balance has since dropped below 75. */
  revealArmed?: boolean;
}

/**
 * Shuffle, Hint and Reveal. An unaffordable helper stays greyed out with its
 * cost shown (Section 4) but still takes the tap, so it can explain why
 * (Section 9.7) instead of silently doing nothing. It never spends coins.
 */
export function HelperButtons({
  coins,
  onShuffle,
  onHint,
  onReveal,
  revealArmed,
}: HelperButtonsProps) {
  const reduceMotion = useReducedMotionPreference();
  // A fresh object per tap (via `tap`) restarts the timer when the same
  // message is tapped again while still showing.
  const [notice, setNotice] = useState<{ text: string; tap: number } | null>(null);

  useEffect(() => {
    if (!notice) {
      return;
    }
    const timer = setTimeout(() => setNotice(null), COINS_MESSAGE_MS);
    // It floats over the bottom of the wheel, so the next touch anywhere
    // (e.g. starting a swipe) dismisses it early. Attached after the tap
    // that showed it, so that tap doesn't count.
    const dismiss = () => setNotice(null);
    window.addEventListener('pointerdown', dismiss);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('pointerdown', dismiss);
    };
  }, [notice]);

  const unaffordable = (helper: PaidHelper) =>
    coins < HELPER_COSTS[helper] && !(helper === 'reveal' && revealArmed);

  const handlePaidTap = (helper: PaidHelper, action: () => void) => {
    if (unaffordable(helper)) {
      const text = notEnoughCoinsMessage(helper);
      setNotice((prev) => ({ text, tap: (prev?.tap ?? 0) + 1 }));
      return;
    }
    setNotice(null);
    action();
  };

  const paidButton = (helper: PaidHelper, label: string, action: () => void) => {
    const blocked = unaffordable(helper);
    return (
      <button
        type="button"
        className={`${styles.button} ${blocked ? styles.unaffordable : ''}`}
        // aria-disabled (not `disabled`) so the tap still arrives and can
        // explain the coin shortfall.
        aria-disabled={blocked ? 'true' : undefined}
        aria-pressed={helper === 'reveal' && revealArmed !== undefined ? revealArmed : undefined}
        onClick={() => handlePaidTap(helper, action)}
      >
        {label}
        <span className={styles.cost}>{HELPER_COSTS[helper]} coins</span>
      </button>
    );
  };

  return (
    <div className={styles.helpers}>
      {/* Screen reader copy lives in its own always-mounted live region, so it
          is announced on arrival and cleared on time regardless of the fade. */}
      <p role="status" aria-live="polite" className={styles.srOnly}>
        {notice?.text ?? ''}
      </p>
      <div className={styles.noticeRegion} aria-hidden="true">
        <AnimatePresence>
          {notice && (
            <motion.p
              key="coins-notice"
              className={styles.notice}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              {notice.text}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
      <div className={styles.row}>
        <button type="button" className={styles.button} onClick={onShuffle}>
          Shuffle
          <span className={styles.cost}>Free</span>
        </button>
        {paidButton('hint', 'Hint', onHint)}
        {paidButton('reveal', 'Reveal', onReveal)}
      </div>
    </div>
  );
}
