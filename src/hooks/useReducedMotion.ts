import { useReducedMotion as useFramerReducedMotion } from 'framer-motion';
import { useProfileStore } from '../state/profileStore';

/**
 * Whether motion should be reduced right now. Combines two signals, either
 * of which is enough (HANDOVER 9.5): the OS-level `prefers-reduced-motion`
 * media query (via Framer Motion's `useReducedMotion`, which is a sensible
 * default even before Settings exists) and the profile's own
 * `settings.reducedMotion` toggle.
 */
export function useReducedMotionPreference(): boolean {
  const osPrefers = useFramerReducedMotion();
  const settingPrefers = useProfileStore((s) => s.settings.reducedMotion);
  return Boolean(osPrefers) || settingPrefers;
}
