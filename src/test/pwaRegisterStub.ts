/**
 * Test-only stand-in for the `virtual:pwa-register/react` module that
 * vite-plugin-pwa injects at build/dev time. Vitest uses its own Vite config
 * (vitest.config.ts) without that plugin, so the virtual module doesn't
 * exist under test — this stub keeps UpdatePrompt.tsx importable without
 * pulling in real service-worker registration (aliased in vitest.config.ts).
 */
export function useRegisterSW(): {
  needRefresh: [boolean, (value: boolean) => void];
  updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
} {
  return {
    needRefresh: [false, () => {}],
    updateServiceWorker: async () => {},
  };
}
