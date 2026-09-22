import { defineConfig, devices } from '@playwright/test';

const PORT = 5189;
const BASE_URL = `http://localhost:${PORT}`;

// End to end tests per HANDOVER.md section 15. Files use a `.e2e.ts` suffix
// (not `.spec.ts`/`.test.ts`) so Vitest's default include glob never picks
// them up alongside the unit tests in `npm test`.
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'iPhone 13',
      // devices['iPhone 13'] defaults to WebKit, which isn't installed in
      // every sandbox (only the pinned Chromium browser is guaranteed here —
      // see the task brief). Force Chromium so the project still exercises
      // the iPhone 13 viewport/touch metrics without needing WebKit.
      use: { ...devices['iPhone 13'], browserName: 'chromium' },
    },
    {
      name: 'Pixel 5',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
