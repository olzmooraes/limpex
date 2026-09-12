import { authService } from '../services/authService';
import { User } from '../types';

/**
 * Suíte de Testes Automatizados: Serviço de Consulta de Capacidade (TSK-104)
 */
export async function runCapacityCheckServiceTest(): Promise<{
  passed: boolean;
  message: string;
  details: Record<string, any>;
}> {
  const LOCAL_STORAGE_KEY_USERS = 'limpex_mock_users';

  // 1. Cenário A: Base com 10 usuários (< 100)
  const tenUsers: User[] = Array.from({ length: 10 }).map((_, i) => ({
    id: `usr-test-${i + 1}`,
    name: `Usuário ${i + 1}`,
    email: `teste${i + 1}@exemplo.com`,
    createdAt: new Date().toISOString()
  }));
  localStorage.setItem(LOCAL_STORAGE_KEY_USERS, JSON.stringify(tenUsers));

  const capA = await authService.checkCapacity();
  if (capA.totalUsers !== 10 || !capA.isRegistrationAllowed) {
    return {
      passed: false,
      message: 'Falha no Cenário A: Base com 10 usuários deveria ter cadastro liberado',
      details: { capA }
    };
  }

  // 2. Cenário B: Base com exatamente 100 usuários (teto atingido)
  const hundredUsers: User[] = Array.from({ length: 100 }).map((_, i) => ({
    id: `usr-test-${i + 1}`,
    name: `Usuário ${i + 1}`,
    email: `teste${i + 1}@exemplo.com`,
    createdAt: new Date().toISOString()
  }));
  localStorage.setItem(LOCAL_STORAGE_KEY_USERS, JSON.stringify(hundredUsers));

  const capB = await authService.checkCapacity();
  if (capB.totalUsers !== 100 || capB.isRegistrationAllowed !== false) {
    return {
      passed: false,
      message: 'Falha no Cenário B: Base com 100 usuários deveria bloquear cadastros',
      details: { capB }
    };
  }

  // 3. Cenário C: Tentativa de registro manual com base cheia
  const regAttempt = await authService.register('Novo Candidato', 'novo@exemplo.com');
  if (regAttempt.success || regAttempt.errorCode !== 'USERS_CAP_REACHED') {
    return {
      passed: false,
      message: 'Falha no Cenário C: authService.register permitiu cadastro mesmo com teto atingido',
      details: { regAttempt }
    };
  }

  // 4. Cenário D: Login de usuário pré-existente com base cheia (DEVE SER PERMITIDO)
  const loginExisting = await authService.login('teste1@exemplo.com');
  if (!loginExisting.success || !loginExisting.user) {
    return {
      passed: false,
      message: 'Falha no Cenário D: Usuário pré-existente não conseguiu logar com base cheia',
      details: { loginExisting }
    };
  }

  return {
    passed: true,
    message: 'SUCESSO: O serviço de consulta de capacidade e regras de autenticação foram validados 100%.',
    details: {
      cenarioMenosDe100: capA,
      cenarioExatamente100: capB,
      bloqueioNovoCadastro: regAttempt,
      loginUsuarioExistente: loginExisting
    }
  };
}
