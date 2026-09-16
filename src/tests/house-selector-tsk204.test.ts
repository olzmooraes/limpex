import { dbService } from '../services/supabase';
import {
  LOCAL_STORAGE_KEY_ACTIVE_HOUSE,
  getStoredActiveHouseId,
  saveActiveHouseId,
  resolveActiveHouse
} from '../services/houseSelection';
import { House } from '../types';

/**
 * Teste Automatizado de Domínio: Seletor de Casa Ativa no Topo (TSK-204)
 * Valida a lógica consumida pelo seletor do Header descrito na SPEC-008:
 * - resolveActiveHouse elegendo a casa persistida ou a primeira da lista (RN-19).
 * - Isolamento: nunca elege uma casa da qual o usuário não é membro/criador.
 * - Persistência local da casa ativa entre sessões.
 * - Integração com dbService: membro em múltiplas casas alterna corretamente.
 */
export async function runHouseSelectorSimulationTest(): Promise<{
  passed: boolean;
  totalTested: number;
  message: string;
  details: Record<string, any>;
}> {
  const LOCAL_STORAGE_KEY_HOUSES = 'limpex_mock_houses';
  const LOCAL_STORAGE_KEY_HOUSE_MEMBERS = 'limpex_mock_house_members';
  const LOCAL_STORAGE_KEY_BADGES = 'limpex_mock_badges';
  const USER = 'usr-tsk204-member';
  const CREATOR_A = 'usr-tsk204-creator-a';
  const CREATOR_B = 'usr-tsk204-creator-b';

  // 1. Ambiente isolado de teste
  localStorage.setItem(LOCAL_STORAGE_KEY_HOUSES, JSON.stringify([]));
  localStorage.setItem(LOCAL_STORAGE_KEY_HOUSE_MEMBERS, JSON.stringify([]));
  localStorage.setItem(LOCAL_STORAGE_KEY_BADGES, JSON.stringify([]));
  localStorage.removeItem(LOCAL_STORAGE_KEY_ACTIVE_HOUSE);

  // -------------------------------------------------------------------------
  // CENÁRIO 1: Sem casas → resolveActiveHouse retorna null
  // -------------------------------------------------------------------------
  if (resolveActiveHouse([], null) !== null) {
    return { passed: false, totalTested: 1, message: 'resolveActiveHouse deveria retornar null sem casas', details: {} };
  }

  // -------------------------------------------------------------------------
  // CENÁRIO 2: Com casas e preferência válida → elege a casa preferida
  // -------------------------------------------------------------------------
  const now = new Date().toISOString();
  const houseA: House = { id: 'hse-a', name: 'Casa A', inviteCode: 'AAAAAA', creatorId: CREATOR_A, createdAt: now, updatedAt: now };
  const houseB: House = { id: 'hse-b', name: 'Casa B', inviteCode: 'BBBBBB', creatorId: CREATOR_B, createdAt: now, updatedAt: now };
  const housesAB = [houseA, houseB];

  const chosenB = resolveActiveHouse(housesAB, 'hse-b');
  if (!chosenB || chosenB.id !== 'hse-b') {
    return { passed: false, totalTested: 2, message: 'resolveActiveHouse não elegeu a casa preferida', details: { chosenB } };
  }

  // -------------------------------------------------------------------------
  // CENÁRIO 3: Preferência fora da lista → cai para a 1ª casa (ordem de associação)
  // -------------------------------------------------------------------------
  const fallback = resolveActiveHouse(housesAB, 'hse-inexistente');
  if (!fallback || fallback.id !== 'hse-a') {
    return { passed: false, totalTested: 3, message: 'resolveActiveHouse deveria cair para a 1ª casa quando a preferência não existe', details: { fallback } };
  }

  // -------------------------------------------------------------------------
  // CENÁRIO 4: Preferência nula → elege a 1ª casa da lista
  // -------------------------------------------------------------------------
  const first = resolveActiveHouse(housesAB, null);
  if (!first || first.id !== 'hse-a') {
    return { passed: false, totalTested: 4, message: 'resolveActiveHouse deveria eleger a 1ª casa com preferência nula', details: { first } };
  }

  // -------------------------------------------------------------------------
  // CENÁRIO 5: Persistência local (save/get) da casa ativa escolhida
  // -------------------------------------------------------------------------
  saveActiveHouseId('hse-b');
  if (getStoredActiveHouseId() !== 'hse-b') {
    return { passed: false, totalTested: 5, message: 'A casa ativa escolhida não foi persistida', details: { stored: getStoredActiveHouseId() } };
  }

  saveActiveHouseId(null);
  if (getStoredActiveHouseId() !== null) {
    return { passed: false, totalTested: 6, message: 'saveActiveHouseId(null) deveria limpar a preferência', details: { stored: getStoredActiveHouseId() } };
  }

  // -------------------------------------------------------------------------
  // CENÁRIO 6: RN-19 / Integração — membro em 2 casas alterna sem vazar isolamento
  // -------------------------------------------------------------------------
  const createA = await dbService.createHouse('Residência Alfa', CREATOR_A, 'Criador A', 'criadorA@teste.com');
  if (!createA.success || !createA.house) {
    return { passed: false, totalTested: 7, message: `Falha ao criar Casa A: ${createA.error}`, details: { createA } };
  }
  const joinA = await dbService.joinHouseByInviteCode(createA.house.inviteCode, USER, 'Membro TSK204', 'membro@teste.com');
  if (!joinA.success) {
    return { passed: false, totalTested: 8, message: `Falha na adesão à Casa A: ${joinA.error}`, details: { joinA } };
  }

  const createB = await dbService.createHouse('Chácara Beta', CREATOR_B, 'Criador B', 'criadorB@teste.com');
  if (!createB.success || !createB.house) {
    return { passed: false, totalTested: 9, message: `Falha ao criar Casa B: ${createB.error}`, details: { createB } };
  }
  const joinB = await dbService.joinHouseByInviteCode(createB.house.inviteCode, USER, 'Membro TSK204', 'membro@teste.com');
  if (!joinB.success) {
    return { passed: false, totalTested: 10, message: `Falha na adesão à Casa B: ${joinB.error}`, details: { joinB } };
  }

  const userHouses = await dbService.getUserHouses(USER);
  if (userHouses.length !== 2) {
    return { passed: false, totalTested: 11, message: `O usuário deveria ter 2 casas (tem ${userHouses.length})`, details: { userHouses } };
  }

  // Alternar para a Casa B como ativa (seletor do Header)
  saveActiveHouseId(createB.house.id);
  const activeB = resolveActiveHouse(userHouses, getStoredActiveHouseId());
  if (!activeB || activeB.id !== createB.house.id) {
    return { passed: false, totalTested: 12, message: 'A alternância para a Casa B via seletor falhou', details: { activeB } };
  }

  // Alternar de volta para a Casa A
  saveActiveHouseId(createA.house.id);
  const activeA = resolveActiveHouse(userHouses, getStoredActiveHouseId());
  if (!activeA || activeA.id !== createA.house.id) {
    return { passed: false, totalTested: 13, message: 'A alternância de volta para a Casa A falhou', details: { activeA } };
  }

  // Isolamento: usuário que não pertence à Casa A não pode elegê-la
  const stranger = resolveActiveHouse(
    await dbService.getUserHouses('usr-tsk204-stranger'),
    createA.house.id
  );
  if (stranger !== null) {
    return { passed: false, totalTested: 14, message: 'VIOLAÇÃO: casa fora da lista do usuário foi eleita', details: { stranger } };
  }

  // Limpeza da preferência salva no teardown para não vazar entre sessões
  saveActiveHouseId(null);

  return {
    passed: true,
    totalTested: 14,
    message: 'SUCESSO: Seletor de casa ativa validado — alternância entre múltiplas casas (RN-19), persistência da escolha e isolamento do vínculo.',
    details: {
      casasDoUsuario: userHouses.map((h: House) => h.name),
      alternanciaPara: activeB?.name,
      retornoPara: activeA?.name,
      persistenciaChave: LOCAL_STORAGE_KEY_ACTIVE_HOUSE
    }
  };
}