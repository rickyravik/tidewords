/**
 * Small Web Audio API sound manager.
 *
 * All sounds are synthesised at runtime (oscillators + gain envelopes) rather than
 * shipped as audio files, per the HANDOVER.md originality rule (no third-party assets
 * without a recorded licence). Howler.js is an installed dependency but isn't needed
 * here: raw Web Audio gives simpler control over pitch/envelope for tones this short,
 * and needs no asset loading or decoding.
 *
 * Feature-detected throughout: on a browser/environment without Web Audio (or in
 * jsdom under test), every exported function is a safe no-op.
 */

let soundEnabled = true;
let musicEnabled = false;

let audioContext: AudioContext | null = null;
let musicStop: (() => void) | null = null;

type AudioContextCtor = typeof AudioContext;

function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') {
    return null;
  }
  // Safari (older versions) only exposes webkitAudioContext.
  const withWebkit = window as unknown as { webkitAudioContext?: AudioContextCtor };
  return window.AudioContext ?? withWebkit.webkitAudioContext ?? null;
}

/** Lazily creates (and resumes) the shared AudioContext. Returns null if unsupported. */
function getContext(): AudioContext | null {
  const Ctor = getAudioContextCtor();
  if (!Ctor) {
    return null;
  }
  if (!audioContext) {
    audioContext = new Ctor();
  }
  if (audioContext.state === 'suspended') {
    // Only succeeds when called from within a user-gesture call stack; harmless
    // no-op rejection otherwise (we just stay suspended until the next attempt).
    void audioContext.resume().catch(() => {});
  }
  return audioContext;
}

/** True when this environment can synthesise audio at all. Exposed for tests. */
export function isAudioSupported(): boolean {
  return getAudioContextCtor() !== null;
}

interface ToneOptions {
  duration: number; // seconds
  type?: OscillatorType;
  peakGain?: number; // 0-1
  delay?: number; // seconds from now
}

function playTone(ctx: AudioContext, frequency: number, options: ToneOptions): void {
  const { duration, type = 'sine', peakGain = 0.2, delay = 0 } = options;
  const startAt = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startAt);
  // Quick attack, exponential decay: a short pluck/chime envelope rather than a click.
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.linearRampToValueAtTime(peakGain, startAt + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.03);
}

const TICK_BASE_FREQUENCY = 440; // A4
const TICK_SEMITONE_STEP = Math.pow(2, 1 / 12);
const TICK_MAX_STEPS = 14; // cap the rise so long words don't shriek

/** The letter-tick pitch for the given 0-based letter index in the current word. */
export function tickFrequency(letterIndex: number): number {
  const steps = Math.max(0, Math.min(letterIndex, TICK_MAX_STEPS));
  return TICK_BASE_FREQUENCY * Math.pow(TICK_SEMITONE_STEP, steps);
}

/** Fires as each letter is added to the current selection; pitch rises with letterIndex. */
export function playLetterTick(letterIndex: number): void {
  if (!soundEnabled) {
    return;
  }
  const ctx = getContext();
  if (!ctx) {
    return;
  }
  playTone(ctx, tickFrequency(letterIndex), { duration: 0.09, type: 'sine', peakGain: 0.14 });
}

/** Soft two-note chime for a newly found word. */
export function playFound(): void {
  if (!soundEnabled) {
    return;
  }
  const ctx = getContext();
  if (!ctx) {
    return;
  }
  playTone(ctx, 659.25, { duration: 0.18, peakGain: 0.18 }); // E5
  playTone(ctx, 987.77, { duration: 0.24, peakGain: 0.16, delay: 0.06 }); // B5
}

/** Lower chime for a bonus word. */
export function playBonus(): void {
  if (!soundEnabled) {
    return;
  }
  const ctx = getContext();
  if (!ctx) {
    return;
  }
  playTone(ctx, 392, { duration: 0.2, peakGain: 0.18 }); // G4
  playTone(ctx, 587.33, { duration: 0.26, peakGain: 0.15, delay: 0.07 }); // D5
}

/** Quiet thud for an invalid word. */
export function playInvalid(): void {
  if (!soundEnabled) {
    return;
  }
  const ctx = getContext();
  if (!ctx) {
    return;
  }
  playTone(ctx, 130.81, { duration: 0.16, type: 'triangle', peakGain: 0.16 }); // C3
}

/** Short fanfare on level complete. */
export function playLevelComplete(): void {
  if (!soundEnabled) {
    return;
  }
  const ctx = getContext();
  if (!ctx) {
    return;
  }
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  notes.forEach((frequency, i) => {
    playTone(ctx, frequency, { duration: 0.26, peakGain: 0.2, delay: i * 0.09 });
  });
}

function startMusic(): void {
  if (musicStop) {
    return; // already playing
  }
  const ctx = getContext();
  if (!ctx) {
    return;
  }
  // A very quiet, slow-drifting two-oscillator pad, meant to stand in for an
  // ambient sea loop. No bundled audio file: see the module doc comment.
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 2);
  gain.connect(ctx.destination);

  const drone = ctx.createOscillator();
  drone.type = 'sine';
  drone.frequency.setValueAtTime(110, ctx.currentTime); // A2

  const shimmer = ctx.createOscillator();
  shimmer.type = 'sine';
  shimmer.frequency.setValueAtTime(164.81, ctx.currentTime); // E3

  // Slow LFO on the shimmer's gain so it swells and fades like a tide.
  const shimmerGain = ctx.createGain();
  shimmerGain.gain.setValueAtTime(0, ctx.currentTime);
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(0.07, ctx.currentTime); // roughly one swell per 14s
  const lfoGain = ctx.createGain();
  lfoGain.gain.setValueAtTime(0.4, ctx.currentTime);
  lfo.connect(lfoGain);
  lfoGain.connect(shimmerGain.gain);

  drone.connect(gain);
  shimmer.connect(shimmerGain);
  shimmerGain.connect(gain);

  drone.start();
  shimmer.start();
  lfo.start();

  musicStop = () => {
    const now = ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.6);
    drone.stop(now + 0.7);
    shimmer.stop(now + 0.7);
    lfo.stop(now + 0.7);
  };
}

function stopMusic(): void {
  musicStop?.();
  musicStop = null;
}

/** Enables/disables one-shot sound effects (ticks, chimes, fanfare). */
export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
}

/** Enables/disables the ambient music loop, starting or stopping it immediately. */
export function setMusicEnabled(enabled: boolean): void {
  musicEnabled = enabled;
  if (musicEnabled) {
    startMusic();
  } else {
    stopMusic();
  }
}
