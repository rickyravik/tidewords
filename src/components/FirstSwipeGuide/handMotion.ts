export interface GuidePoint {
  x: number;
  y: number;
}

/** The hand icon's viewBox, and where its fingertip sits inside it. */
export const HAND_VIEWBOX = { width: 40, height: 48 };
export const HAND_TIP = { x: 14, y: 2 };

export interface HandKeyframes {
  x: number[];
  y: number[];
  opacity: number[];
  scale: number[];
  /** 0..1 offsets into `duration`, one per keyframe. */
  times: number[];
  /** Seconds for one loop, excluding the pause between loops. */
  duration: number;
}

const FADE_S = 0.3;
const PRESS_S = 0.3;
const SWIPE_SEGMENT_S = 0.55;
const TAP_MOVE_S = 0.45;
const TAP_PRESS_S = 0.15;
const PRESSED_SCALE = 0.86;

/**
 * One loop of the guide hand. Swipe: fade in on the first letter, press,
 * glide through each letter without lifting, release, fade out. Tap mode:
 * move to each letter in turn and press it.
 */
export function handKeyframes(
  points: readonly GuidePoint[],
  tapMode: boolean,
): HandKeyframes | null {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) {
    return null;
  }
  const frames: { at: number; p: GuidePoint; opacity: number; scale: number }[] = [];
  let t = 0;
  const push = (p: GuidePoint, opacity: number, scale: number) =>
    frames.push({ at: t, p, opacity, scale });

  push(first, 0, 1);
  t += FADE_S;
  push(first, 1, 1);

  if (tapMode) {
    points.forEach((p, i) => {
      if (i > 0) {
        t += TAP_MOVE_S;
        push(p, 1, 1);
      }
      t += TAP_PRESS_S;
      push(p, 1, PRESSED_SCALE);
      t += TAP_PRESS_S;
      push(p, 1, 1);
    });
  } else {
    t += PRESS_S;
    push(first, 1, PRESSED_SCALE);
    points.slice(1).forEach((p) => {
      t += SWIPE_SEGMENT_S;
      push(p, 1, PRESSED_SCALE);
    });
    t += PRESS_S;
    push(last, 1, 1);
  }

  t += FADE_S;
  push(last, 0, 1);

  return {
    x: frames.map((f) => f.p.x),
    y: frames.map((f) => f.p.y),
    opacity: frames.map((f) => f.opacity),
    scale: frames.map((f) => f.scale),
    times: frames.map((f) => f.at / t),
    duration: t,
  };
}
