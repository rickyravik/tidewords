import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Native Android/iOS shells for the store builds (HANDOVER.md section 16, Phase 4 optional).
 * The native apps load the same production web build from `dist/`; run `npm run cap:sync`
 * after every web change. See README.md "Native builds".
 */
const config: CapacitorConfig = {
  // Placeholder bundle id: confirm the final one (it can't change after a store release).
  appId: 'app.tidewords.game',
  appName: 'Tidewords',
  webDir: 'dist',
  backgroundColor: '#0F2A3D',
  plugins: {
    SystemBars: {
      // The game is always on a dark sea background, so keep status bar content light.
      // Safe areas are left to CSS env(safe-area-inset-*) (index.html uses viewport-fit=cover).
      style: 'DARK',
    },
  },
};

export default config;
