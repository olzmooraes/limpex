import { dbService } from '../services/supabase';
import { Badge } from '../types';
import { SYSTEM_BADGE_NAMES, SYSTEM_BADGE_COUNT } from '../services/badgeDefinitions';

/**
 * Teste Automatizado de Domínio: Seed dos 14 Badges de Sistema (TSK-301 / SPEC-009)
 * - RN-10: Toda casa nasce com exatamente 14 badges do sistema, `isSystem = true`,
 *   com `displayOrder` 1..14 na ordem fixa e nomes idênticos à RN-10.
 * - Unicidade `UNIQUE(house_id, name)`: nenhum nome duplicado dentro de uma casa.
 * - Isolamento por casa (Cenário 2): casas diferentes possuem conjuntos independentes.
 * Cenários 1 e 2 da SPEC-009.
 */
export async function runBadgesSeedSimulationTest(): Promise<{
  passed: boolean;
  totalTested: number;
  message: string;
  details: Record<string, any>;
}> {
  const USER_CREATOR_A = 'usr-tsk301-creator-a';
  const USER_CREATOR_B = 'usr-tsk301-creator-b';
  const LOCAL_STORAGE_KEY_HOUSES = 'limpex_mock_houses';
  const LOCAL_STORAGE_KEY_HOUSE_MEMBERS = 'limpex_mock_house_members';
  const LOCAL_STORAGE_KEY_BADGES = 'limpex_mock_badges';

  // 1. Ambiente isolado de teste
  localStorage.setItem(LOCAL_STORAGE_KEY_HOUSES, JSON.stringify([]));
  localStorage.setItem(LOCAL_STORAGE_KEY_HOUSE_MEMBERS, JSON.stringify([]));
  localStorage.setItem(LOCAL_STORAGE_KEY_BADGES, JSON.stringify([]));

  // 2. Criar a Casa A (Cenário 1 seed automático)
  const createA = await dbService.createHouse('Casa Badges A', USER_CREATOR_A, 'Criador A', 'criadora@teste.com');
  if (!createA.success || !createA.house) {
    return {
      passed: false,
      totalTested: 1,
      message: `Falha ao criar a casa A: ${createA.error}`,
      details: { createA }
    };
  }
  const houseA = createA.house;

  // 2.1. Exatamente 14 badges persistidos para a casa A (RN-10)
  const badgesA: Badge[] = await dbService.getHouseBadges(houseA.id);
  if (badgesA.length !== SYSTEM_BADGE_COUNT) {
    return {
      passed: false,
      totalTested: 2,
      message: `A casa A deveria ter exatamente ${SYSTEM_BADGE_COUNT} badges do sistema (encontrados: ${badgesA.length})`,
      details: { badgesA: badgesA.map(b => b.name) }
    };
  }

  // 2.2. Todos os badges são do sistema (isSystem = true)
  const nonSystemBadges = badgesA.filter(b => b.isSystem !== true);
  if (nonSystemBadges.length > 0) {
    return {
      passed: false,
      totalTested: 3,
      message: 'Existem badges seedados que não são do sistema (isSystem !== true)',
      details: { nonSystemBadges }
    };
  }

  // 2.3. displayOrder 1..14 presente e na ordem fixa da RN-10
  const orderedNames = [...badgesA]
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
    .map(b => b.name);
  const expectedNames = [...SYSTEM_BADGE_NAMES];
  if (JSON.stringify(orderedNames) !== JSON.stringify(expectedNames)) {
    return {
      passed: false,
      totalTested: 4,
      message: 'A ordem/displayOrder dos badges não corresponde à ordem fixa da RN-10',
      details: { orderedNames, expectedNames, badgesA }
    };
  }

  const hasFullDisplayOrder = expectedNames.every((_, idx) =>
    badgesA.some(b => (b.displayOrder ?? 0) === idx + 1)
  );
  if (!hasFullDisplayOrder) {
    return {
      passed: false,
      totalTested: 5,
      message: 'A sequência displayOrder 1..14 está incompleta ou duplicada',
      details: { displayOrders: badgesA.map(b => b.displayOrder) }
    };
  }

  // 2.4. Unicidade UNIQUE(house_id, name): nenhum nome duplicado na casa A
  const nameSet = new Set(badgesA.map(b => b.name));
  if (nameSet.size !== SYSTEM_BADGE_COUNT) {
    return {
      passed: false,
      totalTested: 6,
      message: `Violação da constraint UNIQUE(house_id, name): nomes duplicados na casa A (${nameSet.size}/${badgesA.length} únicos)`,
      details: { names: badgesA.map(b => b.name) }
    };
  }

  // 3. Criar a Casa B com outro criador (Cenário 2: isolamento por casa)
  const createB = await dbService.createHouse('Casa Badges B', USER_CREATOR_B, 'Criador B', 'criadorb@teste.com');
  if (!createB.success || !createB.house) {
    return {
      passed: false,
      totalTested: 7,
      message: `Falha ao criar a casa B: ${createB.error}`,
      details: { createB }
    };
  }
  const houseB = createB.house;

  const badgesB: Badge[] = await dbService.getHouseBadges(houseB.id);
  if (badgesB.length !== SYSTEM_BADGE_COUNT) {
    return {
      passed: false,
      totalTested: 8,
      message: `A casa B deveria ter exatamente ${SYSTEM_BADGE_COUNT} badges do sistema (encontrados: ${badgesB.length})`,
      details: { badgesB: badgesB.map(b => b.name) }
    };
  }

  // 3.1. Independência total: nenhum badge é compartilhado entre as casas A e B
  const idsA = new Set(badgesA.map(b => b.id));
  const shared = badgesB.filter(b => idsA.has(b.id));
  if (shared.length > 0) {
    return {
      passed: false,
      totalTested: 9,
      message: `Badges compartilhados entre casas detectados (${shared.length}) — violação do isolamento por casa`,
      details: { shared: shared.map(b => b.id) }
    };
  }

  // 3.2. Os conjuntos de nomes das casas A e B devem ser idênticos (mesmos 14 do sistema)
  const namesA = new Set(badgesA.map(b => b.name));
  const namesB = badgesB.map(b => b.name).sort();
  const expectedSorted = [...expectedNames].sort();
  if (JSON.stringify(namesB) !== JSON.stringify(expectedSorted) || badgesB.some(b => !namesA.has(b.name))) {
    return {
      passed: false,
      totalTested: 10,
      message: 'A casa B não recebeu exatamente os mesmos 14 nomes do sistema da RN-10',
      details: { namesB, expectedSorted }
    };
  }

  return {
    passed: true,
    totalTested: 10,
    message: `SUCESSO: A criação de cada casa seeda exatamente ${SYSTEM_BADGE_COUNT} badges do sistema (isSystem=true), displayOrder 1..14 na ordem RN-10, com unicidade e isolamento entre casas.`,
    details: {
      casaA: { name: houseA.name, badgeCount: badgesA.length },
      casaB: { name: houseB.name, badgeCount: badgesB.length },
      sistema: expectedNames,
      badgesIndependentes: idsA.size + badgesB.length - shared.length
    }
  };
}