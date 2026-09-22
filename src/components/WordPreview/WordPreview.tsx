import type { SubmitResult } from '../../game/types';
import styles from './WordPreview.module.css';

export interface WordPreviewProps {
  word: string;
  resultKind?: SubmitResult['kind'] | null;
}

function variantClass(resultKind: SubmitResult['kind'] | null | undefined): string {
  switch (resultKind) {
    case 'found':
    case 'repeat':
      return styles.found ?? '';
    case 'bonus':
      return styles.bonus ?? '';
    case 'invalid':
    case 'tooShort':
      return styles.invalid ?? '';
    default:
      return '';
  }
}

export function WordPreview({ word, resultKind }: WordPreviewProps) {
  return (
    <div className={`${styles.pill} ${variantClass(resultKind)}`} aria-live="polite">
      {word || ' '}
    </div>
  );
}
