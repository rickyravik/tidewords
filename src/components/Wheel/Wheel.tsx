import { useCallback, useRef, useState } from 'react';
import {
  gapBetweenLetters,
  hitRadius,
  letterPositions,
  nearestIndex,
  type Point,
} from './geometry';
import styles from './Wheel.module.css';

export interface WheelProps {
  letters: string[];
  selection: number[];
  onSelect: (index: number) => void;
  onSubmit: () => void;
  size?: number;
}

const DEFAULT_SIZE = 300;

export function Wheel({ letters, selection, onSelect, onSubmit, size = DEFAULT_SIZE }: WheelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [pointerPos, setPointerPos] = useState<Point | null>(null);
  const rectRef = useRef<DOMRect | null>(null);

  const center = size / 2;
  const wheelRadius = center - 40;
  const positions = letterPositions(letters.length, wheelRadius);
  const hitR = hitRadius(letters.length, wheelRadius);
  const letterVisualRadius = Math.min(32, gapBetweenLetters(letters.length, wheelRadius) * 0.4);

  const getLocalPoint = useCallback(
    (clientX: number, clientY: number): Point => {
      const rect = rectRef.current;
      if (!rect) {
        return { x: 0, y: 0 };
      }
      // Local coordinates are relative to the wheel's own centre, matching
      // the (0,0)-centred positions from letterPositions.
      const scaleX = size / rect.width;
      const scaleY = size / rect.height;
      return {
        x: (clientX - rect.left) * scaleX - center,
        y: (clientY - rect.top) * scaleY - center,
      };
    },
    [center, size],
  );

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    rectRef.current = e.currentTarget.getBoundingClientRect();
    const point = getLocalPoint(e.clientX, e.clientY);
    const index = nearestIndex(point, positions, hitR);
    if (index === -1) {
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    setPointerPos(point);
    onSelect(index);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDragging) {
      return;
    }
    const point = getLocalPoint(e.clientX, e.clientY);
    setPointerPos(point);
    const index = nearestIndex(point, positions, hitR);
    if (index !== -1) {
      onSelect(index);
    }
  };

  const endDrag = () => {
    if (!isDragging) {
      return;
    }
    setIsDragging(false);
    setPointerPos(null);
    onSubmit();
  };

  const trailPoints = [
    ...selection.map((i) => positions[i]),
    ...(isDragging && pointerPos ? [pointerPos] : []),
  ]
    .filter((p): p is Point => p !== undefined)
    .map((p) => `${p.x + center},${p.y + center}`)
    .join(' ');

  return (
    <svg
      className={styles.wheel}
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      role="group"
      aria-label="Letter wheel"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {trailPoints && <polyline className={styles.trail} points={trailPoints} />}
      {letters.map((letter, i) => {
        const pos = positions[i];
        if (!pos) {
          return null;
        }
        const selected = selection.includes(i);
        return (
          <g
            key={i}
            transform={`translate(${pos.x + center} ${pos.y + center})`}
            aria-label={`Letter ${letter}, position ${i + 1}${selected ? ', selected' : ''}`}
          >
            <circle
              className={`${styles.letterCircle} ${selected ? styles.selected : ''}`}
              r={letterVisualRadius}
            />
            <text
              className={`${styles.letterText} ${selected ? styles.selected : ''}`}
              fontSize={letterVisualRadius}
            >
              {letter}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
