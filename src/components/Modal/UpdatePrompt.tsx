import { Capacitor } from '@capacitor/core';
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
 *
 * In the Capacitor native shell it renders nothing and never registers the
 * service worker: the app ships its web build inside the binary and updates
 * through the stores, so a service worker could only serve a stale cached
 * build after an app update (and WKWebView rejects registration anyway).
 */
export function UpdatePrompt() {
  if (Capacitor.isNativePlatform()) {
    return null;
  }
  return <ServiceWorkerUpdatePrompt />;
}

function ServiceWorkerUpdatePrompt() {
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
