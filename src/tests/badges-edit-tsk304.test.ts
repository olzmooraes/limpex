import { dbService } from '../services/supabase';
import { Badge } from '../types';
import { SYSTEM_BADGE_COUNT } from '../services/badgeDefinitions';
import {
  validateBadgeEditName
} from '../services/badgeEdit';
import { BADGE_NAME_MAX_LENGTH } from '../services/badgeCreation';
import { deriveBadgePanelState } from '../services/badgeView';

/**
 * Teste Automatizado de Domínio: Edição de Badges (TSK-304 / SPEC-012)
 * Valida os Cenários de renomeação restrita ao criador da casa (RN-13 / RN-21):
 *  - Cenário 1: renomeação válida de badge customizado (mantém isSystem=false).
 *  - Cenário 2: renomeação válida de badge do sistema (mantém isSystem=true).
 *  - Cenário 3: mesmo nome (no-op) aceito sem erro.
 *  - Cenário 4: rejeição de nome vazio (BADGE_NAME_EMPTY).
 *  - Cenário 5: rejeição de nome duplicado case-insensitive (BADGE_NAME_DUPLICATE).
 *  - Cenário 6: rejeição de nome acima de 40 caracteres (BADGE_NAME_TOO_LONG).
 *  - Cenário 7: rejeição por membro não-criador (BADGE_EDIT_FORBIDDEN).
 *  - Cenário 8: rejeição de badge inexistente (BADGE_NOT_FOUND).
 *  - Cenário 9: contadores e displayOrder inalterados após edição.
 */
