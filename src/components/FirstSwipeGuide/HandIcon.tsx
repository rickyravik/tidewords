import { HAND_TIP, HAND_VIEWBOX } from './handMotion';

/** An original, flat pointing hand: chalk fill, deep sea outline, brass touch glow. */
export function HandIcon() {
  return (
    <svg
      viewBox={`0 0 ${HAND_VIEWBOX.width} ${HAND_VIEWBOX.height}`}
      width="100%"
      height="100%"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx={HAND_TIP.x} cy={HAND_TIP.y} r="6" fill="var(--brass)" opacity="0.55" />
      <g fill="var(--chalk)" stroke="var(--deep-sea)" strokeWidth="1.6" strokeLinejoin="round">
        <rect x="1" y="25" width="14" height="8" rx="4" transform="rotate(-28 8 29)" />
        <rect x="8" y="22" width="30" height="24" rx="10" />
        <rect x="32" y="21" width="6.5" height="11" rx="3.25" />
        <rect x="25.5" y="18" width="7.5" height="13" rx="3.75" />
        <rect x="18.5" y="16" width="8" height="14" rx="4" />
        <rect x="9" y="1" width="10" height="27" rx="5" />
      </g>
    </svg>
  );
}
