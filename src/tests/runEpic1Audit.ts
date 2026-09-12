import { authService } from '../services/authService';
import { User } from '../types';

export interface GateResult {
  id: number;
  name: string;
  description: string;
  passed: boolean;
  message: string;
  durationMs: number;
  details?: Record<string, any>;
}

export interface Epic1AuditReport {
  timestamp: string;
  epic: string;
  allPassed: boolean;
  totalGates: number;
  passedGates: number;
  failedGates: number;
  totalDurationMs: number;
  gates: GateResult[];
}

/**
 * Executor Unificado da Suíte de Auditoria do Épico 1 (TSK-107)
 * Valida a Restrição Obrigatória nº 2 através de 7 Gates Técnicos
 */
export async function runEpic1Audit(
  onProgress?: (currentGate: number, gateName: string) => void
): Promise<Epic1AuditReport> {
  const startTime = Date.now();
  const LOCAL_STORAGE_KEY_USERS = 'limpex_mock_users';
  const gates: GateResult[] = [];

  // Salvar estado original para restaurar ao final
  const originalState = localStorage.getItem(LOCAL_STORAGE_KEY_USERS);

  try {
    // ------------------------------------------------------------------------
    // GATE 1: Verificação de Capacidade Inicial (< 100)
    // ------------------------------------------------------------------------
    onProgress?.(1, 'Verificação de Capacidade Inicial');
    const g1Start = Date.now();
    localStorage.setItem(LOCAL_STORAGE_KEY_USERS, JSON.stringify([]));
    const cap1 = await authService.checkCapacity();
    const g1Passed = cap1.totalUsers === 0 && cap1.isRegistrationAllowed === true;
    gates.push({
      id: 1,
      name: 'Capacidade Inicial',
      description: 'Valida se uma base zerada expõe isRegistrationAllowed = true',
      passed: g1Passed,
      message: g1Passed 
        ? 'Aprovado: Capacidade inicial com 0 usuários está liberada' 
        : `Reprovado: Contagem retornou ${cap1.totalUsers} ou cadastro bloqueado`,
      durationMs: Date.now() - g1Start,
      details: { cap1 }
    });

    // ------------------------------------------------------------------------
    // GATE 2: Inserção Sequencial de 100 Usuários Válidos
    // ------------------------------------------------------------------------
    onProgress?.(2, 'Carga Sequencial de 100 Usuários');
    const g2Start = Date.now();
    let loadedUsersCount = 0;
    let g2FailedReason = '';

    for (let i = 1; i <= 100; i++) {
      const res = await authService.register(
        `Morador Teste ${i}`,
        `morador_${i}@limpex.app`,
        `senhaForte_${i}`
      );
      if (!res.success) {
        g2FailedReason = `Falha ao cadastrar usuário nº ${i}: ${res.error}`;
        break;
      }
      loadedUsersCount++;
    }

    const g2Passed = loadedUsersCount === 100;
    gates.push({
      id: 2,
      name: 'Carga de 100 Usuários',
      description: 'Garante que os 100 primeiros cadastros ocorram com sucesso',
      passed: g2Passed,
      message: g2Passed 
        ? 'Aprovado: Exatamente 100 usuários foram registrados com sucesso' 
        : `Reprovado: Apenas ${loadedUsersCount} de 100 cadastrados. Erro: ${g2FailedReason}`,
      durationMs: Date.now() - g2Start,
      details: { loadedUsersCount }
    });

    // ------------------------------------------------------------------------
    // GATE 3: Transição do Estado de Capacidade (Full)
    // ------------------------------------------------------------------------
    onProgress?.(3, 'Transição de Estado para Capacidade Cheia');
    const g3Start = Date.now();
    const cap3 = await authService.checkCapacity();
    const g3Passed = cap3.totalUsers === 100 && cap3.isRegistrationAllowed === false;
    gates.push({
      id: 3,
      name: 'Trava de Capacidade Cheia',
      description: 'Confirma se o status isRegistrationAllowed vira false ao atingir 100',
      passed: g3Passed,
      message: g3Passed 
        ? 'Aprovado: Capacidade transitou para isRegistrationAllowed = false' 
        : `Reprovado: Contagem ${cap3.totalUsers}, permitido: ${cap3.isRegistrationAllowed}`,
      durationMs: Date.now() - g3Start,
      details: { cap3 }
    });

    // ------------------------------------------------------------------------
    // GATE 4: Rejeição Inviolável do 101º Usuário Manual
    // ------------------------------------------------------------------------
    onProgress?.(4, 'Tentativa do 101º Cadastro Manual');
    const g4Start = Date.now();
    const attempt101Manual = await authService.register(
      'Invasor 101 Manual',
      'invasor_manual@limpex.app',
      'senhaInvasor123'
    );
    const g4Passed = !attempt101Manual.success && attempt101Manual.errorCode === 'USERS_CAP_REACHED';
    gates.push({
      id: 4,
      name: 'Bloqueio do 101º Usuário Manual',
      description: 'Garante que tentativa manual além de 100 seja abortada com USERS_CAP_REACHED',
      passed: g4Passed,
      message: g4Passed 
        ? 'Aprovado: 101º cadastro manual bloqueado estritamente com USERS_CAP_REACHED' 
        : 'Reprovado: O 101º cadastro manual foi aceito ou retornou código inesperado',
      durationMs: Date.now() - g4Start,
      details: { attempt101Manual }
    });

    // ------------------------------------------------------------------------
    // GATE 5: Rejeição Inviolável do 101º Usuário via Google OAuth
    // ------------------------------------------------------------------------
    onProgress?.(5, 'Tentativa do 101º Cadastro via Google');
    const g5Start = Date.now();
    const attempt101Google = await authService.loginWithGoogle();
    const g5Passed = !attempt101Google.success && attempt101Google.errorCode === 'USERS_CAP_REACHED';
    gates.push({
      id: 5,
      name: 'Bloqueio do 101º Usuário Google',
      description: 'Garante que nova conta social via Google além de 100 seja bloqueada',
      passed: g5Passed,
      message: g5Passed 
        ? 'Aprovado: 101º cadastro Google bloqueado com USERS_CAP_REACHED' 
        : 'Reprovado: O 101º cadastro Google foi aceito incorretamente',
      durationMs: Date.now() - g5Start,
      details: { attempt101Google }
    });

    // ------------------------------------------------------------------------
    // GATE 6: Acesso Pleno para Contas Pré-existentes
    // ------------------------------------------------------------------------
    onProgress?.(6, 'Login de Contas Existentes sob Base Cheia');
    const g6Start = Date.now();
    const loginExisting = await authService.login('morador_1@limpex.app', 'senhaForte_1');
    const g6Passed = loginExisting.success && loginExisting.user !== undefined;
    gates.push({
      id: 6,
      name: 'Preservação de Login Existente',
      description: 'Garante que usuários já cadastrados continuem logando mesmo com base cheia',
      passed: g6Passed,
      message: g6Passed 
        ? 'Aprovado: Usuário pré-existente efetuou login normalmente com base em 100%' 
        : 'Reprovado: Falha no login do usuário existente',
      durationMs: Date.now() - g6Start,
      details: { loginExisting }
    });

    // ------------------------------------------------------------------------
    // GATE 7: Validação de Contagem Final Inviolável
    // ------------------------------------------------------------------------
    onProgress?.(7, 'Verificação da Integridade da Contagem Final');
    const g7Start = Date.now();
    const finalUsersJson = localStorage.getItem(LOCAL_STORAGE_KEY_USERS);
    const finalUsers: User[] = finalUsersJson ? JSON.parse(finalUsersJson) : [];
    const g7Passed = finalUsers.length === 100;
    gates.push({
      id: 7,
      name: 'Contagem Inviolável Final',
      description: 'Confirma que a quantidade de registros no banco permaneceu cravada em 100',
      passed: g7Passed,
      message: g7Passed 
        ? 'Aprovado: A contagem no banco de dados permaneceu estritamente em 100 usuários' 
        : `Reprovado: O banco continha ${finalUsers.length} usuários (esperado 100)`,
      durationMs: Date.now() - g7Start,
      details: { finalUsersCount: finalUsers.length }
    });

  } finally {
    // ------------------------------------------------------------------------
    // RESTAURAÇÃO DO AMBIENTE (TEARDOWN)
    // ------------------------------------------------------------------------
    if (originalState) {
      localStorage.setItem(LOCAL_STORAGE_KEY_USERS, originalState);
    } else {
      // Restaurar usuários demo
      const demoUsers: User[] = [
        { id: 'usr-1', name: 'Luiz Otávio', email: 'luiz@exemplo.com', createdAt: new Date().toISOString() },
        { id: 'usr-2', name: 'Carlos Oliveira', email: 'carlos@exemplo.com', createdAt: new Date().toISOString() },
        { id: 'usr-3', name: 'Mariana Silva', email: 'mariana@exemplo.com', createdAt: new Date().toISOString() }
      ];
      localStorage.setItem(LOCAL_STORAGE_KEY_USERS, JSON.stringify(demoUsers));
    }
  }

  const passedGates = gates.filter(g => g.passed).length;
  const failedGates = gates.length - passedGates;
  const allPassed = failedGates === 0;

  return {
    timestamp: new Date().toISOString(),
    epic: 'EPIC-1: Fundação, Autenticação e Teto Global de Usuários',
    allPassed,
    totalGates: gates.length,
    passedGates,
    failedGates,
    totalDurationMs: Date.now() - startTime,
    gates
  };
}
