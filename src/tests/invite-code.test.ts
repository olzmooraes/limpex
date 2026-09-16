import { dbService, isValidInviteCode } from '../services/supabase';

/**
 * Teste Automatizado de Domínio: Geração do Código de Convite (TSK-202 / SPEC-008)
 * - Cenário 6: código com exatamente 6 caracteres no alfabeto amigável
 *   (A-Z + 2-9, sem caracteres ambíguos 0, O, 1, I) e único entre as casas.
 * - Unicidade garantida contra todos os houses.invite_code existentes.
 * - Normalização em maiúsculas na adesão por código.
 */
export async function runInviteCodeSimulationTest(): Promise<{
  passed: boolean;
  totalTested: number;
  message: string;
  details: Record<string, any>;
}> {
  const USER_CREATOR_A = 'usr-test-invite-a';
  const USER_CREATOR_B = 'usr-test-invite-b';
  const LOCAL_STORAGE_KEY_HOUSES = 'limpex_mock_houses';
  const LOCAL_STORAGE_KEY_HOUSE_MEMBERS = 'limpex_mock_house_members';
  const LOCAL_STORAGE_KEY_BADGES = 'limpex_mock_badges';

  // 1. Ambiente isolado de teste
  localStorage.setItem(LOCAL_STORAGE_KEY_HOUSES, JSON.stringify([]));
  localStorage.setItem(LOCAL_STORAGE_KEY_HOUSE_MEMBERS, JSON.stringify([]));
  localStorage.setItem(LOCAL_STORAGE_KEY_BADGES, JSON.stringify([]));

  // 2. Criador A cria a casa: o código gerado deve ter exatamente 6 caracteres
  const createA = await dbService.createHouse('Casa Teste A', USER_CREATOR_A, 'Criador A', 'a@teste.com');
  if (!createA.success || !createA.house) {
    return { passed: false, totalTested: 1, message: `Falha ao criar casa A: ${createA.error}`, details: { createA } };
  }

  const codeA = createA.house.inviteCode;
  if (codeA.length !== 6) {
    return {
      passed: false,
      totalTested: 2,
      message: `Comprimento do código inválido: ${codeA.length} (esperado exatamente 6)`,
      details: { codeA }
    };
  }
  if (!isValidInviteCode(codeA)) {
    return {
      passed: false,
      totalTested: 3,
      message: `Código contém caracteres fora do alfabeto amigável ou ambíguos: ${codeA}`,
      details: { codeA }
    };
  }

  // 3. Criador B cria outra casa: o código deve ser diferente e único
  const createB = await dbService.createHouse('Casa Teste B', USER_CREATOR_B, 'Criador B', 'b@teste.com');
  if (!createB.success || !createB.house) {
    return { passed: false, totalTested: 4, message: `Falha ao criar casa B: ${createB.error}`, details: { createB } };
  }

  const codeB = createB.house.inviteCode;
  if (codeA === codeB) {
    return {
      passed: false,
      totalTested: 5,
      message: 'VIOLAÇÃO: duas casas receberam o mesmo código de convite',
      details: { codeA, codeB }
    };
  }
  if (!isValidInviteCode(codeB)) {
    return {
      passed: false,
      totalTested: 6,
      message: `Código da casa B contém caracteres ambíguos: ${codeB}`,
      details: { codeB }
    };
  }

  // 4. Unicidade contra todas as casas persistidas (contagem de ocorrências = 1)
  const housesJson = localStorage.getItem(LOCAL_STORAGE_KEY_HOUSES);
  const houses = housesJson ? JSON.parse(housesJson) : [];
  const allCodes = houses.map((h: any) => h.inviteCode);
  const duplicates = allCodes.filter((c: string, idx: number) => allCodes.indexOf(c) !== idx);
  if (duplicates.length > 0) {
    return {
      passed: false,
      totalTested: 7,
      message: `VIOLAÇÃO: códigos duplicados persistidos: ${duplicates.join(', ')}`,
      details: { allCodes }
    };
  }

  // 5. Normalização: adesão funciona com minúsculas + espaços
  const joinWithNormalized = await dbService.joinHouseByInviteCode(`  ${codeA.toLowerCase()}  `, USER_CREATOR_B);
  if (!joinWithNormalized.success) {
    return {
      passed: false,
      totalTested: 8,
      message: `Adesão com código em minúsculas/espaços falhou: ${joinWithNormalized.error}`,
      details: { joinWithNormalized }
    };
  }
  if (joinWithNormalized.house?.inviteCode !== codeA) {
    return {
      passed: false,
      totalTested: 8,
      message: 'Adesão normalizada retornou a casa errada',
      details: { joinWithNormalized, codeA }
    };
  }

  return {
    passed: true,
    totalTested: 8,
    message: 'SUCESSO: Código de convite com exatamente 6 caracteres, alfabeto amigável sem ambíguos e unicidade garantida entre casas.',
    details: {
      codigoCasaA: codeA,
      codigoCasaB: codeB,
      comprimentoValidado: 6,
      codigosPersistidos: allCodes
    }
  };
}