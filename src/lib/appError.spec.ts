import { describe, it, expect } from 'vitest';
import { AppError, toAppError } from './appError';

// SPEC-022 Cenário 3 — erros do banco e do Auth em pt-BR

describe('toAppError', () => {
  it('erro de RPC (P0001): código em message, texto em details', () => {
    const error = toAppError({
      code: 'P0001',
      message: 'HOUSE_LIMIT_REACHED',
      details: 'Você já é criador de uma casa. Cada usuário pode criar no máximo 1 casa.',
      hint: null
    });
    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe('HOUSE_LIMIT_REACHED');
    expect(error.message).toBe('Você já é criador de uma casa. Cada usuário pode criar no máximo 1 casa.');
  });

  it('RPC sem details cai na mensagem genérica, mantendo o código', () => {
    const error = toAppError({ code: 'P0001', message: 'BADGE_NOT_FOUND', details: null });
    expect(error.code).toBe('BADGE_NOT_FOUND');
    expect(error.message).toBe('Algo deu errado. Tente novamente.');
  });

  it('permissão negada (42501)', () => {
    const error = toAppError({ code: '42501', message: 'permission denied for table houses' });
    expect(error).toMatchObject({ code: 'PERMISSION_DENIED', message: 'Você não tem permissão para esta ação.' });
  });

  it.each([
    ['invalid_credentials', 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos.'],
    ['user_already_exists', 'EMAIL_ALREADY_EXISTS', 'Este e-mail já está cadastrado.'],
    ['email_exists', 'EMAIL_ALREADY_EXISTS', 'Este e-mail já está cadastrado.'],
    ['weak_password', 'WEAK_PASSWORD', 'A senha deve ter no mínimo 6 caracteres.'],
    ['over_email_send_rate_limit', 'RATE_LIMITED', 'Muitas tentativas em pouco tempo. Aguarde alguns minutos.']
  ])('erro do Auth %s → %s', (authCode, code, message) => {
    const error = toAppError({ name: 'AuthApiError', status: 400, code: authCode, message: 'qualquer' });
    expect(error).toMatchObject({ code, message });
  });

  it.each([
    [{ name: 'AuthApiError', status: 500, code: 'unexpected_failure', message: 'Database error saving new user' }],
    // Forma real devolvida pelo supabase-js quando o trigger do teto recusa o cadastro
    [{ name: 'AuthRetryableFetchError', status: 500, message: 'Database error saving new user' }]
  ])('falha ao gravar usuário no Auth (teto ou trigger) vira SIGNUP_FAILED', (raw) => {
    expect(toAppError(raw).code).toBe('SIGNUP_FAILED');
  });

  it.each([
    [new TypeError('Failed to fetch')],
    [{ name: 'AuthRetryableFetchError', status: 0, message: 'Failed to fetch' }],
    [{ name: 'AuthRetryableFetchError', status: 503, message: 'Service Unavailable' }],
    [{ code: '', message: 'TypeError: NetworkError when attempting to fetch resource.' }]
  ])('falha de rede → NETWORK_ERROR', (raw) => {
    expect(toAppError(raw)).toMatchObject({
      code: 'NETWORK_ERROR',
      message: 'Sem conexão com o servidor. Tente novamente.'
    });
  });

  it('erro desconhecido → UNKNOWN com mensagem genérica', () => {
    expect(toAppError('ops')).toMatchObject({ code: 'UNKNOWN', message: 'Algo deu errado. Tente novamente.' });
    expect(toAppError(new Error('boom'))).toMatchObject({ code: 'UNKNOWN' });
  });

  it('AppError passa direto', () => {
    const original = new AppError('X', 'mensagem');
    expect(toAppError(original)).toBe(original);
  });
});
