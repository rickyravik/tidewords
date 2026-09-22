import { afterEach, describe, expect, it, vi } from 'vitest';
import { isHapticsSupported, vibrateLetterSelect, vibrateSuccess } from './haptics';

function withVibrate(fn: ((pattern: number | number[]) => boolean) | undefined) {
  const original = Object.getOwnPropertyDescriptor(navigator, 'vibrate');
  Object.defineProperty(navigator, 'vibrate', {
    value: fn,
    configurable: true,
  });
  return () => {
    if (original) {
      Object.defineProperty(navigator, 'vibrate', original);
    } else {
      // @ts-expect-error - deleting a property that may not exist on the type
      delete navigator.vibrate;
    }
  };
}

describe('isHapticsSupported', () => {
  afterEach(() => {
    // no-op; each test restores navigator.vibrate itself
  });

  it('is false when navigator.vibrate is not a function (e.g. iOS Safari)', () => {
    const restore = withVibrate(undefined);
    try {
      expect(isHapticsSupported()).toBe(false);
    } finally {
      restore();
    }
  });

  it('is true when navigator.vibrate exists', () => {
    const restore = withVibrate(vi.fn());
    try {
      expect(isHapticsSupported()).toBe(true);
    } finally {
      restore();
    }
  });
});

describe('vibrateLetterSelect / vibrateSuccess', () => {
  it('calls navigator.vibrate with the documented durations when supported', () => {
    const vibrate = vi.fn();
    const restore = withVibrate(vibrate);
    try {
      vibrateLetterSelect();
      vibrateSuccess();
      expect(vibrate).toHaveBeenNthCalledWith(1, 10);
      expect(vibrate).toHaveBeenNthCalledWith(2, 30);
    } finally {
      restore();
    }
  });

  it('does nothing (no throw) when the Vibration API is unsupported', () => {
    const restore = withVibrate(undefined);
    try {
      expect(() => vibrateLetterSelect()).not.toThrow();
      expect(() => vibrateSuccess()).not.toThrow();
    } finally {
      restore();
    }
  });

  it('never throws even if navigator.vibrate itself throws', () => {
    const restore = withVibrate(() => {
      throw new Error('blocked');
    });
    try {
      expect(() => vibrateLetterSelect()).not.toThrow();
    } finally {
      restore();
    }
  });
});
