import { dbService } from '../services/supabase';
import { CleaningRecord, Badge, House } from '../types';
import {
  deriveWeekContext,
  getInitials,
  resolveBadgeNames,
  buildCleaningCardView,
  visibleBadgeNames,
  deriveWeekHomeState,
  formatRecordCount,
  TWO_TASKS_LIMIT,
} from '../services/cleaningWeekView';
import { WEEKDAY_ORDER } from '../services/cleaningRegistration';
import { SYSTEM_BADGE_COUNT } from '../services/badgeDefinitions';

/**
 * Teste Automatizado de Domínio: Tela Principal — Cards de Faxinas da Semana Vigente
 * (TSK-404 / SPEC-017 / RN-06 / RN-07 / RN-08 / RN-19)
 *  - Cenário 1: contexto semanal determinístico derivado da data atual (RN-08/RN-24).
 *  - Cenário 2: consulta filtrada da semana vigente e isolamento por casa (RN-19).
 *  - Cenário 3: derivação do card (nome/iniciais/dia/nomes de badges/notas).
 *  - Cenário 4: expansão > 2 tarefas e visibilidade colapsada/expandida (RN-07).
 *  - Cenário 5: contador do resumo semanal (0, 1, N).
 *  - Cenário 6: referência órfã de badge removido não quebra o card.
 */
