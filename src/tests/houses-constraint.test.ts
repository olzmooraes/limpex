import { dbService } from '../services/supabase';
import { House } from '../types';

/**
 * Teste Automatizado de Domínio: Validação da Restrição Obrigatória nº 3
 * - Limite de 1 casa por criador (RN-18 / Restrição 3)
 * - Rejeição inviolável da 2ª casa com erro HOUSE_LIMIT_REACHED
 * - Vínculo do criador como role = 'CREATOR' + seed dos 14 badges
 * - Participação em múltiplas casas como membro (RN-19)
 * TSK-201 / SPEC-008
 */
export async function runHouseConstraintSimulationTest(): Promise<{
  passed: boolean;
  totalTested: number;
  message: string;
  details: Record<string, any>;
}> {
  const USER_A = 'usr-test-creator';
  const USER_B = 'usr-test-member';
  const LOCAL_STORAGE_KEY_HOUSES = 'limpex_mock_houses';
  const LOCAL_STORAGE_KEY_HOUSE_MEMBERS = 'limpex_mock_house_members';
  const LOCAL_STORAGE_KEY_BADGES = 'limpex_mock_badges';

  // 1. Ambiente isolado de teste
  localStorage.setItem(LOCAL_STORAGE_KEY_HOUSES, JSON.stringify([]));
  localStorage.setItem(LOCAL_STORAGE_KEY_HOUSE_MEMBERS, JSON.stringify([]));
  localStorage.setItem(LOCAL_STORAGE_KEY_BADGES, JSON.stringify([]));

  // 2. Usuário A cria a 1ª casa com sucesso
  const firstCreate = await dbService.createHouse('Ap 102', USER_A, 'Criador A', 'criador_a@teste.com');
  if (!firstCreate.success || !firstCreate.house) {
    return {
      passed: false,
      totalTested: 1,
      message: `Falha ao criar a 1ª casa: ${firstCreate.error}`,
      details: { firstCreate }
    };
  }

  const houseA = firstCreate.house;

  // 2.1. Criador vinculado como 'CREATOR' (espelho do trigger handle_new_house)
  const membersAfterCreate = await dbService.getHouseMembers(houseA.id);
  const creatorBinding = membersAfterCreate.find(m => m.userId === USER_A);
  if (!creatorBinding || creatorBinding.role !== 'CREATOR') {
    return {
      passed: false,
      totalTested: 2,
      message: 'O criador não foi vinculado como membro CREATOR automaticamente',
      details: { membersAfterCreate }
    };
  }

  // 2.2. Seed automático dos 14 badges do sistema
  const badgesJson = localStorage.getItem(LOCAL_STORAGE_KEY_BADGES);
  const badges = badgesJson ? JSON.parse(badgesJson) : [];
  if (badges.filter((b: any) => b.houseId === houseA.id).length !== 14) {
    return {
      passed: false,
      totalTested: 3,
      message: `A casa não foi inicializada com os 14 badges do sistema (encontrados: ${badges.filter((b: any) => b.houseId === houseA.id).length})`,
      details: { badges }
    };
  }

  // 3. Usuário A tenta criar a 2ª casa (DEVE SER BLOQUEADA)
  const secondCreate = await dbService.createHouse('Segunda Casa', USER_A, 'Criador A', 'criador_a@teste.com');
  if (secondCreate.success) {
    return {
      passed: false,
      totalTested: 4,
      message: 'VIOLAÇÃO GRAVE: O usuário criou uma 2ª casa com sucesso!',
      details: { secondCreate }
    };
  }
  if (secondCreate.errorCode !== 'HOUSE_LIMIT_REACHED') {
    return {
      passed: false,
      totalTested: 4,
      message: `A 2ª casa falhou, mas com código inesperado: ${secondCreate.errorCode}`,
      details: { secondCreate }
    };
  }

  // 4. Confirmar que nenhuma casa extra foi persistida
  const housesJson = localStorage.getItem(LOCAL_STORAGE_KEY_HOUSES);
  const houses: House[] = housesJson ? JSON.parse(housesJson) : [];
  if (houses.filter(h => h.creatorId === USER_A).length !== 1) {
    return {
      passed: false,
      totalTested: 5,
      message: 'A contagem de casas do criador não permaneceu em 1',
      details: { houses }
    };
  }

  // 5. Usuário B entra na casa do A via código de convite (RN-17 / RN-19)
  const join = await dbService.joinHouseByInviteCode(houseA.inviteCode, USER_B, 'Membro B', 'membro_b@teste.com');
  if (!join.success) {
    return {
      passed: false,
      totalTested: 6,
      message: `Falha ao vincular membro B via código: ${join.error}`,
      details: { join }
    };
  }

  const memberB = (await dbService.getHouseMembers(houseA.id)).find(m => m.userId === USER_B);
  if (!memberB || memberB.role !== 'MEMBER') {
    return {
      passed: false,
      totalTested: 7,
      message: 'O usuário B não foi vinculado como membro MEMBER',
      details: { memberB }
    };
  }

  // 6. Múltiplas casas: B cria a própria casa E continua membro da casa do A
  const houseBCreate = await dbService.createHouse('Casa do B', USER_B, 'Membro B', 'membro_b@teste.com');
  if (!houseBCreate.success) {
    return {
      passed: false,
      totalTested: 8,
      message: `Falha ao criar a casa do membro B: ${houseBCreate.error}`,
      details: { houseBCreate }
    };
  }

  const housesOfB = await dbService.getUserHouses(USER_B);
  if (housesOfB.length !== 2) {
    return {
      passed: false,
      totalTested: 9,
      message: `O usuário B deveria participar de 2 casas (encontradas: ${housesOfB.length})`,
      details: { housesOfB }
    };
  }

  return {
    passed: true,
    totalTested: 9,
    message: 'SUCESSO: A restrição de 1 casa por criador funcionou; criador vinculado como CREATOR, 14 badges seedados e multi-casa como membro validada.',
    details: {
      casaCriada: houseA.name,
      casaDeB: houseBCreate.house?.name,
      creatorRole: creatorBinding.role,
      casasDeB: housesOfB.map((h: House) => h.name)
    }
  };
}