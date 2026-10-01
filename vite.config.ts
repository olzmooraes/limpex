import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true
  },
  test: {
    // Suítes Vitest usam o sufixo .spec.ts; os arquivos *.test.ts legados são
    // módulos de simulação importados por src/tests/legacy-suites.spec.ts.
    include: ['src/**/*.spec.{ts,tsx}'],
    environment: 'jsdom'
  }
});
