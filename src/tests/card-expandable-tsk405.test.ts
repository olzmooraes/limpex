import { CleaningCardView, buildCleaningCardView } from '../services/cleaningWeekView';
import { deriveCardExpandableState } from '../services/cardExpandable';
import { CleaningRecord, Badge } from '../types';

/**
 * Suíte de Teste de Domínio: Micro-Animação e Card Expansível de Faxina
 * (TSK-405 / SPEC-018 / RN-07 / Restrição Obrigatória nº 1)
 *
 * Cenários validados:
 *  - Cenário 1: Card com 1 ou 2 badges (não expansível, sem overflow, initialBadges preservado).
 *  - Cenário 2: Card com 3 badges (expansível com overflow 1, singular "+ 1 tarefa executada").
 *  - Cenário 3: Card com 4 badges (expansível com overflow 2, plural "+ 2 tarefas executadas").
 *  - Cenário 4: Card com 5 badges (expansível com overflow 3, plural "+ 3 tarefas executadas").
 *  - Cenário 5: Preservação da ordem canônica dos badges entre initialBadges e overflowBadges.
 *  - Cenário 6: Rótulo de recolhimento padronizado ("Recolher tarefas").
 *  - Cenário 7: Derivação de card a partir de CleaningRecord real e badges da casa.
 */
