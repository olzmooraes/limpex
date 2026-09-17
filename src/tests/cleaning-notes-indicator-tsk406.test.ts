import {
  hasValidNotes,
  getNotesDrawerId,
  deriveNotesIndicatorState,
  formatNotesPreview,
  NOTES_TOUCH_TARGET_MIN,
  NOTES_ARIA_LABEL_EXPAND,
  NOTES_ARIA_LABEL_COLLAPSE,
  NOTES_TOOLTIP_DEFAULT,
  NOTES_TOOLTIP_ACTIVE,
} from '../services/cleaningNotesIndicator';
import { buildCleaningCardView } from '../services/cleaningWeekView';
import { CLEANING_NOTES_MAX_LENGTH } from '../services/cleaningRegistration';
import { CleaningRecord, Badge } from '../types';

/**
 * Suíte de Teste de Domínio: Ícone Indicativo Visual de Observações/Ressalvas
 * (TSK-406 / SPEC-019 / RN-07 / Restrição Obrigatória nº 1)
 *
 * Cenários validados:
 *  - Cenário 1: Ausência de notas (undefined, null, string vazia) -> isVisible false.
 *  - Cenário 2: Notas compostas exclusivamente de espaços -> isVisible false.
 *  - Cenário 3: Observação válida em estado colapsado (isVisible true, isActive false, hasDot true, ariaLabel expand).
 *  - Cenário 4: Observação válida em estado expandido (isVisible true, isActive true, hasDot false, ariaLabel collapse).
 *  - Cenário 5: Card com até 2 tarefas (não expansível por badges) com observação independente.
 *  - Cenário 6: Observação no teto de 500 caracteres (CLEANING_NOTES_MAX_LENGTH) e formatNotesPreview.
 *  - Cenário 7: Integração com buildCleaningCardView (hasNotes e notas sanitizadas).
 *  - Cenário 8: Ergonomia Mobile-First (alvo de toque mínimo de 44x44px garantido).
 */
