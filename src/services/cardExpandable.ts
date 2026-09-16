import type { CleaningCardView } from './cleaningWeekView';
import { TWO_TASKS_LIMIT } from './cleaningWeekView';

/**
 * TSK-405 / SPEC-018: Camada de domínio para cálculo da expansão e rótulos do card.
 */
export interface CardExpandableState {
  isExpandable: boolean;
  overflowCount: number;
  initialBadges: string[];
  overflowBadges: string[];
  expandLabel: string;
  collapseLabel: string;
}

/**
 * Deriva os dados estruturados de expansão a partir de um CleaningCardView:
 * - initialBadges: até 2 tarefas iniciais visíveis (RN-07)
 * - overflowBadges: tarefas a partir da 3ª que ficam na gaveta animada
 * - expandLabel: rótulo dinâmico (+ N tarefa(s) executada(s))
 * - collapseLabel: rótulo de recolhimento ("Recolher tarefas")
 */
export function deriveCardExpandableState(card: CleaningCardView): CardExpandableState {
  const initialBadges = card.badgeNames.slice(0, TWO_TASKS_LIMIT);
  const overflowBadges = card.badgeNames.slice(TWO_TASKS_LIMIT);
  const overflowCount = overflowBadges.length;
  const isExpandable = overflowCount > 0;

  return {
    isExpandable,
    overflowCount,
    initialBadges,
    overflowBadges,
    expandLabel: `+ ${overflowCount} ${overflowCount === 1 ? 'tarefa executada' : 'tarefas executadas'}`,
    collapseLabel: 'Recolher tarefas',
  };
}
