import { dbService } from '../services/supabase';
import { Badge } from '../types';
import { MAX_TOTAL_BADGES, MAX_CUSTOM_BADGES, SYSTEM_BADGE_COUNT } from '../services/badgeDefinitions';
import {
  validateBadgeName,
  nextCustomDisplayOrder,
  BADGE_NAME_MAX_LENGTH
} from '../services/badgeCreation';
import { deriveBadgePanelState } from '../services/badgeView';

/**
 * Teste Automatizado de Domínio: Criação de Badges Customizados (TSK-303 / SPEC-011)
 * Valida os Cenários de criação com trava em 20 customizados / 34 totais:
 *  - Cenário 1: criação válida de badge customizado (RN-11).
 *  - Cenário 2: rejeição de nome vazio (BADGE_NAME_EMPTY).
 *  - Cenário 3: rejeição de nome duplicado (BADGE_NAME_DUPLICATE).
 *  - Cenário 4: rejeição de nome excedendo 40 caracteres (BADGE_NAME_TOO_LONG).
 *  - Cenário 5: rejeição ao atingir teto de 20 customizados (BADGE_CUSTOM_LIMIT_REACHED / RN-11).
 *  - Cenário 6: rejeição ao atingir teto de 34 badges totais (BADGE_LIMIT_REACHED / RN-12 / Restrição nº 3).
 *  - Cenário 7: criação bem-sucedida via dbService.addCustomBadge (integração mock).
 *  - Cenário 8: displayOrder do novo badge é coerente (acima de 14).
 *  - Cenário 9: contadores derivados atualizam em tempo real após criação.
 *  - Cenário 10:case-insensitive — nome duplicado com caixa diferente é rejeitado.
 */
