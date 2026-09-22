import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useProfileStore } from '../state/profileStore';
import { useReducedMotionPreference } from './useReducedMotion';

afterEach(() => {
  useProfileStore.getState().resetProgress();
});

describe('useReducedMotionPreference', () => {
  it('is false when neither the OS nor the profile setting prefers reduced motion', () => {
    const { result } = renderHook(() => useReducedMotionPreference());
    expect(result.current).toBe(false);
  });

  it('is true when the profile setting is on, even without OS support for matchMedia', () => {
    useProfileStore.getState().updateSettings({ reducedMotion: true });
    const { result } = renderHook(() => useReducedMotionPreference());
    expect(result.current).toBe(true);
  });
});