export async function runHomeWeekSimulationTest(): Promise<{
  passed: boolean;
  totalTested: number;
  message: string;
  details: Record<string, any>;
}> {
  const USER_CREATOR = 'usr-tsk404-creator';
  const USER_MEMBER = 'usr-tsk404-member';
  const USER_OTHER = 'usr-tsk404-other';
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

  try {
    // 1. Ambiente isolado
    localStorage.setItem(LOCAL_STORAGE_KEY_HOUSES, JSON.stringify([]));
    localStorage.setItem(LOCAL_STORAGE_KEY_HOUSE_MEMBERS, JSON.stringify([]));
    localStorage.setItem(LOCAL_STORAGE_KEY_BADGES, JSON.stringify([]));
    localStorage.setItem(LOCAL_STORAGE_KEY_LOGS, JSON.stringify([]));
    localStorage.setItem(LOCAL_STORAGE_KEY_CLEANING_RECORDS, JSON.stringify([]));

    // 2. Casas A (criador + membro) e B (isolamento RN-19)
    const houseARes = await dbService.createHouse('Casa Tela Principal A', USER_CREATOR, 'Carlos Oliveira', 'carlos@teste.com');
    assert(houseARes.success && houseARes.house !== undefined, 'Falha ao criar casa A', { error: houseARes.error });
    const houseA: House = houseARes.house!;

    const joinRes = await dbService.joinHouseByInviteCode(houseA.inviteCode, USER_MEMBER, 'Mariana de Souza', 'mariana@teste.com');
    assert(joinRes.success, 'Falha ao vincular membro na casa A', { error: joinRes.error });

    const houseBRes = await dbService.createHouse('Casa Tela Principal B', USER_OTHER, 'Pessoa Outra', 'outro@teste.com');
    assert(houseBRes.success && houseBRes.house !== undefined, 'Falha ao criar casa B', { error: houseBRes.error });
    const houseB: House = houseBRes.house!;

    const badgesA: Badge[] = await dbService.getHouseBadges(houseA.id);
    assert(badgesA.length === SYSTEM_BADGE_COUNT, `Casa A deveria ter ${SYSTEM_BADGE_COUNT} badges`, { len: badgesA.length });
    const badgesB: Badge[] = await dbService.getHouseBadges(houseB.id);
    assert(badgesB.length === SYSTEM_BADGE_COUNT, `Casa B deveria ter ${SYSTEM_BADGE_COUNT} badges`, { len: badgesB.length });

    // 3. Cenário 1: contexto semanal determinístico (RN-08/RN-24)
    const now = new Date(2026, 8, 16); // quarta-feira, 2026-09-16
    const ctx = deriveWeekContext(now);
    assert(ctx.weekNumber === 3 && ctx.month === 9 && ctx.year === 2026,
      'Cenário 1: deriveWeekContext deveria derivar semana 3 de setembro de 2026', { ctx });
    assert(ctx.weekLabel === 'Semana 3 de Setembro de 2026',
      'Cenário 1: rótulo da semana deveria seguir o formato RN-24', { label: ctx.weekLabel });
    assert(ctx.todayDayOfWeek === WEEKDAY_ORDER[new Date(2026, 8, 16).getDay()],
      'Cenário 1: dia atual deveria ser ' + WEEKDAY_ORDER[new Date(2026, 8, 16).getDay()], { today: ctx.todayDayOfWeek });

    // 4. Persistir registros da semana vigente (semana 3) e de semanas/casas distintas
    const makeRecord = (partial: Partial<CleaningRecord>): CleaningRecord => {
      const base: CleaningRecord = {
        id: `cln-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        houseId: '',
        userId: USER_MEMBER,
        userName: 'Mariana de Souza',
        registeredById: USER_CREATOR,
        dayOfWeek: 'ter',
        cleaningDate: '2026-09-15',
        weekNumber: 3,
        month: 9,
        year: 2026,
        badgeIds: [],
        notes: undefined,
        createdAt: '2026-09-15T08:00:00.000Z',
      };
      return { ...base, ...partial };
    };

    const recCurrent1: CleaningRecord = makeRecord({
      houseId: houseA.id,
      dayOfWeek: 'ter',
      cleaningDate: '2026-09-15',
      badgeIds: [badgesA[0].id, badgesA[1].id, badgesA[2].id], // 3 tarefas → expansível
      notes: 'Limpeza especial no piso da cozinha.',
    });
    const recCurrent2: CleaningRecord = makeRecord({
      houseId: houseA.id,
      userId: USER_CREATOR,
      userName: 'Carlos Oliveira',
      registeredById: USER_CREATOR,
      dayOfWeek: 'qui',
      cleaningDate: '2026-09-17',
      badgeIds: [badgesA[3].id, badgesA[4].id], // 2 tarefas → não expansível
    });
    const recOtherWeek: CleaningRecord = makeRecord({
      houseId: houseA.id,
      cleaningDate: '2026-09-08', // semana 2 (8/14 → teto(8/7)=2)
      weekNumber: 2,
      badgeIds: [badgesA[5].id],
    });
    const recHouseB: CleaningRecord = makeRecord({
      houseId: houseB.id,
      userId: USER_OTHER,
      userName: 'Pessoa Outra',
      registeredById: USER_OTHER,
      cleaningDate: '2026-09-15',
      badgeIds: [badgesB[0].id],
    });

    const persistOk = (
      await Promise.all([
        dbService.createCleaningRecord(recCurrent1),
        dbService.createCleaningRecord(recCurrent2),
        dbService.createCleaningRecord(recOtherWeek),
        dbService.createCleaningRecord(recHouseB),
      ])
    ).every((r) => r.success);
    assert(persistOk, 'Todos os 4 registros de teste deveriam ser persistidos');

    // 5. Cenário 2: consulta da semana vigente com isolamento (RN-19)
    const weeklyA = await dbService.getCleaningRecords(houseA.id, { year: 2026, month: 9, weekNumber: 3 });
    assert(weeklyA.length === 2, 'Cenário 2: semana 3 da casa A deveria ter 2 registros', { len: weeklyA.length });
    assert(weeklyA.every((r) => r.houseId === houseA.id), 'Cenário 2: isolamento RN-19 — apenas registros da casa A', { weeklyA });
    assert(weeklyA.every((r) => r.weekNumber === 3 && r.month === 9 && r.year === 2026),
      'Cenário 2: apenas registros da semana vigente deveriam ser retornados', { weeklyA });
    assert(weeklyA[0].cleaningDate === '2026-09-15' && weeklyA[1].cleaningDate === '2026-09-17',
      'Cenário 2: ordenação cronológica ascendente por cleaningDate', { dates: weeklyA.map((r) => r.cleaningDate) });

    // 6. Cenário 3: derivação do card (RN-07)
    const card1 = buildCleaningCardView(recCurrent1, badgesA);
    assert(card1.userName === 'Mariana de Souza' && card1.initials === 'MS',
      'Cenário 3: identificação clara do responsável — nome e iniciais do avatar', { card1 });
    assert(card1.weekdayLabel === 'Terça-feira',
      'Cenário 3: dia da semana deve ser o label completo ($WEEKDAY_LABELS)', { weekday: card1.weekdayLabel });
    assert(card1.badgeNames.length === 3
      && card1.badgeNames[0] === badgesA[0].name
      && card1.badgeNames[2] === badgesA[2].name,
      'Cenário 3: nomes dos badges devem ser resolvidos na ordem de record.badgeIds', { badgeNames: card1.badgeNames });
    assert(card1.hasNotes === true && card1.notes === 'Limpeza especial no piso da cozinha.',
      'Cenário 3: hasNotes/notes devem refletir a observação (base da TSK-406)', { card1 });

    const card2 = buildCleaningCardView(recCurrent2, badgesA);
    assert(card2.userName === 'Carlos Oliveira' && card2.initials === 'CO',
      'Cenário 3: iniciais de "Carlos Oliveira" devem ser CO', { initials: card2.initials });
    assert(card2.weekdayLabel === 'Quinta-feira', 'Cenário 3: dia deve ser Quinta-feira', { weekday: card2.weekdayLabel });
    assert(card2.hasNotes === false && card2.notes === undefined,
      'Cenário 3: registro sem observações não deve exibir indicador de notas', { card2 });

    // 7. Cenário 4: expansão > 2 tarefas (RN-07 / base da TSK-405)
    assert(TWO_TASKS_LIMIT === 2, 'Cenário 4: limite de tarefas visíveis deve ser 2');
    assert(card1.isExpandable === true && card1.overflowCount === 1,
      'Cenário 4: 3 tarefas → expansível com overflow de 1', { card1 });
    assert(card2.isExpandable === false && card2.overflowCount === 0,
      'Cenário 4: 2 tarefas → não expansível', { card2 });

    const fiveBadges = buildCleaningCardView(
      { ...recCurrent1, badgeIds: badgesA.slice(0, 5).map((b) => b.id) },
      badgesA
    );
    assert(fiveBadges.isExpandable === true && fiveBadges.overflowCount === 3,
      'Cenário 4: 5 tarefas → expansível com overflow de 3', { fiveBadges });
    assert(visibleBadgeNames(card1, false).length === 2,
      'Cenário 4: colapsado exibe apenas os 2 primeiros badges', { visible: visibleBadgeNames(card1, false) });
    assert(visibleBadgeNames(card1, true).length === 3,
      'Cenário 4: expandido exibe todos os badges', { visible: visibleBadgeNames(card1, true) });
    assert(JSON.stringify(visibleBadgeNames(card1, false)) === JSON.stringify(card1.badgeNames.slice(0, 2)),
      'Cenário 4: visibilidade colapsada deve preservar a ordem dos badges', {});

    // 8. getInitials (casos de nome)
    assert(getInitials('Carlos Oliveira') === 'CO', 'getInitials: 2 palavras → CO');
    assert(getInitials('Zé') === 'Z', 'getInitials: 1 palavra → Z');
    assert(getInitials('Maria da Silva Santos') === 'MS', 'getInitials: partículas de ligação ignoradas → MS');
    assert(getInitials('João Élber') === 'JE', 'getInitials: acentos removidos → JE');
    assert(getInitials('   ') === '?', 'getInitials: nome vazio → ?');

    // 9. Cenário 5: contador do resumo semanal
    assert(formatRecordCount(0) === '0 registradas', 'Cenário 5: contador 0 → "0 registradas"');
    assert(formatRecordCount(1) === '1 registrada', 'Cenário 5: contador 1 → "1 registrada" (singular)');
    assert(formatRecordCount(3) === '3 registradas', 'Cenário 5: contador 3 → "3 registradas"');

    const homeState = deriveWeekHomeState(weeklyA, badgesA, now);
    assert(homeState.count === 2 && homeState.cards.length === 2,
      'Cenário 5: resumo semanal deve refletir a quantidade de registros da semana', { homeState });
    assert(homeState.weekContext.weekLabel === 'Semana 3 de Setembro de 2026',
      'Cenário 5: contexto do resumo deve ser o da semana vigente', { label: homeState.weekContext.weekLabel });

    // 10. Cenário 6: badge removido (referência órfã) não quebra o card
    const orphanRecord: CleaningRecord = { ...recCurrent2, badgeIds: [badgesA[3].id, 'bdg-removido-xyz'] };
    const orphanCard = buildCleaningCardView(orphanRecord, badgesA.slice(0, 4));
    assert(orphanCard.badgeNames.length === 1 && orphanCard.badgeNames[0] === badgesA[3].name,
      'Cenário 6: badge órfão deve ser ignorado sem quebrar o card', { orphanCard });
    const orphNames = resolveBadgeNames(orphanRecord, badgesA.slice(0, 4));
    assert(orphNames.length === 1, 'Cenário 6: resolveBadgeNames deve filtrar referências órfãs', { orphNames });

    const ret = {
      passed: true,
      totalTested,
      message:
        `SUCESSO: Tela Principal da Semana Vigente (TSK-404 / SPEC-017) — ${totalTested} verificações: ` +
        `contexto semanal determinístico (RN-08/RN-24), consulta da semana vigente com isolamento ` +
        `por casa/semana (RN-19), cards com responsável/iniciais/dia/badges/notas (RN-07), expansão ` +
        `funcional > 2 tarefas (base TSK-405), indicador de observações (base TSK-406) e contador dinâmico.`,
      details: {
        casaA: houseA.name,
        casaB: houseB.name,
        semana: homeState.weekContext.weekLabel,
        registrosSemana: weeklyA.length,
        cardsDerivados: homeState.cards.length,
        expansao: { isExpandable: card1.isExpandable, overflowCount: card1.overflowCount },
        indicadorNotas: card1.hasNotes,
        contador: formatRecordCount(homeState.count),
      },
    };
    return ret;
  } catch (err) {
    return {
      passed: false,
      totalTested,
      message: `FALHA: ${err instanceof Error ? err.message : String(err)}`,
      details: { localStorage: {
        casas: localStorage.getItem(LOCAL_STORAGE_KEY_HOUSES),
        membros: localStorage.getItem(LOCAL_STORAGE_KEY_HOUSE_MEMBERS),
        badges: localStorage.getItem(LOCAL_STORAGE_KEY_BADGES),
        registros: localStorage.getItem(LOCAL_STORAGE_KEY_CLEANING_RECORDS),
      } },
    };
  }
}

export async function runHomeWeekIntegrationTest(): Promise<{
  passed: boolean;
  totalTested: number;
  message: string;
  details: Record<string, any>;
}> {
  return runHomeWeekSimulationTest();
}