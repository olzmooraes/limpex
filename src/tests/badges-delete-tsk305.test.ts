import { dbService } from '../services/supabase';
import { Badge, ExclusionLog } from '../types';
import { SYSTEM_BADGE_COUNT, MAX_TOTAL_BADGES, MAX_CUSTOM_BADGES } from '../services/badgeDefinitions';
import { validateBadgeDelete, BadgeDeleteCheck } from '../services/badgeDelete';
import { deriveBadgePanelState } from '../services/badgeView';

/**
 * Teste Automatizado de Domínio: Exclusão de Badges (TSK-305 / SPEC-013)
 * Valida os Cenários de exclusão restrita ao criador da casa (RN-14 / RN-15 / RN-21):
 *  - Cenário 1: exclusão válida de badge customizado (log de auditoria gravado).
 *  - Cenário 2: exclusão válida de badge do sistema (log com isSystem=true).
 *  - Cenário 3: rejeição por membro não-criador (BADGE_DELETE_FORBIDDEN) sem remoção nem log.
 *  - Cenário 4: rejeição de badge inexistente (BADGE_NOT_FOUND).
 *  - Cenário 5: rejeição de badge de outra casa (isolação RN-19).
 *  - Cenário 6: exclusão libera vaga no teto (RN-11/RN-12) e permite novo customizado.
 *  - Cenário 7: fidelidade do log de auditoria (campos obrigatórios, affectedRegisters, append-only).
 *  - Cenário 8: isolamento entre casas após a exclusão (RN-19).
 */
