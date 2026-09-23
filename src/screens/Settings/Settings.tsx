import { useState } from 'react';
import { isHapticsSupported } from '../../haptics/haptics';
import { useProfileStore, type Settings as SettingsData } from '../../state/profileStore';
import styles from './Settings.module.css';

export interface SettingsProps {
  /** Optional back navigation; Settings itself does no routing (see App.tsx wiring note). */
  onBack?: () => void;
}

interface ToggleConfig {
  key: keyof SettingsData;
  label: string;
  description: string;
}

const TOGGLES: ToggleConfig[] = [
  { key: 'sound', label: 'Sound', description: 'Letter ticks and word chimes' },
  { key: 'music', label: 'Music', description: 'Ambient sea music, off by default' },
  { key: 'haptics', label: 'Haptics', description: 'Vibration on tap and success' },
  {
    key: 'reducedMotion',
    label: 'Reduced motion',
    description: 'Replace movement with short fades',
  },
  {
    key: 'highContrast',
    label: 'High contrast',
    description: 'Solid tiles, deep sea borders, thicker trail',
  },
  {
    key: 'dyslexiaFont',
    label: 'Dyslexia-friendly font',
    description: 'OpenDyslexic for tiles and wheel',
  },
  {
    key: 'tapMode',
    label: 'Tap mode',
    description: 'Tap letters one by one with tick and clear buttons',
  },
];

export function Settings({ onBack }: SettingsProps) {
  const settings = useProfileStore((s) => s.settings);
  const updateSettings = useProfileStore((s) => s.updateSettings);
  const resetProgress = useProfileStore((s) => s.resetProgress);
  const [confirmingReset, setConfirmingReset] = useState(false);

  // High contrast / reduced motion are document-level CSS hooks (tokens.css,
  // Wheel.module.css) — App.tsx keeps `data-high-contrast`/`data-reduced-motion`
  // on <html> in sync with these settings app-wide, not just while this
  // screen is mounted, so there's nothing to do with that here.

  const toggle = (key: keyof SettingsData) => {
    updateSettings({ [key]: !settings[key] } as Partial<SettingsData>);
  };

  const handleConfirmReset = () => {
    resetProgress();
    setConfirmingReset(false);
  };

  // Browsers without the Vibration API (every iPhone browser) can't vibrate,
  // so a Haptics switch there would do nothing.
  const visibleToggles = isHapticsSupported()
    ? TOGGLES
    : TOGGLES.filter((toggle) => toggle.key !== 'haptics');

  return (
    <div className={styles.settings}>
      <div className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
        {onBack && (
          <button type="button" className={styles.backButton} onClick={onBack}>
            Back
          </button>
        )}
      </div>

      <ul className={styles.list}>
        {visibleToggles.map(({ key, label, description }) => {
          const on = settings[key];
          return (
            <li key={key} className={styles.row}>
              <div className={styles.text}>
                <span className={styles.label}>{label}</span>
                <span className={styles.description}>{description}</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={`${label}, ${on ? 'on' : 'off'}`}
                className={`${styles.toggle} ${on ? styles.toggleOn : ''}`}
                onClick={() => toggle(key)}
              >
                <span className={styles.toggleKnob} />
              </button>
            </li>
          );
        })}
      </ul>

      <div className={styles.dangerZone}>
        {!confirmingReset ? (
          <button
            type="button"
            className={styles.resetButton}
            onClick={() => setConfirmingReset(true)}
          >
            Reset progress
          </button>
        ) : (
          <div className={styles.confirmRow} role="alertdialog" aria-label="Confirm reset progress">
            <p className={styles.confirmText}>
              Reset all progress? Coins, completed levels and the bonus jar can&rsquo;t be
              recovered.
            </p>
            <div className={styles.confirmButtons}>
              <button
                type="button"
                className={styles.confirmCancel}
                onClick={() => setConfirmingReset(false)}
              >
                Cancel
              </button>
              <button type="button" className={styles.confirmYes} onClick={handleConfirmReset}>
                Yes, reset
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
