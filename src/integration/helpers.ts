import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

/**
 * Auxiliares dos testes de integração (SPEC-022 §6). Usam a chave de
 * service_role do Supabase LOCAL apenas para preparar e limpar dados.
 */

export const admin = createClient<Database>(
  process.env.VITE_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export const uniqueEmail = (prefix: string): string =>
  `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 7)}@limpex.test`;

/** Cria uma conta já confirmada pela API administrativa. */
export async function createUser(email: string, password: string, name: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name }
  });
  if (error || !data.user) throw error ?? new Error('createUser sem usuário');
  return data.user.id;
}

export async function deleteUsers(ids: string[]): Promise<void> {
  for (const id of ids) {
    await admin.auth.admin.deleteUser(id);
  }
}

/** Link de verificação do último e-mail recebido pelo endereço (Mailpit local). */
export async function waitForAuthLink(address: string, timeoutMs = 10_000): Promise<string> {
  const mailpit = process.env.MAILPIT_URL as string;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const search = await fetch(`${mailpit}/api/v1/search?query=${encodeURIComponent(`to:"${address}"`)}`);
    const { messages } = (await search.json()) as { messages: { ID: string }[] };
    if (messages.length > 0) {
      const message = (await (await fetch(`${mailpit}/api/v1/message/${messages[0].ID}`)).json()) as { Text: string };
      const link = message.Text.match(/https?:\/\/\S+\/auth\/v1\/verify\S+/)?.[0];
      if (link) return link;
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`Nenhum e-mail de autenticação chegou para ${address}`);
}

/** Segue o link de verificação e devolve os tokens do redirecionamento (#access_token=...). */
export async function followAuthLink(link: string): Promise<{ type: string; accessToken: string; refreshToken: string }> {
  const response = await fetch(link, { redirect: 'manual' });
  const location = response.headers.get('location') ?? '';
  const params = new URLSearchParams(location.split('#')[1] ?? '');
  return {
    type: params.get('type') ?? '',
    accessToken: params.get('access_token') ?? '',
    refreshToken: params.get('refresh_token') ?? ''
  };
}
