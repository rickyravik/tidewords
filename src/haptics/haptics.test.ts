import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isHapticsSupported, vibrateLetterSelect, vibrateSuccess } from './haptics';

const native = vi.hoisted(() => ({
  isNativePlatform: vi.fn(() => false),
  impact: vi.fn(() => Promise.resolve()),
  notification: vi.fn(() => Promise.resolve()),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: native.isNativePlatform },
}));

vi.mock('@capacitor/haptics', () => ({
  Haptics: { impact: native.impact, notification: native.notification },
  ImpactStyle: { Heavy: 'HEAVY', Medium: 'MEDIUM', Light: 'LIGHT' },
  NotificationType: { Success: 'SUCCESS', Warning: 'WARNING', Error: 'ERROR' },
}));

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

describe('native (Capacitor) haptics', () => {
  beforeEach(() => {
    native.isNativePlatform.mockReturnValue(true);
  });

  afterEach(() => {
    native.isNativePlatform.mockReset();
    native.isNativePlatform.mockReturnValue(false);
    native.impact.mockClear();
    native.notification.mockClear();
  });

  it('reports haptics as supported even without navigator.vibrate (iOS)', () => {
    const restore = withVibrate(undefined);
    try {
      expect(isHapticsSupported()).toBe(true);
    } finally {
      restore();
    }
  });

  it('plays a light impact per letter instead of navigator.vibrate', async () => {
    const vibrate = vi.fn();
    const restore = withVibrate(vibrate);
    try {
      vibrateLetterSelect();
      await vi.waitFor(() => expect(native.impact).toHaveBeenCalledWith({ style: 'LIGHT' }));
      expect(vibrate).not.toHaveBeenCalled();
    } finally {
      restore();
    }
  });

  it('plays a success notification for a found word', async () => {
    vibrateSuccess();
    await vi.waitFor(() => expect(native.notification).toHaveBeenCalledWith({ type: 'SUCCESS' }));
    expect(native.impact).not.toHaveBeenCalled();
  });

  it('swallows plugin failures (no throw, no unhandled rejection)', async () => {
    native.impact.mockRejectedValueOnce(new Error('not implemented'));
    native.notification.mockImplementationOnce(() => {
      throw new Error('bridge gone');
    });
    expect(() => vibrateLetterSelect()).not.toThrow();
    expect(() => vibrateSuccess()).not.toThrow();
    await vi.waitFor(() => {
      expect(native.impact).toHaveBeenCalled();
      expect(native.notification).toHaveBeenCalled();
    });
  });

  it('falls back to the web path if the platform check itself throws', () => {
    native.isNativePlatform.mockImplementation(() => {
      throw new Error('no bridge');
    });
    const vibrate = vi.fn();
    const restore = withVibrate(vibrate);
    try {
      vibrateLetterSelect();
      expect(vibrate).toHaveBeenCalledWith(10);
    } finally {
      restore();
    }
  });
});
