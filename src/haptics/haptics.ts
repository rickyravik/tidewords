import { Capacitor } from '@capacitor/core';

/**
 * Haptic feedback for the wheel and found words (HANDOVER.md section 9.6).
 *
 * - Native (Capacitor Android/iOS build): the @capacitor/haptics plugin, which is the only way to
 *   get haptics on iOS. It is loaded with a dynamic import so the web bundle doesn't carry it.
 * - Web: `navigator.vibrate`, feature-detected. iOS Safari (and any other browser without the
 *   Vibration API) silently no-ops.
 *
 * Nothing here ever throws. Callers gate these on the `settings.haptics` toggle themselves
 * (see Wheel.tsx / Play.tsx), matching how sound is gated at the call site too.
 */

type NativeHaptics = typeof import('@capacitor/haptics');

let nativeHaptics: Promise<NativeHaptics | null> | undefined;

function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

function loadNativeHaptics(): Promise<NativeHaptics | null> {
  nativeHaptics ??= import('@capacitor/haptics').catch(() => null);
  return nativeHaptics;
}

async function runNative(play: (haptics: NativeHaptics) => Promise<void>): Promise<void> {
  try {
    const haptics = await loadNativeHaptics();
    if (haptics) {
      await play(haptics);
    }
  } catch {
    // Never let a haptics failure break the UI.
  }
}

// Start loading the plugin at startup in the native shell so the first letter isn't delayed.
if (isNative()) {
  void loadNativeHaptics();
}

export function isHapticsSupported(): boolean {
  return (
    isNative() || (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function')
  );
}

function vibrate(pattern: number | number[]): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return;
  }
  try {
    navigator.vibrate(pattern);
  } catch {
    // Never let a vibration failure break the UI.
  }
}

/** A light tap (native) or ~10ms buzz (web) for each letter selected on the wheel. */
export function vibrateLetterSelect(): void {
  if (isNative()) {
    void runNative((h) => h.Haptics.impact({ style: h.ImpactStyle.Light }));
    return;
  }
  vibrate(10);
}

/** A success notification (native) or ~30ms buzz (web) for a correct (found or bonus) word. */
export function vibrateSuccess(): void {
  if (isNative()) {
    void runNative((h) => h.Haptics.notification({ type: h.NotificationType.Success }));
    return;
  }
  vibrate(30);
}
