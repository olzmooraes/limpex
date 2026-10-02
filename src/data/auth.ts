import { requireSupabase } from '../lib/supabase';
import { AppError, toAppError } from '../lib/appError';
import type { User } from '../types';

/**
 * SPEC-022 E2: autenticação real (Supabase Auth). Toda falha vira AppError
 * com mensagem em pt-BR. As regras (teto de 100, senha mínima) são aplicadas
 * pelo servidor; o cliente só antecipa as óbvias.
 */

export const PASSWORD_MIN_LENGTH = 6;

export interface SystemCapacity {
  totalUsers: number;
  maxUsers: number;
  isRegistrationAllowed: boolean;
}

const USERS_CAP_MESSAGE =
  'O Limpex atingiu o limite de 100 usuários cadastrados. Novos cadastros estão suspensos.';

/** RN-01: capacidade pública, consultada antes de liberar o cadastro. */
export async function getSystemCapacity(): Promise<SystemCapacity> {
  const { data, error } = await requireSupabase().rpc('get_system_capacity');
  if (error) throw toAppError(error);
  const capacity = data as { total_users: number; max_users: number; is_registration_allowed: boolean };
  return {
    totalUsers: capacity.total_users,
    maxUsers: capacity.max_users,
    isRegistrationAllowed: capacity.is_registration_allowed
  };
}

/** Cadastro por nome, e-mail e senha; sem confirmação de e-mail, já entra logado. */
export async function signUp(name: string, email: string, password: string): Promise<void> {
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new AppError('WEAK_PASSWORD', `A senha deve ter no mínimo ${PASSWORD_MIN_LENGTH} caracteres.`);
  }
  const { error } = await requireSupabase().auth.signUp({
    email: email.trim(),
    password,
    options: { data: { name: name.trim() } }
  });
  if (!error) return;

  const appError = toAppError(error);
  // O teto é barrado por trigger em auth.users, e o Auth só devolve um erro
  // genérico: confirma o motivo pela capacidade pública.
  if (appError.code === 'SIGNUP_FAILED') {
    const capacity = await getSystemCapacity().catch(() => null);
    if (capacity && !capacity.isRegistrationAllowed) throw new AppError('USERS_CAP_REACHED', USERS_CAP_MESSAGE);
  }
  throw appError;
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await requireSupabase().auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw toAppError(error);
}

export async function signOut(): Promise<void> {
  const { error } = await requireSupabase().auth.signOut();
  if (error) throw toAppError(error);
}

/** RN-05 revisada: envia o e-mail de recuperação; o link volta para o app. */
export async function requestPasswordReset(email: string, redirectTo: string): Promise<void> {
  const { error } = await requireSupabase().auth.resetPasswordForEmail(email.trim(), { redirectTo });
  if (error) throw toAppError(error);
}

/** Define a nova senha na sessão aberta pelo link de recuperação. */
export async function updatePassword(newPassword: string): Promise<void> {
  if (newPassword.length < PASSWORD_MIN_LENGTH) {
    throw new AppError('WEAK_PASSWORD', `A senha deve ter no mínimo ${PASSWORD_MIN_LENGTH} caracteres.`);
  }
  const { error } = await requireSupabase().auth.updateUser({ password: newPassword });
  if (error) throw toAppError(error);
}

/** Perfil público (public.users) do usuário autenticado. */
export async function getProfile(userId: string): Promise<User> {
  const { data, error } = await requireSupabase()
    .from('users')
    .select('id, name, email, avatar_url, created_at')
    .eq('id', userId)
    .single();
  if (error) throw toAppError(error);
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    avatarUrl: data.avatar_url ?? undefined,
    createdAt: data.created_at
  };
}
