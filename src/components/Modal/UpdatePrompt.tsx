import { useRegisterSW } from 'virtual:pwa-register/react';
import styles from './UpdatePrompt.module.css';

/**
 * Registers the service worker and shows a small "update ready" toast when
 * a new version has been installed in the background, per HANDOVER.md
 * section 13. Mount this once near the app root, e.g. in App.tsx:
 *
 *   <UpdatePrompt />
 *
 * It renders nothing until an update is actually waiting, so it is safe to
 * mount unconditionally.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError: (error: unknown) => {
      // Registration failures (e.g. no service worker support, or running
      // outside a build with the PWA plugin active) should never break the
      // game itself.
      console.error('Service worker registration failed', error);
    },
  });

  if (!needRefresh) {
    return null;
  }

  const dismiss = () => setNeedRefresh(false);

  return (
    <div className={styles.toast} role="status">
      <span className={styles.message}>A new version of Tidewords is ready.</span>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.reload}
          onClick={() => {
            void updateServiceWorker(true);
          }}
        >
          Reload
        </button>
        <button type="button" className={styles.dismiss} onClick={dismiss} aria-label="Dismiss">
          Later
        </button>
      </div>
    </div>
  );
}
