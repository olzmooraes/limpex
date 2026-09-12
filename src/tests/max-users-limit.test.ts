import { dbService } from '../services/supabase';

/**
 * Teste Automatizado de Domínio: Validação da Restrição Obrigatória nº 2
 * - Limite Global de 100 Usuários
 * - Rejeição inviolável do 101º cadastro com erro USERS_CAP_REACHED
 */
export async function runMaxUsersLimitSimulationTest(): Promise<{
  passed: boolean;
  totalTested: number;
  message: string;
  details: Record<string, any>;
}> {
  const LOCAL_STORAGE_KEY_USERS = 'limpex_mock_users';

  // 1. Limpar e inicializar ambiente de teste
  localStorage.setItem(LOCAL_STORAGE_KEY_USERS, JSON.stringify([]));

  // 2. Verificar capacidade inicial (0 usuários)
  const initialCap = await dbService.getSystemCapacity();
  if (initialCap.total_users !== 0 || !initialCap.is_registration_allowed) {
    return {
      passed: false,
      totalTested: 0,
      message: 'Falha na verificação de capacidade inicial',
      details: { initialCap }
    };
  }

  // 3. Cadastrar 100 usuários sequencialmente
  let registeredCount = 0;
  for (let i = 1; i <= 100; i++) {
    const res = await dbService.registerUser(`Usuário Teste ${i}`, `usuario_${i}@teste.com`);
    if (!res.success) {
      return {
        passed: false,
        totalTested: i,
        message: `Falha ao cadastrar usuário nº ${i} antes do limite. Erro: ${res.error}`,
        details: { res }
      };
    }
    registeredCount++;
  }

  // 4. Verificar capacidade ao atingir exatamente 100 usuários
  const fullCap = await dbService.getSystemCapacity();
  if (fullCap.total_users !== 100 || fullCap.is_registration_allowed !== false) {
    return {
      passed: false,
      totalTested: registeredCount,
      message: 'A função de capacidade não travou as inscrições ao atingir 100 usuários',
      details: { fullCap }
    };
  }

  // 5. Tentativa de cadastrar o 101º usuário (DEVE SER BLOQUEADA)
  const attempt101 = await dbService.registerUser('Usuário Invasor 101', 'usuario_101@teste.com');

  if (attempt101.success) {
    return {
      passed: false,
      totalTested: 101,
      message: 'VIOLAÇÃO GRAVE: O 101º usuário foi cadastrado com sucesso!',
      details: { attempt101 }
    };
  }

  if (attempt101.errorCode !== 'USERS_CAP_REACHED') {
    return {
      passed: false,
      totalTested: 101,
      message: `O 101º cadastro falhou, mas com código inesperado: ${attempt101.errorCode}`,
      details: { attempt101 }
    };
  }

  // 6. Confirmar que a contagem no banco/storage permanece estritamente em 100
  const finalCap = await dbService.getSystemCapacity();
  if (finalCap.total_users !== 100) {
    return {
      passed: false,
      totalTested: 101,
      message: `A contagem final não permaneceu em 100 (atual: ${finalCap.total_users})`,
      details: { finalCap }
    };
  }

  return {
    passed: true,
    totalTested: 101,
    message: 'SUCESSO: A barreira de 100 usuários funcionou perfeitamente. O 101º cadastro foi bloqueado.',
    details: {
      totalCadastradosComSucesso: 100,
      resultadoTentativa101: attempt101
    }
  };
}
