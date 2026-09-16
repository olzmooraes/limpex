import { dbService } from '../services/supabase';
import { Badge } from '../types';
import { createSystemBadges, MAX_TOTAL_BADGES, MAX_CUSTOM_BADGES } from '../services/badgeDefinitions';
import {
  deriveBadgePanelState,
  canManageBadges,
  SYSTEM_BADGE_COUNT
} from '../services/badgeView';

/**
 * Teste Automatizado de Domínio: Tela de Gestão de Badges (TSK-302 / SPEC-010)
 * Valida os Cenários 1 a 5 da SPEC-010 sobre os dados reais da casa ativa:
 *  - Cenário 1: agrupamento Sistema/Customizado e contadores em tempo real (RN-10/11/12).
 *  - Cenário 2: isolamento por casa (RN-19) — cada casa carrega o próprio conjunto.
 *  - Cenário 3/RN-21: visibilidade do "Novo Badge" apenas para o criador (canManageBadges).
 *  - Cenário 4/RN-12: trava visual quando o teto de 34 é atingido (capReached).
 *  - Cenário 5/RN-19: troca de casa ativa retorna o conjunto da nova casa.
 */
export async function runBadgesScreenSimulationTest(): Promise<{
  passed: boolean;
  totalTested: number;
  message: string;
  details: Record<string, any>;
}> {
  const USER_CREATOR_A = 'usr-tsk302-creator-a';
  const USER_CREATOR_B = 'usr-tsk302-creator-b';
  const USER_MEMBER = 'usr-tsk302-member';
  const LOCAL_STORAGE_KEY_HOUSES = 'limpex_mock_houses';
  const LOCAL_STORAGE_KEY_HOUSE_MEMBERS = 'limpex_mock_house_members';
  const LOCAL_STORAGE_KEY_BADGES = 'limpex_mock_badges';

  // 1. Ambiente isolado de teste
  localStorage.setItem(LOCAL_STORAGE_KEY_HOUSES, JSON.stringify([]));
  localStorage.setItem(LOCAL_STORAGE_KEY_HOUSE_MEMBERS, JSON.stringify([]));
  localStorage.setItem(LOCAL_STORAGE_KEY_BADGES, JSON.stringify([]));

  // 2. Criar casa A (Cenário 1: seed de 14 badges do sistema)
  const createA = await dbService.createHouse('Casa Badges A', USER_CREATOR_A, 'Criador A', 'criadora@teste.com');
  if (!createA.success || !createA.house) {
    return { passed: false, totalTested: 1, message: `Falha ao criar a casa A: ${createA.error}`, details: { createA } };
  }
  const houseA = createA.house;
  const badgesA: Badge[] = await dbService.getHouseBadges(houseA.id);

  // 2.1. Cenário 1: 14 badges do sistema, todos isSystem=true
  if (badgesA.length !== SYSTEM_BADGE_COUNT) {
    return {
      passed: false,
      totalTested: 2,
      message: `Casa A deveria ter ${SYSTEM_BADGE_COUNT} badges do sistema (encontrados: ${badgesA.length})`,
      details: { badgesA: badgesA.map((b) => b.name) }
    };
  }

  // 2.2. Derivação do estado da tela: contadores corretos
  const viewA = deriveBadgePanelState(badgesA);
  if (viewA.total !== SYSTEM_BADGE_COUNT || viewA.systemCount !== SYSTEM_BADGE_COUNT || viewA.customCount !== 0) {
    return {
      passed: false,
      totalTested: 3,
      message: `Contadores derivados da casa A incorretos (total=${viewA.total}, sistema=${viewA.systemCount}, custom=${viewA.customCount})`,
      details: { viewA }
    };
  }
  if (viewA.capReached || viewA.customLimitReached) {
    return {
      passed: false,
      totalTested: 4,
      message: 'Trava de teto não deveria estar ativa com apenas os badges do sistema',
      details: { viewA }
    };
  }

  // 2.3. Agrupamento: customBadges vazio e systemBadges ordenado por displayOrder
  if (viewA.customBadges.length !== 0) {
    return {
      passed: false,
      totalTested: 5,
      message: 'Nenhum badge customizado deveria existir na casa A (seed apenas do sistema)',
      details: { viewA }
    };
  }
  const orderedA = viewA.systemBadges.filter((b, i) => (b.displayOrder ?? 0) === i + 1);
  if (orderedA.length !== SYSTEM_BADGE_COUNT) {
    return {
      passed: false,
      totalTested: 6,
      message: 'SystemBadges não está ordenado por displayOrder 1..14',
      details: { viewA: viewA.systemBadges.map((b) => b.displayOrder) }
    };
  }

  // 3. Novo badge customizado (RN-11): contadores/agrupamento atualizam em tempo real
  const addCustom = await dbService.addCustomBadge(houseA.id, 'Lavanderia');
  if (!addCustom.success || !addCustom.badge) {
    return {
      passed: false,
      totalTested: 7,
      message: `Falha ao adicionar badge customizado: ${addCustom.error}`,
      details: { addCustom }
    };
  }
  const badgesA2 = await dbService.getHouseBadges(houseA.id);
  const viewA2 = deriveBadgePanelState(badgesA2);
  if (viewA2.total !== SYSTEM_BADGE_COUNT + 1 || viewA2.customCount !== 1 || viewA2.customBadges[0]?.name !== 'Lavanderia') {
    return {
      passed: false,
      totalTested: 8,
      message: 'Após adicionar customizado, contadores/agrupamento não atualizaram',
      details: { viewA2: { total: viewA2.total, customCount: viewA2.customCount, names: viewA2.customBadges.map((b) => b.name) } }
    };
  }

  // 4. RN-21 (Cenário 3): apenas o criador gerencia badges
  if (!canManageBadges(houseA.creatorId, USER_CREATOR_A)) {
    return { passed: false, totalTested: 9, message: 'O criador deveria poder gerenciar badges', details: {} };
  }
  if (canManageBadges(houseA.creatorId, USER_MEMBER)) {
    return { passed: false, totalTested: 10, message: 'Um membro (não criador) NÃO deveria gerenciar badges', details: {} };
  }
  if (canManageBadges(undefined, USER_CREATOR_A)) {
    return { passed: false, totalTested: 11, message: 'Sem casa ativa, controles de gestão devem ficar ocultos', details: {} };
  }

  // 5. RN-12 (Cenário 4): trava visual ao atingir o teto de 34 badges
  const baseNames = createSystemBadges('hse-cap-test', new Date().toISOString());
  const capped: Badge[] = [...baseNames];
  for (let i = 0; i < MAX_CUSTOM_BADGES; i++) {
    capped.push({ id: `cap-custom-${i}`, houseId: 'hse-cap-test', name: `Custom ${i + 1}`, isSystem: false, displayOrder: 15 + i, createdAt: new Date().toISOString() });
  }
  if (capped.length !== MAX_TOTAL_BADGES) {
    return { passed: false, totalTested: 12, message: 'Cenário de teto mal montado (34 badges)', details: { len: capped.length } };
  }
  const viewCap = deriveBadgePanelState(capped);
  if (!viewCap.capReached || viewCap.total !== 34) {
    return {
      passed: false,
      totalTested: 13,
      message: 'capReached deveria estar ativo com 34 badges (RN-12/RN da Restrição nº 3)',
      details: { viewCap: { total: viewCap.total, capReached: viewCap.capReached } }
    };
  }
  if (viewCap.customCount !== MAX_CUSTOM_BADGES || !viewCap.customLimitReached) {
    return {
      passed: false,
      totalTested: 14,
      message: 'customLimitReached deveria estar ativo com 20 customizados (RN-11)',
      details: { viewCap: { customCount: viewCap.customCount, customLimitReached: viewCap.customLimitReached } }
    };
  }

  // 6. RN-19 (Cenário 5): troca de casa ativa carrega o conjunto da nova casa
  const createB = await dbService.createHouse('Casa Badges B', USER_CREATOR_B, 'Criador B', 'criadorb@teste.com');
  if (!createB.success || !createB.house) {
    return { passed: false, totalTested: 15, message: `Falha ao criar a casa B: ${createB.error}`, details: { createB } };
  }
  const houseB = createB.house;
  const badgesB: Badge[] = await dbService.getHouseBadges(houseB.id);
  const viewB = deriveBadgePanelState(badgesB);
  if (viewB.total !== SYSTEM_BADGE_COUNT || viewB.systemCount !== SYSTEM_BADGE_COUNT || viewB.customCount !== 0) {
    return {
      passed: false,
      totalTested: 16,
      message: 'Casa B (nova casa ativa) não carregou seu próprio conjunto de badges',
      details: { viewB }
    };
  }
  const idsA = new Set(badgesA2.map((b) => b.id));
  const shared = badgesB.filter((b) => idsA.has(b.id));
  if (shared.length > 0) {
    return {
      passed: false,
      totalTested: 17,
      message: `Badges compartilhados entre casas (${shared.length}) — quebra de isolamento RN-19`,
      details: { shared: shared.map((b) => b.id) }
    };
  }

  return {
    passed: true,
    totalTested: 17,
    message: `SUCESSO: Tela de Gestão de Badges (TSK-302) exibe dados reais da casa ativa — agrupamento Sistema (${SYSTEM_BADGE_COUNT}) e Customizados com contadores em tempo real, RBAC por criador (RN-21), trava no teto de ${MAX_TOTAL_BADGES} (RN-12) e isolamento entre casas (RN-19).`,
    details: {
      casaA: { id: houseA.id, badges: viewA2.total, custom: viewA2.customCount },
      casaB: { id: houseB.id, badges: viewB.total },
      teto: { total: 34, capReached: true },
      permissoes: { criadorPode: true, membroPode: false }
    }
  };
}