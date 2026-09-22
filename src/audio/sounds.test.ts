import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isAudioSupported,
  playBonus,
  playFound,
  playInvalid,
  playLetterTick,
  playLevelComplete,
  setMusicEnabled,
  setSoundEnabled,
  tickFrequency,
} from './sounds';

describe('tickFrequency', () => {
  it('starts at the base A4 frequency for the first letter', () => {
    expect(tickFrequency(0)).toBeCloseTo(440);
  });

  it('rises with each subsequent letter index', () => {
    expect(tickFrequency(1)).toBeGreaterThan(tickFrequency(0));
    expect(tickFrequency(2)).toBeGreaterThan(tickFrequency(1));
  });

  it('clamps the rise so very long words do not shriek', () => {
    const capped = tickFrequency(14);
    expect(tickFrequency(30)).toBeCloseTo(capped);
  });

  it('never goes below the base frequency for a negative index', () => {
    expect(tickFrequency(-5)).toBeCloseTo(440);
  });
});

describe('isAudioSupported', () => {
  it('is false in jsdom, which has no Web Audio API', () => {
    expect(isAudioSupported()).toBe(false);
  });
});

describe('playback functions without Web Audio support', () => {
  it('never throw, sound enabled or not', () => {
    setSoundEnabled(true);
    expect(() => playLetterTick(0)).not.toThrow();
    expect(() => playFound()).not.toThrow();
    expect(() => playBonus()).not.toThrow();
    expect(() => playInvalid()).not.toThrow();
    expect(() => playLevelComplete()).not.toThrow();
    setSoundEnabled(false);
    expect(() => playLetterTick(0)).not.toThrow();
    setMusicEnabled(true);
    setMusicEnabled(false);
  });
});

// A minimal fake AudioContext, just enough to exercise the gating logic in
// sounds.ts (whether an oscillator gets created at all) without asserting on
// actual audio output, which jsdom cannot produce.
class FakeParam {
  value = 0;
  setValueAtTime = vi.fn();
  linearRampToValueAtTime = vi.fn();
  exponentialRampToValueAtTime = vi.fn();
  cancelScheduledValues = vi.fn();
}

class FakeNode {
  connect = vi.fn();
}

class FakeOscillator extends FakeNode {
  type = 'sine';
  frequency = new FakeParam();
  start = vi.fn();
  stop = vi.fn();
}

class FakeGain extends FakeNode {
  gain = new FakeParam();
}

// Shared across instances (sounds.ts caches a single AudioContext after first use),
// so tests can assert on it directly instead of reaching into module internals.
const createOscillatorSpy = vi.fn(() => new FakeOscillator());

class FakeAudioContext {
  state: 'running' | 'suspended' = 'running';
  currentTime = 0;
  destination = new FakeNode();
  resume = vi.fn().mockResolvedValue(undefined);
  createOscillator = createOscillatorSpy;
  createGain = vi.fn(() => new FakeGain());
}

describe('gating with a Web Audio API available', () => {
  let originalAudioContext: unknown;

  beforeEach(() => {
    originalAudioContext = (window as unknown as { AudioContext?: unknown }).AudioContext;
    (window as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
    createOscillatorSpy.mockClear();
  });

  afterEach(() => {
    (window as unknown as { AudioContext: unknown }).AudioContext = originalAudioContext;
    setSoundEnabled(true);
    setMusicEnabled(false);
  });

  it('reports support once AudioContext exists', () => {
    expect(isAudioSupported()).toBe(true);
  });

  it('creates an oscillator when sound is enabled', () => {
    setSoundEnabled(true);
    playFound();
    expect(createOscillatorSpy).toHaveBeenCalled();
  });

  it('creates no oscillator when sound is disabled', () => {
    setSoundEnabled(false);
    playFound();
    playInvalid();
    playLevelComplete();
    playLetterTick(0);
    expect(createOscillatorSpy).not.toHaveBeenCalled();
  });

  it('starting and stopping music does not throw', () => {
    setSoundEnabled(true);
    expect(() => setMusicEnabled(true)).not.toThrow();
    expect(() => setMusicEnabled(false)).not.toThrow();
  });
});
