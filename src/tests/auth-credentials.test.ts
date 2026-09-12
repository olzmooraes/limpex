import { authService } from '../services/authService';

/**
 * Suíte de Testes Automatizados: Validação de Credenciais (Senha e Google OAuth) - TSK-106
 */
export async function runAuthCredentialsTest(): Promise<{
  passed: boolean;
  message: string;
  details: Record<string, any>;
}> {
  const LOCAL_STORAGE_KEY_USERS = 'limpex_mock_users';
  localStorage.setItem(LOCAL_STORAGE_KEY_USERS, JSON.stringify([]));

  // 1. Cenário 1: Rejeição de senha fraca (< 6 caracteres)
  const weakPasswordAttempt = await authService.register('Ana Paula', 'ana@exemplo.com', '12345');
  if (weakPasswordAttempt.success || weakPasswordAttempt.errorCode !== 'WEAK_PASSWORD') {
    return {
      passed: false,
      message: 'Falha: Cadastro com senha de 5 caracteres foi aceito',
      details: { weakPasswordAttempt }
    };
  }

  // 2. Cenário 2: Cadastro com senha válida (6+ caracteres)
  const validRegister = await authService.register('Ana Paula', 'ana@exemplo.com', 'secreta123');
  if (!validRegister.success || !validRegister.user) {
    return {
      passed: false,
      message: 'Falha: Cadastro com senha válida foi rejeitado',
      details: { validRegister }
    };
  }

  // 3. Cenário 3: Login com senha incorreta
  const wrongPasswordAttempt = await authService.login('ana@exemplo.com', 'senhaErrada99');
  if (wrongPasswordAttempt.success || wrongPasswordAttempt.errorCode !== 'INVALID_PASSWORD') {
    return {
      passed: false,
      message: 'Falha: Login com senha incorreta foi aceito ou retornou erro inesperado',
      details: { wrongPasswordAttempt }
    };
  }

  // 4. Cenário 4: Login com senha correta
  const correctPasswordAttempt = await authService.login('ana@exemplo.com', 'secreta123');
  if (!correctPasswordAttempt.success || !correctPasswordAttempt.user) {
    return {
      passed: false,
      message: 'Falha: Login com senha correta foi rejeitado',
      details: { correctPasswordAttempt }
    };
  }

  // 5. Cenário 5: Login via Google OAuth
  const googleLogin = await authService.loginWithGoogle();
  if (!googleLogin.success || !googleLogin.user) {
    return {
      passed: false,
      message: 'Falha no login via Google OAuth',
      details: { googleLogin }
    };
  }

  return {
    passed: true,
    message: 'SUCESSO: Validação de senhas, credenciais e Google OAuth aprovados com 100% de conformidade.',
    details: {
      weakPasswordAttempt,
      validRegister,
      wrongPasswordAttempt,
      correctPasswordAttempt,
      googleLogin
    }
  };
}
