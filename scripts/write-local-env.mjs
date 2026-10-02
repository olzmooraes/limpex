// SPEC-022 §4.3: gera .env.local apontando o app para o Supabase local.
// Uso: npm run env:local (com `npm run db:start` já executado).
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

let status;
try {
  status = JSON.parse(execSync('npx supabase status -o json', { stdio: ['ignore', 'pipe', 'ignore'] }).toString());
} catch {
  console.error('Não foi possível ler o status do Supabase local. Ele está rodando? (npm run db:start)');
  process.exit(1);
}

const lines = [
  '# Gerado por `npm run env:local` — aponta o app para o Supabase local.',
  `VITE_SUPABASE_URL=${status.API_URL}`,
  `VITE_SUPABASE_ANON_KEY=${status.ANON_KEY}`,
  ''
];
writeFileSync('.env.local', lines.join('\n'));
console.log(`.env.local gerado (Supabase local em ${status.API_URL}).`);