export async function runBadgesDeleteSimulationTest(): Promise<{
  passed: boolean;
  totalTested: number;
  message: string;
  details: Record<string, any>;
}> {
  const USER_CREATOR = 'usr-tsk305-creator';
  const USER_CREATOR_B = 'usr-tsk305-creator-b';
  const USER_CREATOR_C = 'usr-tsk305-creator-c';
  const USER_MEMBER = 'usr-tsk305-member';
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

  const getLogs = (): ExclusionLog[] => {
    const logsJson = localStorage.getItem(LOCAL_STORAGE_KEY_LOGS);
    return logsJson ? JSON.parse(logsJson) : [];
  };

  try {
    // 1. Ambiente isolado
    localStorage.setItem(LOCAL_STORAGE_KEY_HOUSES, JSON.stringify([]));
    localStorage.setItem(LOCAL_STORAGE_KEY_HOUSE_MEMBERS, JSON.stringify([]));
    localStorage.setItem(LOCAL_STORAGE_KEY_BADGES, JSON.stringify([]));
    localStorage.setItem(LOCAL_STORAGE_KEY_LOGS, JSON.stringify([]));
    localStorage.setItem(LOCAL_STORAGE_KEY_CLEANING_RECORDS, JSON.stringify([]));

    // 2. Criar casa e obter os badges do sistema
    const createHouse = await dbService.createHouse('Casa Delete Test', USER_CREATOR, 'Criador TSK305', 'criador305@teste.com');
    assert(createHouse.success && createHouse.house !== undefined, 'Falha ao criar a casa', { error: createHouse.error });
    const house = createHouse.house!;
    const initialBadges: Badge[] = await dbService.getHouseBadges(house.id);
    assert(initialBadges.length === SYSTEM_BADGE_COUNT, `Casa deveria ter ${SYSTEM_BADGE_COUNT} badges iniciais`, { len: initialBadges.length });

    const systemCozinha = initialBadges.find(b => b.name === 'Cozinha');
    const systemSala = initialBadges.find(b => b.name === 'Sala');
    const systemGaragem = initialBadges.find(b => b.name === 'Garagem');
    assert(systemCozinha !== undefined && systemSala !== undefined && systemGaragem !== undefined, 'Badges do sistema Cozinha/Sala/Garagem deveriam existir');

    // --- Validação de domínio: validateBadgeDelete ---
    const valValid = validateBadgeDelete(house.id, systemCozinha!.id, await dbService.getHouseBadges(house.id), house.creatorId, USER_CREATOR);
    assert(valValid.valid, 'validateBadgeDelete: criador + badge existente deveria ser válido', { valValid });
    const valForbidden: BadgeDeleteCheck = validateBadgeDelete(house.id, systemCozinha!.id, await dbService.getHouseBadges(house.id), house.creatorId, USER_MEMBER);
    assert(!valForbidden.valid && valForbidden.errorCode === 'BADGE_DELETE_FORBIDDEN', 'validateBadgeDelete: membro deveria ser rejeitado com BADGE_DELETE_FORBIDDEN', { valForbidden });
    const valNotFound = validateBadgeDelete(house.id, 'bdg-inexistente', await dbService.getHouseBadges(house.id), house.creatorId, USER_CREATOR);
    assert(!valNotFound.valid && valNotFound.errorCode === 'BADGE_NOT_FOUND', 'validateBadgeDelete: badge inexistente deveria rejeitar BADGE_NOT_FOUND', { valNotFound });

    // --- Cenário 1: Exclusão válida de badge customizado + log de auditoria ---
    const addCustomRes = await dbService.addCustomBadge(house.id, 'Lavanderia');
    assert(addCustomRes.success && addCustomRes.badge !== undefined, 'Cenário 1 setup: adicionar badge customizado', { error: addCustomRes.error });
    const customLavanderia = addCustomRes.badge!;

    const delCustomRes = await dbService.deleteBadgeWithLog(house.id, customLavanderia.id, USER_CREATOR, 'Criador TSK305');
    assert(delCustomRes.success, 'Cenário 1: excluir badge customizado deveria ter sucesso', { delCustomRes });
    assert(!((await dbService.getHouseBadges(house.id)).some(b => b.id === customLavanderia.id)), 'Cenário 1: badge customizado deveria ter sido removido');

    let logs = getLogs();
    assert(logs.length === 1, 'Cenário 1: deveria existir exatamente 1 log de auditoria', { count: logs.length });
    const logCustom = logs[0];
    assert(logCustom.entityType === 'BADGE' && logCustom.entityName === 'Lavanderia', 'Cenário 1: log deveria registrar BADGE "Lavanderia"', { logCustom });
    assert(logCustom.houseId === house.id && logCustom.metadata?.isSystem === false, 'Cenário 1: log deveria ter houseId e isSystem=false', { logCustom });
    assert(logCustom.metadata?.affectedRegisters === 0, 'Cenário 1: affectedRegisters deveria ser 0', { logCustom });

    // --- Cenário 2: Exclusão válida de badge do sistema + log isSystem=true ---
    const delSystemRes = await dbService.deleteBadgeWithLog(house.id, systemCozinha!.id, USER_CREATOR, 'Criador TSK305');
    assert(delSystemRes.success, 'Cenário 2: excluir badge do sistema deveria ter sucesso', { delSystemRes });
    assert(!((await dbService.getHouseBadges(house.id)).some(b => b.id === systemCozinha!.id)), 'Cenário 2: badge do sistema deveria ter sido removido');

    logs = getLogs();
    assert(logs.length === 2, 'Cenário 2: deveria existir exatamente 2 logs', { count: logs.length });
    const logSystem = logs[1];
    assert(logSystem.entityName === 'Cozinha' && logSystem.metadata?.isSystem === true, 'Cenário 2: log deveria registrar BADGE "Cozinha" com isSystem=true', { logSystem });

    // --- Cenário 3: Rejeição por membro (não criador) — BADGE_DELETE_FORBIDDEN ---
    const memberRes = await dbService.deleteBadgeWithLog(house.id, systemSala!.id, USER_MEMBER, 'Membro TSK305');
    assert(!memberRes.success && memberRes.errorCode === 'BADGE_DELETE_FORBIDDEN', 'Cenário 3: membro não deveria excluir badge', { memberRes });
    assert((await dbService.getHouseBadges(house.id)).some(b => b.id === systemSala!.id), 'Cenário 3: badge deveria permanecer na casa');
    assert(getLogs().length === 2, 'Cenário 3: nenhum log adicional deveria ser gravado para tentativa de membro', { count: getLogs().length });

    // --- Cenário 4: Rejeição de badge inexistente (BADGE_NOT_FOUND) ---
    const notFoundRes = await dbService.deleteBadgeWithLog(house.id, 'bdg-inexistente', USER_CREATOR, 'Criador TSK305');
    assert(!notFoundRes.success && notFoundRes.errorCode === 'BADGE_NOT_FOUND', 'Cenário 4: badge inexistente deveria rejeitar BADGE_NOT_FOUND', { notFoundRes });
    assert(getLogs().length === 2, 'Cenário 4: nenhum log adicional deveria ser gravado', { count: getLogs().length });

    // --- Cenário 5: Rejeição de badge de outra casa (isolação RN-19) ---
    const createB = await dbService.createHouse('Casa Delete B', USER_CREATOR_B, 'Criador B', 'criadorb305@teste.com');
    assert(createB.success && createB.house !== undefined, 'Cenário 5 setup: criar casa B', { error: createB.error });
    const houseB = createB.house!;
    const badgesB: Badge[] = await dbService.getHouseBadges(houseB.id);
    const salaB = badgesB.find(b => b.name === 'Sala');
    assert(salaB !== undefined, 'Cenário 5 setup: casa B deveria ter badge "Sala"');

    const crossHouseRes = await dbService.deleteBadgeWithLog(house.id, salaB!.id, USER_CREATOR, 'Criador TSK305');
    assert(!crossHouseRes.success && crossHouseRes.errorCode === 'BADGE_NOT_FOUND', 'Cenário 5: badge de outra casa deveria ser rejeitado (BADGE_NOT_FOUND)', { crossHouseRes });
    assert((await dbService.getHouseBadges(houseB.id)).some(b => b.id === salaB!.id), 'Cenário 5: badge da casa B deveria permanecer intacto');

    // --- Cenário 6: Exclusão libera vaga no teto (RN-11 / RN-12) ---
    // Casa dedicada (sem exclusões) para atingir exatamente 34 badges (14 + 20)
    const createC = await dbService.createHouse('Casa Delete Cap', USER_CREATOR_C, 'Criador C', 'criadorc305@teste.com');
    assert(createC.success && createC.house !== undefined, 'Cenário 6 setup: criar casa do teto', { error: createC.error });
    const houseCap = createC.house!;
    assert((await dbService.getHouseBadges(houseCap.id)).length === SYSTEM_BADGE_COUNT, 'Cenário 6 setup: casa do teto deveria iniciar com 14 badges');

    for (let i = 0; i < MAX_CUSTOM_BADGES; i++) {
      const addRes = await dbService.addCustomBadge(houseCap.id, `Custom C${i + 1}`);
      assert(addRes.success, `Cenário 6 setup: adicionar customizado ${i + 1}`, { error: addRes.error });
    }
    const capBadges = await dbService.getHouseBadges(houseCap.id);
    const viewCap = deriveBadgePanelState(capBadges);
    assert(capBadges.length === MAX_TOTAL_BADGES && viewCap.total === MAX_TOTAL_BADGES, `Cenário 6: total deveria ser ${MAX_TOTAL_BADGES} (RN-12)`, { total: viewCap.total });
    assert(viewCap.capReached && viewCap.customLimitReached, 'Cenário 6: capReached e customLimitReached deveriam estar ativos');

    const customToDelete = capBadges.find(b => !b.isSystem);
    assert(customToDelete !== undefined, 'Cenário 6: deveria existir badge customizado para excluir');
    const delCapRes = await dbService.deleteBadgeWithLog(houseCap.id, customToDelete!.id, USER_CREATOR_C, 'Criador C');
    assert(delCapRes.success, 'Cenário 6: excluir badge no teto deveria ter sucesso', { delCapRes });

    const viewAfter = deriveBadgePanelState(await dbService.getHouseBadges(houseCap.id));
    assert(viewAfter.total === MAX_TOTAL_BADGES - 1, `Cenário 6: total deveria cair para ${MAX_TOTAL_BADGES - 1}`, { total: viewAfter.total });
    assert(!viewAfter.capReached, 'Cenário 6: capReached deveria ficar falso após a exclusão');

    const reCreateRes = await dbService.addCustomBadge(houseCap.id, 'Custom Reinserido');
    assert(reCreateRes.success && reCreateRes.badge !== undefined, 'Cenário 6: vaga liberada deveria permitir novo badge customizado', { error: reCreateRes.error });

    logs = getLogs();
    const logCountAfterCap = logs.length;
    const capLog = logs[logCountAfterCap - 1];
    assert(capLog.entityName === customToDelete!.name, 'Cenário 6: log da exclusão no teto deveria registrar o badge correto', { capLog });

    // --- Cenário 7: Fidelidade do log de auditoria (RN-15 / Restrição nº 5) ---
    const lastLog = capLog;
    assert(Boolean(lastLog.deletedAt), 'Cenário 7: deletedAt deveria existir (ISO-8601/UTC)', { lastLog });
    assert(!isNaN(Date.parse(lastLog.deletedAt)), 'Cenário 7: deletedAt deveria ser uma data ISO válida', { lastLog });
    assert(lastLog.userId === USER_CREATOR_C && lastLog.userName === 'Criador C', 'Cenário 7: log deveria registrar autor correto', { lastLog });
    assert(lastLog.entityType === 'BADGE' && lastLog.entityId === customToDelete!.id && lastLog.entityName === customToDelete!.name, 'Cenário 7: entidade excluída deveria estar completa', { lastLog });
    assert(lastLog.houseId === houseCap.id, 'Cenário 7: houseId deveria ser da casa ativa', { lastLog });
    assert(typeof lastLog.metadata?.isSystem === 'boolean' && typeof lastLog.metadata?.affectedRegisters === 'number', 'Cenário 7: metadata.isSystem e affectedRegisters deveriam existir', { lastLog });

    // Append-only: logs anteriores preservados na ordem de criação
    assert(logs.length === 3, 'Cenário 7: deveria haver exatamente 3 logs (append-only)', { count: logs.length });
    assert(logs[0].entityName === 'Lavanderia' && logs[1].entityName === 'Cozinha', 'Cenário 7: logs anteriores deveriam permanecer intactos na ordem', { names: logs.map(l => l.entityName) });

    // --- Cenário 8: Isolamento entre casas após exclusão (RN-19) ---
    const delSalaA = await dbService.deleteBadgeWithLog(house.id, systemSala!.id, USER_CREATOR, 'Criador TSK305');
    assert(delSalaA.success, 'Cenário 8: excluir "Sala" da casa A deveria ter sucesso', { delSalaA });
    assert(!((await dbService.getHouseBadges(house.id)).some(b => b.id === systemSala!.id)), 'Cenário 8: "Sala" deveria ter sido removida da casa A');
    assert((await dbService.getHouseBadges(houseB.id)).some(b => b.name === 'Sala'), 'Cenário 8: "Sala" da casa B deveria permanecer intacta (RN-19)');

    return {
      passed: true,
      totalTested,
      message: 'SUCESSO: Exclusão de Badges (TSK-305) — exclusão de customizado e do sistema restrita ao criador (RN-21), log obrigatório de auditoria gravado com fidelidade (RN-15 / Restrição nº 5), rejeição por membro (BADGE_DELETE_FORBIDDEN), badge inexistente (BADGE_NOT_FOUND) e isolação entre casas (RN-19) validada, com liberação de vaga no teto de 34 (RN-11/RN-12).',
      details: {
        casa: house.id,
        logsAuditoria: logs.map(l => ({ name: l.entityName, isSystem: l.metadata?.isSystem, affected: l.metadata?.affectedRegisters })),
        teto: { totalAntes: MAX_TOTAL_BADGES, totalDepois: viewAfter.total, capReachedDepois: viewAfter.capReached },
        permissoes: { criadorPode: true, membroPode: false }
      }
    };
  } catch (err) {
    return {
      passed: false,
      totalTested,
      message: `FALHA: Exclusão de Badges (TSK-305) — ${err instanceof Error ? err.message : String(err)}`,
      details: {}
    };
  }
}