export async function runBadgesCreateSimulationTest(): Promise<{
  passed: boolean;
  totalTested: number;
  message: string;
  details: Record<string, any>;
}> {
  const USER_CREATOR = 'usr-tsk303-creator';
  const LOCAL_STORAGE_KEY_HOUSES = 'limpex_mock_houses';
  const LOCAL_STORAGE_KEY_HOUSE_MEMBERS = 'limpex_mock_house_members';
  const LOCAL_STORAGE_KEY_BADGES = 'limpex_mock_badges';

  // 1. Ambiente isolado
  localStorage.setItem(LOCAL_STORAGE_KEY_HOUSES, JSON.stringify([]));
  localStorage.setItem(LOCAL_STORAGE_KEY_HOUSE_MEMBERS, JSON.stringify([]));
  localStorage.setItem(LOCAL_STORAGE_KEY_BADGES, JSON.stringify([]));

  // 2. Criar casa e obter badges do sistema
  const createHouse = await dbService.createHouse('Casa Create Test', USER_CREATOR, 'Criador Teste', 'criador@teste.com');
  if (!createHouse.success || !createHouse.house) {
    return { passed: false, totalTested: 1, message: `Falha ao criar a casa: ${createHouse.error}`, details: { createHouse } };
  }
  const house = createHouse.house;
  const initialBadges: Badge[] = await dbService.getHouseBadges(house.id);

  if (initialBadges.length !== SYSTEM_BADGE_COUNT) {
    return {
      passed: false,
      totalTested: 2,
      message: `Casa deveria ter ${SYSTEM_BADGE_COUNT} badges iniciais (encontrados: ${initialBadges.length})`,
      details: { initialBadges: initialBadges.map((b) => b.name) }
    };
  }

  // --- Cenário 1: Criação válida de badge customizado ---
  const val1 = validateBadgeName('Lavanderia', initialBadges);
  if (!val1.valid) {
    return { passed: false, totalTested: 3, message: `Cenário 1: criação válida deveria ser aceita — ${val1.errorMessage}`, details: { val1 } };
  }

  // --- Cenário 2: Rejeição de nome vazio ---
  const val2 = validateBadgeName('', initialBadges);
  if (val2.valid || val2.errorCode !== 'BADGE_NAME_EMPTY') {
    return { passed: false, totalTested: 4, message: 'Cenário 2: nome vazio deveria ser rejeitado com BADGE_NAME_EMPTY', details: { val2 } };
  }

  const val2b = validateBadgeName('   ', initialBadges);
  if (val2b.valid || val2b.errorCode !== 'BADGE_NAME_EMPTY') {
    return { passed: false, totalTested: 5, message: 'Cenário 2b: nome com apenas espaços deveria ser rejeitado', details: { val2b } };
  }

  // --- Cenário 3: Rejeição de nome duplicado ---
  const val3 = validateBadgeName('Janelas', initialBadges);
  if (val3.valid || val3.errorCode !== 'BADGE_NAME_DUPLICATE') {
    return { passed: false, totalTested: 6, message: 'Cenário 3: nome duplicado deveria ser rejeitado com BADGE_NAME_DUPLICATE', details: { val3 } };
  }

  // --- Cenário 4: Rejeição de nome excedendo 40 caracteres ---
  const longName = 'A'.repeat(BADGE_NAME_MAX_LENGTH + 1);
  const val4 = validateBadgeName(longName, initialBadges);
  if (val4.valid || val4.errorCode !== 'BADGE_NAME_TOO_LONG') {
    return { passed: false, totalTested: 7, message: 'Cenário 4: nome longo deveria ser rejeitado com BADGE_NAME_TOO_LONG', details: { val4 } };
  }

  // Nome com exatamente 40 caracteres deve ser aceito
  const exactName = 'B'.repeat(BADGE_NAME_MAX_LENGTH);
  const val4b = validateBadgeName(exactName, initialBadges);
  if (!val4b.valid) {
    return { passed: false, totalTested: 8, message: `Cenário 4b: nome com ${BADGE_NAME_MAX_LENGTH} caracteres deveria ser aceito`, details: { val4b } };
  }

  // --- Cenário 7: Criação via dbService.addCustomBadge (integração) ---
  const addResult = await dbService.addCustomBadge(house.id, 'Lavanderia');
  if (!addResult.success || !addResult.badge) {
    return { passed: false, totalTested: 9, message: `Cenário 7: addCustomBadge deveria ter sucesso — ${addResult.error}`, details: { addResult } };
  }
  if (addResult.badge.isSystem !== false) {
    return { passed: false, totalTested: 10, message: 'Cenário 7: badge criado deveria ter isSystem=false', details: { addResult } };
  }
  if (addResult.badge.name !== 'Lavanderia') {
    return { passed: false, totalTested: 11, message: 'Cenário 7: nome do badge criado incorreto', details: { addResult } };
  }

  // --- Cenário 8: displayOrder coerente ---
  if ((addResult.badge.displayOrder ?? 0) <= SYSTEM_BADGE_COUNT) {
    return {
      passed: false,
      totalTested: 12,
      message: `Cenário 8: displayOrder (${addResult.badge.displayOrder}) deveria ser > ${SYSTEM_BADGE_COUNT}`,
      details: { badge: addResult.badge }
    };
  }

  // --- Cenário 9: contadores derivados atualizam ---
  const afterAdd: Badge[] = await dbService.getHouseBadges(house.id);
  const viewAfterAdd = deriveBadgePanelState(afterAdd);
  if (viewAfterAdd.total !== SYSTEM_BADGE_COUNT + 1 || viewAfterAdd.customCount !== 1) {
    return {
      passed: false,
      totalTested: 13,
      message: `Cenário 9: contadores deveriam ser total=${SYSTEM_BADGE_COUNT + 1}, custom=1 (encontrados: total=${viewAfterAdd.total}, custom=${viewAfterAdd.customCount})`,
      details: { viewAfterAdd }
    };
  }

  // --- Cenário 10: case-insensitive ---
  const val10 = validateBadgeName('lavanderia', afterAdd);
  if (val10.valid || val10.errorCode !== 'BADGE_NAME_DUPLICATE') {
    return { passed: false, totalTested: 14, message: 'Cenário 10: duplicata case-insensitive deveria ser rejeitada', details: { val10 } };
  }

  // --- Cenário 5: Rejeição ao atingir teto de 20 customizados (RN-11) ---
  // Cenário isolado: array hipotético com 20 customizados (sem badges de sistema),
  // de modo que total (20) ainda não alcance 34 — o que força a trava RN-11.
  const customOnly19: Badge[] = Array.from({ length: MAX_CUSTOM_BADGES - 1 }, (_, i) => ({
    id: `iso-custom-${i}`,
    houseId: 'hse-iso',
    name: `ISO ${i + 1}`,
    isSystem: false,
    displayOrder: i + 1,
    createdAt: new Date().toISOString()
  }));
  const val5a = validateBadgeName('Extra', customOnly19);
  if (!val5a.valid) {
    return { passed: false, totalTested: 15, message: `Cenário 5: com ${MAX_CUSTOM_BADGES - 1} customizados a criação deveria ser aceita — ${val5a.errorMessage}`, details: { val5a } };
  }

  const customOnly20: Badge[] = [...customOnly19, {
    id: 'iso-custom-20',
    houseId: 'hse-iso',
    name: 'ISO 20',
    isSystem: false,
    displayOrder: MAX_CUSTOM_BADGES,
    createdAt: new Date().toISOString()
  }];
  const val5 = validateBadgeName('Extras', customOnly20);
  if (val5.valid || val5.errorCode !== 'BADGE_CUSTOM_LIMIT_REACHED') {
    return { passed: false, totalTested: 16, message: 'Cenário 5: criação deveria ser rejeitada com BADGE_CUSTOM_LIMIT_REACHED', details: { val5 } };
  }

  // --- Cenário 6: Rejeição ao atingir teto de 34 totais (RN-12 / Restrição nº 3) ---
  // Saturar a casa real (dbService) até 34 badges: 14 sistema + 20 customizados.
  for (let i = 1; i < MAX_CUSTOM_BADGES; i++) {
    const r = await dbService.addCustomBadge(house.id, `Custom ${i}`);
    if (!r.success) {
      return { passed: false, totalTested: 17, message: `Cenário 6 setup: falha ao criar custom ${i} — ${r.error}`, details: { r } };
    }
  }
  const badgesAtCap: Badge[] = await dbService.getHouseBadges(house.id);
  if (badgesAtCap.length !== MAX_TOTAL_BADGES) {
    return {
      passed: false,
      totalTested: 17,
      message: `Cenário 6: casa deveria ter ${MAX_TOTAL_BADGES} badges (encontrados: ${badgesAtCap.length})`,
      details: { len: badgesAtCap.length }
    };
  }

  const val6 = validateBadgeName('Mais Um', badgesAtCap);
  if (val6.valid || val6.errorCode !== 'BADGE_LIMIT_REACHED') {
    return { passed: false, totalTested: 18, message: 'Cenário 6: criação deveria ser rejeitada com BADGE_LIMIT_REACHED', details: { val6 } };
  }

  // addCustomBadge deve falhar diretamente
  const addAtCap = await dbService.addCustomBadge(house.id, 'Ignorado');
  if (addAtCap.success) {
    return { passed: false, totalTested: 19, message: 'Cenário 6b: addCustomBadge deveria rejeitar com teto atingido', details: { addAtCap } };
  }

  // --- Cenário 8 (reforço): nextCustomDisplayOrder ---
  const nextOrder = nextCustomDisplayOrder(badgesAtCap);
  if (nextOrder <= SYSTEM_BADGE_COUNT) {
    return {
      passed: false,
      totalTested: 20,
      message: `Cenário 8b: nextCustomDisplayOrder (${nextOrder}) deveria ser > ${SYSTEM_BADGE_COUNT}`,
      details: { nextOrder }
    };
  }

  return {
    passed: true,
    totalTested: 20,
    message: `SUCESSO: Criação de Badges Customizados (TSK-303) — validação de nome (vazio, duplicado case-insensitive, limite 40 chars), criação via dbService com displayOrder coerente, contadores derivados atualizados em tempo real, trava de ${MAX_CUSTOM_BADGES} customizados (RN-11) e trava de ${MAX_TOTAL_BADGES} totais (RN-12 / Restrição nº 3) com rejeição em camada de domínio e serviço.`,
    details: {
      casa: { id: house.id, total: viewAfterAdd.total, custom: viewAfterAdd.customCount },
      casaCap: { id: house.id, total: badgesAtCap.length },
      validacoes: { vazio: true, duplicado: true, caseInsensitive: true, longo: true, tetoCustom: true, tetoTotal: true }
    }
  };
}
