/**
 * Haptic feedback for the wheel and found words (HANDOVER.md section 9.6).
 *
 * Uses `navigator.vibrate`, feature-detected. iOS Safari (and any other browser without the
 * Vibration API) silently no-ops.
 *
 * Nothing here ever throws. Callers gate these on the `settings.haptics` toggle themselves
 * (see Wheel.tsx / Play.tsx), matching how sound is gated at the call site too.
 */

export function isHapticsSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

function vibrate(pattern: number | number[]): void {
  if (!isHapticsSupported()) {
    return;
  }
  try {
    navigator.vibrate(pattern);
  } catch {
    // Never let a vibration failure break the UI.
  }
}

/** A ~10ms buzz for each letter selected on the wheel. */
export function vibrateLetterSelect(): void {
  vibrate(10);
}

/** A ~30ms buzz for a correct (found or bonus) word. */
export function vibrateSuccess(): void {
  vibrate(30);
}
