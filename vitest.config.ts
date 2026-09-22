import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // vite-plugin-pwa provides this virtual module at build/dev time only;
      // stub it so components importing it (e.g. UpdatePrompt) are testable.
      'virtual:pwa-register/react': new URL(
        './src/test/pwaRegisterStub.ts',
        import.meta.url,
      ).pathname,
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: false,
  },
});
