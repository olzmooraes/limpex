import { dbService } from '../services/supabase';
import { CleaningRecord, HouseMember, Badge } from '../types';
import { validateCleaningPersistence } from '../services/cleaningPersistence';
import { buildCleaningRecordPayload, CleaningFormDraft } from '../services/cleaningRegistration';
import { SYSTEM_BADGE_COUNT } from '../services/badgeDefinitions';

/**
 * Teste Automatizado de Domínio: Persistência de Registros de Faxina (TSK-403 / SPEC-016)
 * Valida a camada de backend/persistência (cleaning_records + cleaning_badges):
 *  - Cenário 1: registro válido é persistido com fidelidade de campos (cabeçalho + associações).
 *  - Cenário 2: consulta isolada por casa e filtro por semana (RN-19).
 *  - Cenário 3: não-membro é rejeitado (CLEANING_MEMBERSHIP_REQUIRED) sem persistência parcial.
 *  - Cenário 4: responsável fora da casa é rejeitado (CLEANING_RESPONSIBLE_NOT_IN_HOUSE).
 *  - Cenário 5: badge de outra casa é rejeitado (CLEANING_BADGE_NOT_IN_HOUSE) sem cabeçalho gravado.
 *  - Cenário 6: casa inexistente é rejeitada (CLEANING_HOUSE_NOT_FOUND).
 *  - Cenário 7: cascatas — exclusão de casa remove registros; exclusão de badge remove a
 *    referência nos registros sem quebrá-los.
 *  - Cenário 8: id duplicado é rejeitado (idempotência) e dois registros no mesmo ms não colidem.
 */
