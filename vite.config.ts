import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const __dirname = dirname(fileURLToPath(import.meta.url));
const levelsDir = resolve(__dirname, 'public/levels');

/**
 * The first two chapter packs, precached as part of the app shell (see
 * HANDOVER.md section 13). Later chapters are picked up by the runtime
 * caching rule below the first time a player opens them. Reads whatever
 * chapter-NN.json files actually exist on disk at build time, so this
 * keeps working whether chapter-02 has landed yet or not.
 */
/**
 * The word dictionary, precached too: bonus-word checks fall back to it and
 * endless levels (101+) are generated from it, so both need it offline.
 */
function dictionaryEntry(): { url: string; revision: string }[] {
  try {
    const contents = readFileSync(resolve(__dirname, 'public/dictionary.json'));
    const revision = createHash('sha256').update(contents).digest('hex').slice(0, 16);
    return [{ url: '/dictionary.json', revision }];
  } catch {
    return [];
  }
}

function firstTwoChapterPacks(): { url: string; revision: string }[] {
  let files: string[];
  try {
    files = readdirSync(levelsDir)
      .filter((f) => /^chapter-\d+\.json$/.test(f))
      .sort();
  } catch {
    return [];
  }
  return files.slice(0, 2).map((file) => {
    const contents = readFileSync(resolve(levelsDir, file));
    const revision = createHash('sha256').update(contents).digest('hex').slice(0, 16);
    return { url: `/levels/${file}`, revision };
  });
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      // We register the service worker ourselves via the
      // virtual:pwa-register/react hook (see src/components/Modal/UpdatePrompt.tsx)
      // so we can show our own "update ready" prompt instead of the plugin's
      // default injected script.
      injectRegister: false,
      manifest: {
        name: 'Tidewords',
        short_name: 'Tidewords',
        description:
          'A relaxing word wheel crossword puzzle, played as a voyage along a sea chart.',
        theme_color: '#0F2A3D',
        background_color: '#0F2A3D',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Default is *.{js,wasm,css,html} only; extend it to cover the rest
        // of the app shell that isn't already precached automatically (the
        // plugin adds the manifest.icons entries and manifest.webmanifest
        // itself, so png/webmanifest are left out here to avoid precaching
        // them twice) — mainly the self-hosted font files and the SVG
        // favicon.
        globPatterns: ['**/*.{js,css,html,woff2,svg}'],
        additionalManifestEntries: [...firstTwoChapterPacks(), ...dictionaryEntry()],
        runtimeCaching: [
          {
            urlPattern: /\/levels\/chapter-\d+\.json$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'tidewords-chapters',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      devOptions: {
        // Keep the service worker out of `npm run dev` so it never masks
        // fast-refresh or in-progress work with stale caches; `npm run build`
        // + `npm run preview` is the way to exercise the real PWA behaviour.
        enabled: false,
      },
    }),
  ],
});
