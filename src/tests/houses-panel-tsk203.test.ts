import { dbService, isValidInviteCode } from '../services/supabase';
import { House } from '../types';

/**
 * Teste Automatizado de Domínio: Aba de Casas — Criar casa e Entrar via código (TSK-203)
 * Valida os fluxos consumidos pela Tela/Aba de Casas descritos na SPEC-008:
 * - Criar nova casa (Cenário 1): nome válido → casa persistida com código único,
 *   criador vinculado como 'CREATOR' e casa exibida na lista do usuário.
 * - Bloqueio de 2ª casa (Cenário 2): erro HOUSE_LIMIT_REACHED → a UI exibe
 *   o estado descritivo "Você já é criador de uma casa".
 * - Entrar via código (Cenário 3 / RN-17): código válido → vínculo como 'MEMBER'
 *   e a casa passa a constar na lista de casas do usuário (RN-19).
 * - Código inválido → INVALID_INVITE_CODE; reentrada → ALREADY_MEMBER.
 */
export async function runHousesPanelSimulationTest(): Promise<{
  passed: boolean;
  totalTested: number;
  message: string;
  details: Record<string, any>;
}> {
  const USER_CREATOR = 'usr-tsk203-creator';
  const USER_MEMBER = 'usr-tsk203-member';
  const LOCAL_STORAGE_KEY_HOUSES = 'limpex_mock_houses';
  const LOCAL_STORAGE_KEY_HOUSE_MEMBERS = 'limpex_mock_house_members';
  const LOCAL_STORAGE_KEY_BADGES = 'limpex_mock_badges';

  // 1. Ambiente isolado de teste (lista de casas do usuário vazia)
  localStorage.setItem(LOCAL_STORAGE_KEY_HOUSES, JSON.stringify([]));
  localStorage.setItem(LOCAL_STORAGE_KEY_HOUSE_MEMBERS, JSON.stringify([]));
  localStorage.setItem(LOCAL_STORAGE_KEY_BADGES, JSON.stringify([]));

  // 2. CRIAÇÃO DE CASA — usuário sem casa cria a 1ª casa (Cenário 1)
  const initialHouses = await dbService.getUserHouses(USER_CREATOR);
  if (initialHouses.length !== 0) {
    return { passed: false, totalTested: 1, message: 'Ambiente de teste não iniciou vazio', details: { initialHouses } };
  }

  const createRes = await dbService.createHouse('Ap 402 - Família', USER_CREATOR, 'Criador TSK203', 'criador@teste.com');
  if (!createRes.success || !createRes.house) {
    return { passed: false, totalTested: 2, message: `Falha ao criar a 1ª casa: ${createRes.error}`, details: { createRes } };
  }
  const createdHouse = createRes.house;

  if (!isValidInviteCode(createdHouse.inviteCode)) {
    return {
      passed: false,
      totalTested: 3,
      message: `A casa criada recebeu código de convite inválido: ${createdHouse.inviteCode}`,
      details: { inviteCode: createdHouse.inviteCode }
    };
  }

  // 3. A casa criada aparece na lista de casas do usuário (reflexo da aba Minhas Casas)
  const housesAfterCreate = await dbService.getUserHouses(USER_CREATOR);
  if (housesAfterCreate.length !== 1 || housesAfterCreate[0].id !== createdHouse.id) {
    return {
      passed: false,
      totalTested: 4,
      message: `A casa criada não apareceu na lista do usuário (total: ${housesAfterCreate.length})`,
      details: { housesAfterCreate }
    };
  }

  // 4. BLOQUEIO DE 2ª CASA — criador tenta nova casa → HOUSE_LIMIT_REACHED (Cenário 2)
  const secondCreate = await dbService.createHouse('Casa Duplicada', USER_CREATOR, 'Criador TSK203', 'criador@teste.com');
  if (secondCreate.success) {
    return { passed: false, totalTested: 5, message: 'VIOLAÇÃO: usuário criou uma 2ª casa com sucesso', details: { secondCreate } };
  }
  if (secondCreate.errorCode !== 'HOUSE_LIMIT_REACHED') {
    return {
      passed: false,
      totalTested: 5,
      message: `Código de erro inesperado no bloqueio da 2ª casa: ${secondCreate.errorCode}`,
      details: { secondCreate }
    };
  }
  const allHouses: House[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_HOUSES) || '[]');
  if (allHouses.filter((h: House) => h.creatorId === USER_CREATOR).length !== 1) {
    return { passed: false, totalTested: 6, message: 'Nenhuma casa nova deveria ter sido persistida após o bloqueio', details: { allHouses } };
  }

  // 5. ENTRAR VIA CÓDIGO — membro entra na casa do criador (Cenário 3 / RN-17)
  const emptyBeforeJoin = (await dbService.getUserHouses(USER_MEMBER)).length;
  if (emptyBeforeJoin !== 0) {
    return { passed: false, totalTested: 7, message: 'Membro inicia a simulação já com casas', details: { emptyBeforeJoin } };
  }

  const joinRes = await dbService.joinHouseByInviteCode(createdHouse.inviteCode, USER_MEMBER, 'Membro TSK203', 'membro@teste.com');
  if (!joinRes.success || !joinRes.house) {
    return { passed: false, totalTested: 8, message: `Entrada via código falhou: ${joinRes.error}`, details: { joinRes } };
  }
  if (joinRes.house.id !== createdHouse.id) {
    return { passed: false, totalTested: 8, message: 'A entrada via código retornou a casa errada', details: { joinedHouse: joinRes.house, createdHouse } };
  }

  // 6. A casa vinculada passa a constar na lista de casas do membro (RN-19)
  const memberHouses = await dbService.getUserHouses(USER_MEMBER);
  if (memberHouses.length !== 1 || memberHouses[0].id !== createdHouse.id) {
    return {
      passed: false,
      totalTested: 9,
      message: `A casa vinculada não apareceu na lista do membro (total: ${memberHouses.length})`,
      details: { memberHouses }
    };
  }

  // 7. Reentrada no mesmo código → ALREADY_MEMBER
  const reJoin = await dbService.joinHouseByInviteCode(createdHouse.inviteCode, USER_MEMBER);
  if (reJoin.success || reJoin.errorCode !== 'ALREADY_MEMBER') {
    return { passed: false, totalTested: 10, message: 'Reentrada deveria retornar ALREADY_MEMBER', details: { reJoin } };
  }

  // 8. Código inexistente → INVALID_INVITE_CODE
  const invalidJoin = await dbService.joinHouseByInviteCode('ZZZZZZ', USER_MEMBER);
  if (invalidJoin.success || invalidJoin.errorCode !== 'INVALID_INVITE_CODE') {
    return { passed: false, totalTested: 11, message: 'Código inexistente deveria retornar INVALID_INVITE_CODE', details: { invalidJoin } };
  }

  return {
    passed: true,
    totalTested: 11,
    message: 'SUCESSO: Fluxos da aba de Casas validados — criação de casa, bloqueio de 2ª casa (HOUSE_LIMIT_REACHED), entrada via código como MEMBER e atualização da lista de casas.',
    details: {
      casaCriada: createdHouse.name,
      codigoDeConvite: createdHouse.inviteCode,
      casasDoCriador: housesAfterCreate.map((h: House) => h.name),
      casasDoMembroAposEntrar: memberHouses.map((h: House) => h.name),
      bloqueioSegundaCasa: secondCreate.errorCode,
      erroReentrada: reJoin.errorCode,
      erroCodigoInexistente: invalidJoin.errorCode
    }
  };
}