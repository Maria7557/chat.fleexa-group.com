import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./apps/fleexa-manager', import.meta.url)),
      '@fleexa/api-client': fileURLToPath(new URL('./packages/fleexa-api-client/src/index.ts', import.meta.url)),
      '@fleexa/config': fileURLToPath(new URL('./packages/fleexa-config/src/index.ts', import.meta.url)),
      '@fleexa/domain': fileURLToPath(new URL('./packages/fleexa-domain/src/index.ts', import.meta.url)),
      '@fleexa/ui': fileURLToPath(new URL('./packages/fleexa-ui/src/index.tsx', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: [
      'packages/**/*.test.ts',
      'apps/**/*.test.ts',
    ],
  },
});
