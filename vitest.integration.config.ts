import { defineConfig } from 'vitest/config';
import { execSync } from 'node:child_process';

/**
 * SPEC-022 §6: testes de integração contra o Supabase local (npm run test:integration).
 * As chaves vêm de `supabase status` na hora da execução; nada fica no repositório.
 */
function localSupabaseStatus(): Record<string, string> {
  try {
    return JSON.parse(execSync('npx supabase status -o json', { stdio: ['ignore', 'pipe', 'ignore'] }).toString());
  } catch {
    throw new Error('Supabase local não está rodando. Execute `npm run db:start` antes dos testes de integração.');
  }
}

const status = localSupabaseStatus();

export default defineConfig({
  test: {
    include: ['src/**/*.int.spec.ts'],
    environment: 'node',
    // Os testes compartilham o banco e a sessão do cliente do app: um arquivo por vez
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
    env: {
      VITE_SUPABASE_URL: status.API_URL,
      VITE_SUPABASE_ANON_KEY: status.ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
      MAILPIT_URL: status.MAILPIT_URL ?? status.INBUCKET_URL
    }
  }
});
