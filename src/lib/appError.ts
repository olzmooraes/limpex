/**
 * SPEC-022 §4.1: erro padronizado do app. `code` identifica a regra violada
 * (ex.: HOUSE_LIMIT_REACHED) e `message` é o texto em pt-BR para exibir.
 *
 * As RPCs do banco (SPEC-021) falham com SQLSTATE P0001, o código em `message`
 * e o texto em `details`; o Auth do Supabase usa códigos próprios.
 */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

const GENERIC_MESSAGE = 'Algo deu errado. Tente novamente.';
const NETWORK_MESSAGE = 'Sem conexão com o servidor. Tente novamente.';

const AUTH_ERRORS: Record<string, [code: string, message: string]> = {
  invalid_credentials: ['INVALID_CREDENTIALS', 'E-mail ou senha incorretos.'],
  user_already_exists: ['EMAIL_ALREADY_EXISTS', 'Este e-mail já está cadastrado.'],
  email_exists: ['EMAIL_ALREADY_EXISTS', 'Este e-mail já está cadastrado.'],
  weak_password: ['WEAK_PASSWORD', 'A senha deve ter no mínimo 6 caracteres.'],
  over_email_send_rate_limit: ['RATE_LIMITED', 'Muitas tentativas em pouco tempo. Aguarde alguns minutos.'],
  over_request_rate_limit: ['RATE_LIMITED', 'Muitas tentativas em pouco tempo. Aguarde alguns minutos.'],
  same_password: ['SAME_PASSWORD', 'A nova senha deve ser diferente da atual.']
};

type ErrorLike = {
  name?: unknown;
  code?: unknown;
  message?: unknown;
  details?: unknown;
  status?: unknown;
};

// O supabase-js usa AuthRetryableFetchError tanto para falha de rede (status 0,
// 502-504) quanto para respostas 500 do Auth — estas não são falha de rede.
const isNetworkFailure = (error: ErrorLike): boolean =>
  (error.name === 'AuthRetryableFetchError' && error.status !== 500) ||
  (typeof error.message === 'string' && /failed to fetch|networkerror|network request failed/i.test(error.message));

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (typeof error !== 'object' || error === null) return new AppError('UNKNOWN', GENERIC_MESSAGE);

  const e = error as ErrorLike;

  if (isNetworkFailure(e)) return new AppError('NETWORK_ERROR', NETWORK_MESSAGE);

  // Regras de negócio das RPCs
  if (e.code === 'P0001' && typeof e.message === 'string') {
    const details = typeof e.details === 'string' && e.details.trim() ? e.details : GENERIC_MESSAGE;
    return new AppError(e.message, details);
  }

  if (e.code === '42501') return new AppError('PERMISSION_DENIED', 'Você não tem permissão para esta ação.');

  // Erros do Auth
  if (typeof e.code === 'string' && e.code in AUTH_ERRORS) {
    const [code, message] = AUTH_ERRORS[e.code];
    return new AppError(code, message);
  }
  // Um trigger em auth.users recusou o cadastro (ex.: teto de 100 usuários);
  // o Auth só devolve uma mensagem genérica. A tela confirma o motivo via
  // get_system_capacity().
  if (typeof e.message === 'string' && /database error saving new user/i.test(e.message)) {
    return new AppError('SIGNUP_FAILED', 'Não foi possível concluir o cadastro.');
  }

  return new AppError('UNKNOWN', GENERIC_MESSAGE);
}