export async function runCleaningNotesIndicatorSimulationTest(): Promise<{
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
    const recordId = 'rec-test-101';

    // 1. Cenário 1: Ausência de notas (undefined, null, vazio)
    assert(hasValidNotes(undefined) === false, 'Cenário 1: undefined não deve ser nota válida');
    assert(hasValidNotes(null) === false, 'Cenário 1: null não deve ser nota válida');
    assert(hasValidNotes('') === false, 'Cenário 1: string vazia não deve ser nota válida');

    const stateUndefined = deriveNotesIndicatorState(recordId, undefined, false);
    assert(stateUndefined.isVisible === false, 'Cenário 1: estado undefined deve ter isVisible = false', { stateUndefined });
    assert(stateUndefined.sanitizedNotes === undefined, 'Cenário 1: sanitizedNotes deve ser undefined');
    assert(stateUndefined.hasDot === false, 'Cenário 1: hasDot deve ser false');

    const stateNull = deriveNotesIndicatorState(recordId, null, false);
    assert(stateNull.isVisible === false, 'Cenário 1: estado null deve ter isVisible = false');

    const stateEmpty = deriveNotesIndicatorState(recordId, '', false);
    assert(stateEmpty.isVisible === false, 'Cenário 1: estado vazio deve ter isVisible = false');

    // 2. Cenário 2: Notas compostas exclusivamente de espaços em branco
    assert(hasValidNotes('   ') === false, 'Cenário 2: apenas espaços não deve ser nota válida');
    assert(hasValidNotes('\t\n  \n') === false, 'Cenário 2: tabs e quebras não deve ser nota válida');

    const stateSpaces = deriveNotesIndicatorState(recordId, '   \t  ', false);
    assert(stateSpaces.isVisible === false, 'Cenário 2: indicador não deve ser visível para espaços', { stateSpaces });
    assert(stateSpaces.sanitizedNotes === undefined, 'Cenário 2: sanitizedNotes deve ser undefined para espaços');

    // 3. Cenário 3: Observação válida em estado colapsado padrão
    const rawNote = '  Cuidado com o cachorro no quintal durante a faxina.  ';
    const stateCollapsed = deriveNotesIndicatorState(recordId, rawNote, false);
    assert(stateCollapsed.isVisible === true, 'Cenário 3: observação válida deve ser visível', { stateCollapsed });
    assert(stateCollapsed.isActive === false, 'Cenário 3: isActive deve ser false quando colapsado');
    assert(stateCollapsed.hasDot === true, 'Cenário 3: hasDot deve ser true para chamar atenção quando colapsado');
    assert(stateCollapsed.sanitizedNotes === 'Cuidado com o cachorro no quintal durante a faxina.',
      'Cenário 3: texto deve ser sanitizado sem espaços nas extremidades', { note: stateCollapsed.sanitizedNotes });
    assert(stateCollapsed.notesDrawerId === `notes-drawer-${recordId}`,
      'Cenário 3: notesDrawerId deve ser semântico');
    assert(stateCollapsed.ariaLabel === NOTES_ARIA_LABEL_EXPAND,
      'Cenário 3: ariaLabel deve convidar à expansão', { ariaLabel: stateCollapsed.ariaLabel });
    assert(stateCollapsed.tooltip === NOTES_TOOLTIP_DEFAULT,
      'Cenário 3: tooltip padrão deve ser exibido', { tooltip: stateCollapsed.tooltip });

    // 4. Cenário 4: Observação válida em estado expandido
    const stateExpanded = deriveNotesIndicatorState(recordId, rawNote, true);
    assert(stateExpanded.isVisible === true, 'Cenário 4: observação deve ser visível em estado expandido');
    assert(stateExpanded.isActive === true, 'Cenário 4: isActive deve ser true quando expandido', { stateExpanded });
    assert(stateExpanded.hasDot === false, 'Cenário 4: hasDot deve ser false quando já expandido');
    assert(stateExpanded.ariaLabel === NOTES_ARIA_LABEL_COLLAPSE,
      'Cenário 4: ariaLabel deve convidar ao recolhimento', { ariaLabel: stateExpanded.ariaLabel });
    assert(stateExpanded.tooltip === NOTES_TOOLTIP_ACTIVE,
      'Cenário 4: tooltip de recolhimento deve ser exibido', { tooltip: stateExpanded.tooltip });

    // 5. Cenário 5: Card com até 2 tarefas e com observação independente
    const dummyBadges: Badge[] = [
      { id: 'b1', houseId: 'h1', name: 'Banheiro', isSystem: true, displayOrder: 1, createdAt: '2026-09-17' },
      { id: 'b2', houseId: 'h1', name: 'Cozinha', isSystem: true, displayOrder: 2, createdAt: '2026-09-17' },
    ];
    const recordTwoTasksWithNote: CleaningRecord = {
      id: 'rec-two-note',
      houseId: 'h1',
      userId: 'u1',
      registeredById: 'u1',
      userName: 'Mariana Silva',
      dayOfWeek: 'qua',
      cleaningDate: '2026-09-17',
      weekNumber: 3,
      month: 9,
      year: 2026,
      badgeIds: ['b1', 'b2'],
      notes: 'Usar pano azul para os vidros.',
      createdAt: '2026-09-17T10:00:00Z',
    };
    const cardTwoTasksView = buildCleaningCardView(recordTwoTasksWithNote, dummyBadges);
    assert(cardTwoTasksView.isExpandable === false, 'Cenário 5: card com 2 badges não deve ser expansível por tarefas');
    assert(cardTwoTasksView.hasNotes === true, 'Cenário 5: card com 2 badges deve registrar hasNotes = true');
    assert(cardTwoTasksView.notes === 'Usar pano azul para os vidros.', 'Cenário 5: texto de notas preservado');

    const indicatorTwoTasks = deriveNotesIndicatorState(cardTwoTasksView.recordId, cardTwoTasksView.notes, false);
    assert(indicatorTwoTasks.isVisible === true, 'Cenário 5: indicador de notas deve estar visível no card de 2 tarefas');
    assert(indicatorTwoTasks.hasDot === true, 'Cenário 5: ponto indicativo ativo para chamar atenção às notas');

    // 6. Cenário 6: Observação no teto de 500 caracteres e preview
    const longNote500 = 'A'.repeat(CLEANING_NOTES_MAX_LENGTH);
    assert(longNote500.length === 500, 'Cenário 6: observação tem exatamente 500 caracteres');
    const state500 = deriveNotesIndicatorState(recordId, longNote500, false);
    assert(state500.isVisible === true, 'Cenário 6: observação de 500 caracteres é visível');
    assert(state500.sanitizedNotes?.length === 500, 'Cenário 6: observação de 500 caracteres mantida integral');

    const previewShort = formatNotesPreview('Limpeza simples da cozinha', 40);
    assert(previewShort === 'Limpeza simples da cozinha', 'Cenário 6: preview curto não deve truncar');

    const previewTruncated = formatNotesPreview('Uma frase muito longa que certamente deve ultrapassar o limite configurado de caracteres', 30);
    assert(previewTruncated.endsWith('...'), 'Cenário 6: preview longo deve terminar com reticências', { previewTruncated });
    assert(previewTruncated.length <= 33, 'Cenário 6: tamanho do preview respeita o limite com margem das reticências');

    // 7. Cenário 7: Integração com buildCleaningCardView para casos de borda
    const recordNoNote: CleaningRecord = {
      ...recordTwoTasksWithNote,
      id: 'rec-no-note',
      notes: undefined,
    };
    const cardNoNoteView = buildCleaningCardView(recordNoNote, dummyBadges);
    assert(cardNoNoteView.hasNotes === false, 'Cenário 7: record sem nota gera hasNotes = false');
    assert(cardNoNoteView.notes === undefined, 'Cenário 7: record sem nota gera notes = undefined');

    const recordWhiteSpacesNote: CleaningRecord = {
      ...recordTwoTasksWithNote,
      id: 'rec-whitespace-note',
      notes: '     \n  ',
    };
    const cardWhiteSpacesView = buildCleaningCardView(recordWhiteSpacesNote, dummyBadges);
    assert(cardWhiteSpacesView.hasNotes === false, 'Cenário 7: record com nota vazia/espaços gera hasNotes = false');
    assert(cardWhiteSpacesView.notes === undefined, 'Cenário 7: record com nota vazia/espaços gera notes = undefined');

    // 8. Cenário 8: Ergonomia Mobile-First (Restrição Obrigatória nº 1)
    assert(NOTES_TOUCH_TARGET_MIN === 44, 'Cenário 8: alvo mínimo de toque é 44px conforme Restrição nº 1');
    assert(getNotesDrawerId('card-1') === 'notes-drawer-card-1', 'Cenário 8: id semântico de gaveta gerado');

    return {
      passed: true,
      totalTested,
      message: `SUCESSO: Ícone Indicativo de Observações (TSK-406 / SPEC-019) validado com ${totalTested} verificações cobrindo visibilidade condicional (RN-07), sanitização estrita, estados colapsado/expandido com badge dot, acessibilidade semântica (aria-label/controls/expanded), suporte a 500 caracteres e alvo de toque ≥ 44px (Restrição nº 1).`,
      details: {
        totalTested,
        touchTargetMin: NOTES_TOUCH_TARGET_MIN,
        collapsedState: stateCollapsed,
        expandedState: stateExpanded,
        twoTasksCardWithNote: {
          hasNotes: cardTwoTasksView.hasNotes,
          notes: cardTwoTasksView.notes,
        },
      },
    };
  } catch (error: any) {
    return {
      passed: false,
      totalTested,
      message: `FALHA no teste TSK-406: ${error?.message || String(error)}`,
      details: { error: String(error) },
    };
  }
}