export async function runBadgesEditSimulationTest(): Promise<{
  passed: boolean;
  totalTested: number;
  message: string;
  details: Record<string, any>;
}> {
  const USER_CREATOR = 'usr-tsk304-creator';
  const LOCAL_STORAGE_KEY_HOUSES = 'limpex_mock_houses';
  const LOCAL_STORAGE_KEY_HOUSE_MEMBERS = 'limpex_mock_house_members';
  const LOCAL_STORAGE_KEY_BADGES = 'limpex_mock_badges';

  let totalTested = 0;
  const assert = (cond: boolean, msg: string, details?: Record<string, any>) => {
    totalTested++;
    if (!cond) {
      throw new Error(msg + (details ? ` — ${JSON.stringify(details)}` : ''));
    }
  };

  try {
    // 1. Ambiente isolado
    localStorage.setItem(LOCAL_STORAGE_KEY_HOUSES, JSON.stringify([]));
    localStorage.setItem(LOCAL_STORAGE_KEY_HOUSE_MEMBERS, JSON.stringify([]));
    localStorage.setItem(LOCAL_STORAGE_KEY_BADGES, JSON.stringify([]));

    // 2. Criar casa e obter os badges do sistema
    const createHouse = await dbService.createHouse('Casa Edit Test', USER_CREATOR, 'Criador TSK304', 'criador304@teste.com');
    assert(createHouse.success && createHouse.house !== undefined, 'Falha ao criar a casa', { error: createHouse.error });
    const house = createHouse.house!;
    const initialBadges: Badge[] = await dbService.getHouseBadges(house.id);
    assert(initialBadges.length === SYSTEM_BADGE_COUNT, `Casa deveria ter ${SYSTEM_BADGE_COUNT} badges iniciais`, { len: initialBadges.length });

    const systemCozinha = initialBadges.find(b => b.name === 'Cozinha');
    const systemSala = initialBadges.find(b => b.name === 'Sala');
    assert(systemCozinha !== undefined && systemSala !== undefined, 'Badges do sistema Cozinha/Sala deveriam existir');

    // --- Cenário 2: Renomeação válida de badge do sistema (isSystem=true) ---
    const renameSystemRes = await dbService.renameBadge(house.id, systemCozinha!.id, 'Cozinha Principal', USER_CREATOR);
    assert(renameSystemRes.success && renameSystemRes.badge !== undefined, 'Cenário 2: renomear badge do sistema deveria ter sucesso', { renameSystemRes });
    assert(renameSystemRes.badge!.name === 'Cozinha Principal', 'Cenário 2: nome atualizado incorreto');
    assert(renameSystemRes.badge!.isSystem === true, 'Cenário 2: isSystem deveria permanecer true');
    assert(renameSystemRes.badge!.displayOrder === systemCozinha!.displayOrder, 'Cenário 2: displayOrder deveria permanecer igual');

    // --- Cenário 1: Renomeação válida de badge customizado (isSystem=false) ---
    const addCustomRes = await dbService.addCustomBadge(house.id, 'Lavanderia');
    assert(addCustomRes.success && addCustomRes.badge !== undefined, 'Cenário 1 setup: adicionar badge customizado', { error: addCustomRes.error });
    const customLavanderia = addCustomRes.badge!;
    const renameCustomRes = await dbService.renameBadge(house.id, customLavanderia.id, 'Lavanderia Premium', USER_CREATOR);
    assert(renameCustomRes.success && renameCustomRes.badge !== undefined, 'Cenário 1: renomear badge customizado deveria ter sucesso', { renameCustomRes });
    assert(renameCustomRes.badge!.name === 'Lavanderia Premium', 'Cenário 1: nome atualizado incorreto');
    assert(renameCustomRes.badge!.isSystem === false, 'Cenário 1: isSystem deveria permanecer false');
    assert(renameCustomRes.badge!.displayOrder === customLavanderia.displayOrder, 'Cenário 1: displayOrder deveria permanecer igual');

    // --- Cenário 3: Mesmo nome (no-op) aceito ---
    const noOpRes = await dbService.renameBadge(house.id, systemCozinha!.id, 'Cozinha Principal', USER_CREATOR);
    assert(noOpRes.success, 'Cenário 3: renomear para o mesmo nome deveria ter sucesso (no-op)', { noOpRes });

    // Validação de domínio também aceita no-op (exclui o próprio badge da checagem)
    const badgesAfterRename: Badge[] = await dbService.getHouseBadges(house.id);
    const valNoOp = validateBadgeEditName('Cozinha Principal', systemCozinha!.id, badgesAfterRename);
    assert(valNoOp.valid, 'Cenário 3: validateBadgeEditName deveria aceitar o mesmo nome', { valNoOp });

    // --- Cenário 4: Rejeição de nome vazio (BADGE_NAME_EMPTY) ---
    const valEmpty = validateBadgeEditName('', systemCozinha!.id, badgesAfterRename);
    assert(!valEmpty.valid && valEmpty.errorCode === 'BADGE_NAME_EMPTY', 'Cenário 4: nome vazio deveria ser rejeitado com BADGE_NAME_EMPTY', { valEmpty });

    const emptyRes = await dbService.renameBadge(house.id, systemCozinha!.id, '   ', USER_CREATOR);
    assert(!emptyRes.success && emptyRes.errorCode === 'BADGE_NAME_EMPTY', 'Cenário 4: renameBadge com nome vazio deveria rejeitar BADGE_NAME_EMPTY', { emptyRes });
    assert((await dbService.getHouseBadges(house.id)).find(b => b.id === systemCozinha!.id)?.name === 'Cozinha Principal', 'Cenário 4: nome original deveria permanecer inalterado');

    // --- Cenário 5: Rejeição de nome duplicado case-insensitive (BADGE_NAME_DUPLICATE) ---
    const addSalaRes = await dbService.addCustomBadge(house.id, 'Sala de Estar');
    assert(addSalaRes.success && addSalaRes.badge !== undefined, 'Cenário 5 setup: adicionar badge "Sala de Estar"', { error: addSalaRes.error });

    const valDup = validateBadgeEditName('sala de estar', systemSala!.id, await dbService.getHouseBadges(house.id));
    assert(!valDup.valid && valDup.errorCode === 'BADGE_NAME_DUPLICATE', 'Cenário 5: duplicata deveria ser rejeitada com BADGE_NAME_DUPLICATE', { valDup });

    const salaDupRes = await dbService.renameBadge(house.id, systemSala!.id, 'sala de estar', USER_CREATOR);
    assert(!salaDupRes.success && salaDupRes.errorCode === 'BADGE_NAME_DUPLICATE', 'Cenário 5: renomear Sistema "Sala" para "sala de estar" deveria rejeitar duplicata', { salaDupRes });
    assert((await dbService.getHouseBadges(house.id)).find(b => b.id === systemSala!.id)?.name === 'Sala', 'Cenário 5: nome "Sala" deveria permanecer inalterado');

    // --- Cenário 6: Rejeição de nome acima de 40 caracteres (BADGE_NAME_TOO_LONG) ---
    const longName = 'X'.repeat(BADGE_NAME_MAX_LENGTH + 1);
    const valLong = validateBadgeEditName(longName, systemSala!.id, await dbService.getHouseBadges(house.id));
    assert(!valLong.valid && valLong.errorCode === 'BADGE_NAME_TOO_LONG', 'Cenário 6: nome longo deveria ser rejeitado com BADGE_NAME_TOO_LONG', { valLong });

    const longRes = await dbService.renameBadge(house.id, systemSala!.id, longName, USER_CREATOR);
    assert(!longRes.success && longRes.errorCode === 'BADGE_NAME_TOO_LONG', 'Cenário 6: renameBadge deveria rejeitar nome longo', { longRes });

    // Nome com exatamente 40 caracteres é aceito (domínio)
    const exactName = 'Y'.repeat(BADGE_NAME_MAX_LENGTH);
    const valExact = validateBadgeEditName(exactName, systemSala!.id, await dbService.getHouseBadges(house.id));
    assert(valExact.valid, 'Cenário 6b: nome com 40 caracteres deveria ser aceito', { valExact });

    // --- Cenário 7: Rejeição por membro (não criador) — BADGE_EDIT_FORBIDDEN ---
    const memberRes = await dbService.renameBadge(house.id, customLavanderia.id, 'Hackeado', 'usr-tsk304-member');
    assert(!memberRes.success && memberRes.errorCode === 'BADGE_EDIT_FORBIDDEN', 'Cenário 7: membro não deveria renomear badge', { memberRes });
    assert((await dbService.getHouseBadges(house.id)).find(b => b.id === customLavanderia.id)?.name === 'Lavanderia Premium', 'Cenário 7: nome não deveria mudar com tentativa de membro');

    // --- Cenário 8: Rejeição de badge inexistente (BADGE_NOT_FOUND) ---
    const notFoundRes = await dbService.renameBadge(house.id, 'bdg-inexistente', 'Qualquer', USER_CREATOR);
    assert(!notFoundRes.success && notFoundRes.errorCode === 'BADGE_NOT_FOUND', 'Cenário 8: badge inexistente deveria rejeitar BADGE_NOT_FOUND', { notFoundRes });

    // --- Cenário 9: Contadores e displayOrder inalterados após edição ---
    const finalBadges: Badge[] = await dbService.getHouseBadges(house.id);
    const view = deriveBadgePanelState(finalBadges);
    assert(view.total === SYSTEM_BADGE_COUNT + 2, `Cenário 9: total deveria ser ${SYSTEM_BADGE_COUNT + 2}`, { total: view.total });
    assert(view.systemCount === SYSTEM_BADGE_COUNT, `Cenário 9: systemCount deveria ser ${SYSTEM_BADGE_COUNT}`, { systemCount: view.systemCount });
    assert(view.customCount === 2, 'Cenário 9: customCount deveria ser 2', { customCount: view.customCount });
    assert(finalBadges.some(b => b.name === 'Cozinha Principal'), 'Cenário 9: badge do sistema renomeado deveria refletir no estado derivado');
    assert(finalBadges.some(b => b.name === 'Lavanderia Premium'), 'Cenário 9: badge customizado renomeado deveria refletir no estado derivado');
    assert(!finalBadges.some(b => b.name === 'Cozinha'), 'Cenário 9: nome antigo "Cozinha" não deveria existir');

    const referred = finalBadges.find(b => b.id === systemCozinha!.id);
    assert(referred?.displayOrder === systemCozinha!.displayOrder && (referred?.isSystem ?? false) === true, 'Cenário 9: displayOrder e isSystem preservados após renomear sistema');

    return {
      passed: true,
      totalTested,
      message: 'SUCESSO: Edição de Badges (TSK-304) — renomeação de badge customizado e do sistema validada com preservação de isSystem/displayOrder, no-op aceito, rejeição de nome vazio/duplicado case-insensitive/40+ chars, bloco de edição por membro (BADGE_EDIT_FORBIDDEN), badge inexistente (BADGE_NOT_FOUND) e contadores inalterados (RN-13 / RN-21 / RN-12).',
      details: {
        casa: house.id,
        viewFinal: { total: view.total, system: view.systemCount, custom: view.customCount },
        renomeados: view.systemBadges.filter(b => b.name.includes('Principal')).map(b => b.name).concat(view.customBadges.map(b => b.name))
      }
    };
  } catch (err) {
    return {
      passed: false,
      totalTested,
      message: `FALHA: Edição de Badges (TSK-304) — ${err instanceof Error ? err.message : String(err)}`,
      details: {}
    };
  }
}