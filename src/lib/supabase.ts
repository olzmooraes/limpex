import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

/**
 * SPEC-022 §4.1: cliente Supabase único do app. Fica `null` quando as
 * variáveis de ambiente não estão definidas; o App mostra então a tela
 * "Limpex indisponível" em vez de quebrar (Cenário 1).
 */
const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const supabase: SupabaseClient<Database> | null =
  url && anonKey
    ? createClient<Database>(url, anonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      })
    : null;

/** Cliente garantido; lança se a configuração estiver ausente. */
export function requireSupabase(): SupabaseClient<Database> {
  if (!supabase) {
    throw new Error('Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
  }
  return supabase;
}
