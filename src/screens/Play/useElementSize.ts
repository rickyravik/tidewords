import { useEffect, useState } from 'react';
import type { Size } from './layout';

/**
 * Tracks an element's content-box size with a ResizeObserver. Returns a ref
 * callback plus the latest size, or null until measured (and always null
 * where ResizeObserver doesn't exist, e.g. jsdom — callers fall back).
 */
export function useElementSize<T extends Element>(): [(el: T | null) => void, Size | null] {
  const [element, setElement] = useState<T | null>(null);
  const [size, setSize] = useState<Size | null>(null);

  useEffect(() => {
    if (!element || typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) {
        return;
      }
      const { width, height } = entry.contentRect;
      setSize((prev) =>
        prev && prev.width === width && prev.height === height ? prev : { width, height },
      );
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  return [setElement, size];
}