export async function runCleaningPersistenceSimulationTest(): Promise<{
  passed: boolean;
  totalTested: number;
  message: string;
  details: Record<string, any>;
}> {
  const USER_CREATOR = 'usr-tsk403-creator';
  const USER_MEMBER = 'usr-tsk403-member';
  const USER_OUTSIDER = 'usr-tsk403-outsider';
  const LOCAL_STORAGE_KEY_HOUSES = 'limpex_mock_houses';
  const LOCAL_STORAGE_KEY_HOUSE_MEMBERS = 'limpex_mock_house_members';
  const LOCAL_STORAGE_KEY_BADGES = 'limpex_mock_badges';
  const LOCAL_STORAGE_KEY_LOGS = 'limpex_mock_exclusion_logs';
  const LOCAL_STORAGE_KEY_CLEANING_RECORDS = 'limpex_mock_cleaning_records';

  let totalTested = 0;
  const assert = (cond: boolean, msg: string, details?: Record<string, any>) => {
    totalTested++;
    if (!cond) {
      throw new Error(msg + (details ? ` — ${JSON.stringify(details)}` : ''));
    }
  };

  const getRecords = (): CleaningRecord[] => {
    const json = localStorage.getItem(LOCAL_STORAGE_KEY_CLEANING_RECORDS);
    return json ? JSON.parse(json) : [];
  };

  const getLogs = (): any[] => {
    const json = localStorage.getItem(LOCAL_STORAGE_KEY_LOGS);
    return json ? JSON.parse(json) : [];
  };

  try {
    // 1. Ambiente isolado
    localStorage.setItem(LOCAL_STORAGE_KEY_HOUSES, JSON.stringify([]));
    localStorage.setItem(LOCAL_STORAGE_KEY_HOUSE_MEMBERS, JSON.stringify([]));
    localStorage.setItem(LOCAL_STORAGE_KEY_BADGES, JSON.stringify([]));
    localStorage.setItem(LOCAL_STORAGE_KEY_LOGS, JSON.stringify([]));
    localStorage.setItem(LOCAL_STORAGE_KEY_CLEANING_RECORDS, JSON.stringify([]));

    // 2. Criar casa A (criador + membro) e casa B (criador isolado)
    const houseARes = await dbService.createHouse('Casa Faxina A', USER_CREATOR, 'Criador A', 'criadorA@teste.com');
    assert(houseARes.success && houseARes.house !== undefined, 'Falha ao criar casa A', { error: houseARes.error });
    const houseA = houseARes.house!;

    const joinRes = await dbService.joinHouseByInviteCode(houseA.inviteCode, USER_MEMBER, 'Membro A', 'membro@teste.com');
    assert(joinRes.success, 'Falha ao vincular membro na casa A', { error: joinRes.error });

    const houseBRes = await dbService.createHouse('Casa Faxina B', USER_OUTSIDER, 'Criador B', 'criadorB@teste.com');
    assert(houseBRes.success && houseBRes.house !== undefined, 'Falha ao criar casa B', { error: houseBRes.error });
    const houseB = houseBRes.house!;

    const membersA: HouseMember[] = await dbService.getHouseMembers(houseA.id);
    assert(membersA.length === 2, 'Casa A deveria ter 2 membros', { membersA });

    const badgesA: Badge[] = await dbService.getHouseBadges(houseA.id);
    assert(badgesA.length === SYSTEM_BADGE_COUNT, `Casa A deveria ter ${SYSTEM_BADGE_COUNT} badges`, { len: badgesA.length });

    const badgesB: Badge[] = await dbService.getHouseBadges(houseB.id);
    assert(badgesB.length === SYSTEM_BADGE_COUNT, `Casa B deveria ter ${SYSTEM_BADGE_COUNT} badges`, { len: badgesB.length });

    // --- Validação de domínio pura (validateCleaningPersistence) ------------------
    const now = new Date(2026, 8, 16); // quarta-feira
    const makePayload = (draft: CleaningFormDraft, opts: { houseId: string; members: HouseMember[]; registeredById: string; now?: Date }): CleaningRecord =>
      buildCleaningRecordPayload(draft, opts);

    const draftValid = {
      responsibleMemberId: USER_MEMBER,
      dayOfWeek: 'qua',
      badgeIds: [badgesA[0].id, badgesA[1].id],
      notes: 'Limpeza geral de quarta'
    } as CleaningFormDraft;

    const pValid = makePayload(draftValid, {
      houseId: houseA.id,
      members: membersA,
      registeredById: USER_CREATOR,
      now
    });
    let chk = validateCleaningPersistence(pValid, houseA, membersA, badgesA);
    assert(chk.valid, 'validateCleaningPersistence: registro válido deveria passar', { chk });

    chk = validateCleaningPersistence(pValid, null, membersA, badgesA);
    assert(!chk.valid && chk.errorCode === 'CLEANING_HOUSE_NOT_FOUND', 'validateCleaningPersistence: casa null deveria rejeitar CLEANING_HOUSE_NOT_FOUND', { chk });

    const pNoMember = { ...pValid, registeredById: USER_OUTSIDER };
    chk = validateCleaningPersistence(pNoMember, houseA, membersA, badgesA);
    assert(!chk.valid && chk.errorCode === 'CLEANING_MEMBERSHIP_REQUIRED', 'validateCleaningPersistence: não-membro deveria rejeitar CLEANING_MEMBERSHIP_REQUIRED', { chk });

    const pForeignResp = { ...pValid, userId: USER_OUTSIDER };
    chk = validateCleaningPersistence(pForeignResp, houseA, membersA, badgesA);
    assert(!chk.valid && chk.errorCode === 'CLEANING_RESPONSIBLE_NOT_IN_HOUSE', 'validateCleaningPersistence: responsável fora da casa deveria rejeitar CLEANING_RESPONSIBLE_NOT_IN_HOUSE', { chk });

    const pForeignBadge = { ...pValid, badgeIds: [badgesA[0].id, badgesB[0].id] };
    chk = validateCleaningPersistence(pForeignBadge, houseA, membersA, badgesA);
    assert(!chk.valid && chk.errorCode === 'CLEANING_BADGE_NOT_IN_HOUSE', 'validateCleaningPersistence: badge de outra casa deveria rejeitar CLEANING_BADGE_NOT_IN_HOUSE', { chk });

    // --- Cenário 1: persistência de registro válido --------------------------------
    const createRes = await dbService.createCleaningRecord(pValid);
    assert(createRes.success && createRes.record !== undefined, 'Cenário 1: registro válido deveria ser persistido', { createRes });

    const stored = getRecords();
    assert(stored.length === 1, 'Cenário 1: deveria existir 1 registro persistido', { len: stored.length });
    const recordA = stored[0];
    const fieldChecks: Array<[boolean, string]> = [
      [recordA.houseId === houseA.id, 'houseId deve ser o da casa A'],
      [recordA.userId === USER_MEMBER, 'userId deve ser o responsável'],
      [recordA.userName === 'Membro A', 'userName deve ser resolvido do membro'],
      [recordA.registeredById === USER_CREATOR, 'registeredById deve ser o solicitante'],
      [recordA.dayOfWeek === 'qua', 'dayOfWeek deve refletir o dia selecionado'],
      [recordA.cleaningDate === '2026-09-16', 'cleaningDate deve ser a data real da faxina'],
      [recordA.weekNumber >= 1 && recordA.weekNumber <= 4, 'weekNumber deve estar entre 1 e 4'],
      [recordA.month === 9 && recordA.year === 2026, 'month/year devem ser derivados da data'],
      [recordA.badgeIds.length === 2 && recordA.badgeIds.includes(badgesA[0].id) && recordA.badgeIds.includes(badgesA[1].id), 'badgeIds deve refletir as associações cleaning_badges'],
      [recordA.notes === 'Limpeza geral de quarta', 'notas devem ser preservadas'],
      [Boolean(recordA.id) && Boolean(recordA.createdAt), 'id/createdAt devem ser gerados']
    ];
    fieldChecks.forEach(([ok, describe]) => {
      assert(ok, `Cenário 1: ${describe}`, { record: recordA });
    });

    // --- Cenário 3: não-membro rejeitado sem persistência parcial ------------------
    const pOutsider = makePayload(draftValid, {
      houseId: houseA.id,
      members: membersA,
      registeredById: USER_OUTSIDER,
      now
    });
    const resNoMember = await dbService.createCleaningRecord(pOutsider);
    assert(!resNoMember.success && resNoMember.errorCode === 'CLEANING_MEMBERSHIP_REQUIRED', 'Cenário 3: não-membro deveria ser rejeitado', { resNoMember });
    assert(getRecords().length === 1, 'Cenário 3: nenhuma linha extra deveria ser persistida', { len: getRecords().length });

    // --- Cenário 4: responsável fora da casa ----------------------------------------
    const pRespForeign = { ...pValid, userId: USER_OUTSIDER, id: `cln-${Date.now()}-resp` };
    const resRespForeign = await dbService.createCleaningRecord(pRespForeign);
    assert(!resRespForeign.success && resRespForeign.errorCode === 'CLEANING_RESPONSIBLE_NOT_IN_HOUSE', 'Cenário 4: responsável fora da casa deveria ser rejeitado', { resRespForeign });
    assert(getRecords().length === 1, 'Cenário 4: nenhuma linha extra deveria ser persistida', { len: getRecords().length });

    // --- Cenário 5: badge de outra casa (RN-19) --------------------------------------
    const pBadgeForeign = { ...pValid, badgeIds: [badgesA[0].id, badgesB[0].id], id: `cln-${Date.now()}-badge` };
    const resBadgeForeign = await dbService.createCleaningRecord(pBadgeForeign);
    assert(!resBadgeForeign.success && resBadgeForeign.errorCode === 'CLEANING_BADGE_NOT_IN_HOUSE', 'Cenário 5: badge de outra casa deveria ser rejeitado', { resBadgeForeign });
    assert(getRecords().length === 1, 'Cenário 5: cabeçalho não deveria ser gravado', { len: getRecords().length });

    // --- Cenário 6: casa inexistente --------------------------------------------------
    const pNoHouse = { ...pValid, houseId: 'hse-inexistente', id: `cln-${Date.now()}-house` };
    const resNoHouse = await dbService.createCleaningRecord(pNoHouse);
    assert(!resNoHouse.success && resNoHouse.errorCode === 'CLEANING_HOUSE_NOT_FOUND', 'Cenário 6: casa inexistente deveria rejeitar CLEANING_HOUSE_NOT_FOUND', { resNoHouse });
    assert(getRecords().length === 1, 'Cenário 6: nenhuma linha extra deveria ser persistida', { len: getRecords().length });

    // --- Cenário 2: consulta isolada e filtro por semana (RN-19) ----------------------
    const pWeek2 = makePayload(
      { responsibleMemberId: USER_CREATOR, dayOfWeek: 'ter', badgeIds: [badgesA[2].id], notes: '' },
      { houseId: houseA.id, members: membersA, registeredById: USER_CREATOR, now: new Date(2026, 8, 8) } // terça-feira da semana 2
    );

    // Garante semana diferente: força metadados manuais para a casa B
    const pHouseB: CleaningRecord = makePayload(
      { responsibleMemberId: USER_OUTSIDER, dayOfWeek: 'sex', badgeIds: [badgesB[0].id], notes: 'Faxina da casa B' },
      { houseId: houseB.id, members: await dbService.getHouseMembers(houseB.id), registeredById: USER_OUTSIDER, now: new Date(2026, 8, 18) }
    );

    const resW2 = await dbService.createCleaningRecord(pWeek2);
    assert(resW2.success, 'Falha ao persistir registro da semana 2', { resW2 });
    const resB = await dbService.createCleaningRecord(pHouseB);
    assert(resB.success, 'Falha ao persistir registro da casa B', { resB });

    const allOfA = await dbService.getCleaningRecords(houseA.id);
    assert(allOfA.length === 2, 'Cenário 2: casa A deveria ter 2 registros', { len: allOfA.length });
    assert(allOfA.every(r => r.houseId === houseA.id), 'Cenário 2: isolação RN-19 — apenas registros da casa A', { allOfA });

    const allOfB = await dbService.getCleaningRecords(houseB.id);
    assert(allOfB.length === 1 && allOfB[0].houseId === houseB.id, 'Cenário 2: casa B deveria ter apenas seu próprio registro', { allOfB });

    const weekFiltered = await dbService.getCleaningRecords(houseA.id, { year: 2026, month: 9, weekNumber: pWeek2.weekNumber });
    assert(weekFiltered.length === 1 && weekFiltered[0].id === pWeek2.id, 'Cenário 2: filtro de semana deveria retornar apenas a semana solicitada', { weekFiltered });

    const userFiltered = await dbService.getCleaningRecords(houseA.id, { userId: USER_MEMBER });
    assert(userFiltered.length === 1 && userFiltered[0].userId === USER_MEMBER, 'Cenário 2d: filtro por responsável deve retornar apenas os registros do usuário', { userFiltered });

    // --- Cenário 8: idempotência + ausência de colisão no mesmo ms ---------------------
    const resDuplicate = await dbService.createCleaningRecord({ ...recordA });
    assert(!resDuplicate.success && resDuplicate.errorCode === 'CLEANING_RECORD_DUPLICATE', 'Cenário 8: id duplicado deveria ser rejeitado', { resDuplicate });

    const a = buildCleaningRecordPayload(draftValid, { houseId: houseA.id, members: membersA, registeredById: USER_CREATOR, now });
    const b = buildCleaningRecordPayload(draftValid, { houseId: houseA.id, members: membersA, registeredById: USER_CREATOR, now });
    assert(a.id !== b.id, 'Cenário 8b: dois payloads no mesmo ms deveriam ter IDs distintos', { a: a.id, b: b.id });

    // --- Cenário 7a: excluir badge remove a referência nos registros --------------------
    const badgeToDelete = badgesA[1].id;
    const delBadge = await dbService.deleteBadgeWithLog(houseA.id, badgeToDelete, USER_CREATOR, 'Criador A');
    assert(delBadge.success, 'Falha ao excluir badge para o teste de cascata', { delBadge });
    const recordAfterBadgeDelete = getRecords().find(r => r.id === recordA.id);
    assert(recordAfterBadgeDelete !== undefined, 'Cenário 7a: registro deveria continuar existente', {});
    assert(!recordAfterBadgeDelete!.badgeIds.includes(badgeToDelete), 'Cenário 7a: referência ao badge excluído deveria ser removida (CASCADE)', { badgeIds: recordAfterBadgeDelete!.badgeIds });
    assert(recordAfterBadgeDelete!.badgeIds.includes(badgesA[0].id), 'Cenário 7a: demais badges deveriam ser preservados', { badgeIds: recordAfterBadgeDelete!.badgeIds });
    const badgeLogs = getLogs().filter(l => l.entityType === 'BADGE');
    assert(badgeLogs.length === 1, 'Cenário 7a: log de auditoria do badge excluído deveria existir (Restrição 5)', { badgeLogs });

    // --- Cenário 7b: excluir casa remove os registros (CASCADE) --------------------------
    const houseLogsBefore = getLogs().length;
    const delHouse = await dbService.deleteHouseWithLog(houseB.id, USER_OUTSIDER, 'Criador B');
    assert(delHouse.success, 'Falha ao excluir casa B para o teste de cascata', { delHouse });
    const recordsAfterHouseDelete = getRecords();
    assert(!recordsAfterHouseDelete.some(r => r.houseId === houseB.id), 'Cenário 7b: registros da casa excluída deveriam ser removidos (CASCADE)', { recordsAfterHouseDelete });
    assert(recordsAfterHouseDelete.some(r => r.houseId === houseA.id), 'Cenário 7b: registros de outras casas deveriam permanecer', { recordsAfterHouseDelete });
    assert(getLogs().length === houseLogsBefore + 1, 'Cenário 7b: exclusão de casa deveria gerar 1 log de auditoria', { logs: getLogs() });

    const ret = {
      passed: true,
      totalTested,
      message:
        `SUCESSO: Persistência de Faxina (TSK-403 / SPEC-016) — ${totalTested} verificações: criação ` +
        `(cleaning_records + cleaning_badges) com fidelidade de campos, consulta isolada por casa e filtros ` +
        `(RN-19), rejeições CLEANING_HOUSE_NOT_FOUND / CLEANING_MEMBERSHIP_REQUIRED (RN-20) / ` +
        `CLEANING_RESPONSIBLE_NOT_IN_HOUSE / CLEANING_BADGE_NOT_IN_HOUSE, cascatas de exclusão ` +
        `(badge e casa — Restrição nº 5 preservada) e idempotência de escrita.`,
      details: {
        casaA: houseA.name,
        casaB: houseB.name,
        registrosCasaA: allOfA.length,
        registrosCasaB: allOfB.length,
        validacoes: {
          houseNotFound: true,
          membershipRequired: true,
          responsibleNotInHouse: true,
          badgeNotInHouse: true,
          duplicateId: true
        },
        cascatas: {
          badgeRemovesReference: true,
          houseRemovesRecords: true,
          auditLogsIntactos: true
        }
      }
    };
    return ret;
  } catch (err) {
    return {
      passed: false,
      totalTested,
      message: `FALHA: ${err instanceof Error ? err.message : String(err)}`,
      details: { registrosPersistidos: getRecords() }
    };
  }
}

export async function runCleaningPersistenceIntegrationTest(): Promise<{
  passed: boolean;
  totalTested: number;
  message: string;
  details: Record<string, any>;
}> {
  return runCleaningPersistenceSimulationTest();
}