export async function runCardExpandableSimulationTest(): Promise<{
  passed: boolean;
  totalTested: number;
  message: string;
  details: Record<string, any>;
}> {
  let totalTested = 0;
  const assert = (cond: boolean, msg: string, details?: Record<string, any>) => {
    totalTested++;
    if (!cond) {
      throw new Error(msg + (details ? ` — ${JSON.stringify(details)}` : ''));
    }
  };

  try {
    const makeCardView = (badgeNames: string[]): CleaningCardView => ({
      recordId: `rec-${Math.random().toString(36).substring(2, 8)}`,
      userName: 'Carlos Oliveira',
      initials: 'CO',
      weekdayLabel: 'Terça-feira',
      badgeNames,
      hasNotes: false,
      notes: undefined,
      isExpandable: badgeNames.length > 2,
      overflowCount: Math.max(0, badgeNames.length - 2),
    });

    // 1. Cenário 1: 1 badge -> não expansível
    const singleCard = makeCardView(['Varrer sala']);
    const singleState = deriveCardExpandableState(singleCard);
    assert(singleState.isExpandable === false, 'Cenário 1: 1 badge não deve ser expansível', { singleState });
    assert(singleState.overflowCount === 0, 'Cenário 1: 1 badge deve ter overflowCount = 0', { singleState });
    assert(singleState.initialBadges.length === 1 && singleState.initialBadges[0] === 'Varrer sala',
      'Cenário 1: initialBadges deve conter o único badge', { singleState });
    assert(singleState.overflowBadges.length === 0, 'Cenário 1: overflowBadges deve ser vazio', { singleState });

    // 2. Cenário 1: 2 badges -> não expansível (RN-07: teto base de 2)
    const twoCards = makeCardView(['Varrer sala', 'Passar pano']);
    const twoState = deriveCardExpandableState(twoCards);
    assert(twoState.isExpandable === false, 'Cenário 1: 2 badges não deve ser expansível', { twoState });
    assert(twoState.overflowCount === 0, 'Cenário 1: 2 badges deve ter overflowCount = 0', { twoState });
    assert(twoState.initialBadges.length === 2 && twoState.initialBadges[1] === 'Passar pano',
      'Cenário 1: initialBadges deve conter os 2 badges', { twoState });
    assert(twoState.overflowBadges.length === 0, 'Cenário 1: overflowBadges deve ser vazio', { twoState });

    // 3. Cenário 2: 3 badges -> expansível (overflow 1, singular "+ 1 tarefa executada")
    const threeCards = makeCardView(['Varrer sala', 'Passar pano', 'Lavar louça']);
    const threeState = deriveCardExpandableState(threeCards);
    assert(threeState.isExpandable === true, 'Cenário 2: 3 badges deve ser expansível', { threeState });
    assert(threeState.overflowCount === 1, 'Cenário 2: 3 badges deve ter overflowCount = 1', { threeState });
    assert(threeState.initialBadges.length === 2, 'Cenário 2: initialBadges deve ter exatamente 2 itens', { threeState });
    assert(threeState.overflowBadges.length === 1 && threeState.overflowBadges[0] === 'Lavar louça',
      'Cenário 2: overflowBadges deve conter a 3ª tarefa', { threeState });
    assert(threeState.expandLabel === '+ 1 tarefa executada',
      'Cenário 2: rótulo singular deve ser "+ 1 tarefa executada"', { label: threeState.expandLabel });
    assert(threeState.collapseLabel === 'Recolher tarefas',
      'Cenário 2: rótulo de recolhimento deve ser "Recolher tarefas"', { label: threeState.collapseLabel });

    // 4. Cenário 3: 4 badges -> expansível (overflow 2, plural "+ 2 tarefas executadas")
    const fourCards = makeCardView(['Varrer sala', 'Passar pano', 'Lavar louça', 'Tirar lixo']);
    const fourState = deriveCardExpandableState(fourCards);
    assert(fourState.isExpandable === true, 'Cenário 3: 4 badges deve ser expansível', { fourState });
    assert(fourState.overflowCount === 2, 'Cenário 3: 4 badges deve ter overflowCount = 2', { fourState });
    assert(fourState.expandLabel === '+ 2 tarefas executadas',
      'Cenário 3: rótulo plural deve ser "+ 2 tarefas executadas"', { label: fourState.expandLabel });
    assert(fourState.overflowBadges.length === 2
      && fourState.overflowBadges[0] === 'Lavar louça'
      && fourState.overflowBadges[1] === 'Tirar lixo',
      'Cenário 3: overflowBadges deve conter tarefas 3 e 4', { fourState });

    // 5. Cenário 4: 5 badges -> expansível (overflow 3, plural "+ 3 tarefas executadas")
    const fiveCards = makeCardView(['B1', 'B2', 'B3', 'B4', 'B5']);
    const fiveState = deriveCardExpandableState(fiveCards);
    assert(fiveState.isExpandable === true, 'Cenário 4: 5 badges deve ser expansível', { fiveState });
    assert(fiveState.overflowCount === 3, 'Cenário 4: 5 badges deve ter overflowCount = 3', { fiveState });
    assert(fiveState.expandLabel === '+ 3 tarefas executadas',
      'Cenário 4: rótulo plural deve ser "+ 3 tarefas executadas"', { label: fiveState.expandLabel });

    // 6. Cenário 5: Preservação estrita da ordem canônica dos badges
    const allTogether = [...fiveState.initialBadges, ...fiveState.overflowBadges];
    assert(JSON.stringify(allTogether) === JSON.stringify(fiveCards.badgeNames),
      'Cenário 5: a união de initialBadges e overflowBadges deve preservar a ordem original dos badges',
      { allTogether, original: fiveCards.badgeNames });

    // 7. Cenário 6: Edge case - 0 badges
    const emptyCard = makeCardView([]);
    const emptyState = deriveCardExpandableState(emptyCard);
    assert(emptyState.isExpandable === false, 'Cenário 6: 0 badges não deve ser expansível', { emptyState });
    assert(emptyState.overflowCount === 0, 'Cenário 6: overflowCount deve ser 0', { emptyState });
    assert(emptyState.initialBadges.length === 0 && emptyState.overflowBadges.length === 0,
      'Cenário 6: ambos os arrays devem ser vazios', { emptyState });

    // 8. Cenário 7: Integração com buildCleaningCardView a partir de dados reais
    const mockRecord: CleaningRecord = {
      id: 'cln-teste-tsk405',
      houseId: 'house-123',
      userId: 'usr-456',
      userName: 'Mariana de Souza',
      registeredById: 'usr-456',
      dayOfWeek: 'qua',
      cleaningDate: '2026-09-16',
      weekNumber: 3,
      month: 9,
      year: 2026,
      badgeIds: ['bdg-1', 'bdg-2', 'bdg-3', 'bdg-4'],
      notes: 'Limpeza profunda com aspiração de tapetes.',
      createdAt: '2026-09-16T10:00:00.000Z',
    };
    const mockBadges: Badge[] = [
      { id: 'bdg-1', houseId: 'house-123', name: 'Aspirar Sala', isSystem: true, displayOrder: 1, createdAt: '' },
      { id: 'bdg-2', houseId: 'house-123', name: 'Limpar Vidros', isSystem: true, displayOrder: 2, createdAt: '' },
      { id: 'bdg-3', houseId: 'house-123', name: 'Organizar Quarto', isSystem: true, displayOrder: 3, createdAt: '' },
      { id: 'bdg-4', houseId: 'house-123', name: 'Higienizar Banheiro', isSystem: true, displayOrder: 4, createdAt: '' },
    ];

    const realCardView = buildCleaningCardView(mockRecord, mockBadges);
    assert(realCardView.badgeNames.length === 4, 'Cenário 7: card real deve ter 4 badges resolvidos', { realCardView });
    const realState = deriveCardExpandableState(realCardView);
    assert(realState.isExpandable === true, 'Cenário 7: card real deve ser expansível', { realState });
    assert(realState.overflowCount === 2, 'Cenário 7: card real deve ter overflowCount = 2', { realState });
    assert(realState.initialBadges[0] === 'Aspirar Sala' && realState.initialBadges[1] === 'Limpar Vidros',
      'Cenário 7: 2 primeiras tarefas devem ser Aspirar Sala e Limpar Vidros', { initial: realState.initialBadges });
    assert(realState.overflowBadges[0] === 'Organizar Quarto' && realState.overflowBadges[1] === 'Higienizar Banheiro',
      'Cenário 7: tarefas excedentes devem ser Organizar Quarto e Higienizar Banheiro', { overflow: realState.overflowBadges });

    return {
      passed: true,
      totalTested,
      message:
        `SUCESSO: Card Expansível com Micro-Animação (TSK-405 / SPEC-018) — ${totalTested} verificações aprovadas: ` +
        `card com até 2 badges não expansível (RN-07), card com 3+ badges expansível com gaveta animada, ` +
        `rótulos dinâmicos singular/plural (+ 1 tarefa vs + N tarefas), preservação de ordem e integração de domínio.`,
      details: {
        singleBadge: { isExpandable: singleState.isExpandable, overflow: singleState.overflowCount },
        twoBadges: { isExpandable: twoState.isExpandable, overflow: twoState.overflowCount },
        threeBadges: { isExpandable: threeState.isExpandable, label: threeState.expandLabel, collapse: threeState.collapseLabel },
        fourBadges: { isExpandable: fourState.isExpandable, label: fourState.expandLabel },
        fiveBadges: { isExpandable: fiveState.isExpandable, label: fiveState.expandLabel },
        realIntegration: { badges: realCardView.badgeNames, initial: realState.initialBadges, overflow: realState.overflowBadges },
      },
    };
  } catch (err) {
    return {
      passed: false,
      totalTested,
      message: `FALHA: ${err instanceof Error ? err.message : String(err)}`,
      details: {},
    };
  }
}
