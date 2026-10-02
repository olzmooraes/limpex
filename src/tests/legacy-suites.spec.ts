import { describe, it, expect, beforeEach } from 'vitest';
import { runHouseConstraintSimulationTest } from './houses-constraint.test';
import { runInviteCodeSimulationTest } from './invite-code.test';
import { runHousesPanelSimulationTest } from './houses-panel-tsk203.test';
import { runHouseSelectorSimulationTest } from './house-selector-tsk204.test';
import { runHouseDeletionSimulationTest } from './house-deletion-tsk205.test';
import { runBadgesSeedSimulationTest } from './badges-seed-tsk301.test';
import { runBadgesScreenSimulationTest } from './badges-screen-tsk302.test';
import { runBadgesCreateSimulationTest } from './badges-create-tsk303.test';
import { runBadgesEditSimulationTest } from './badges-edit-tsk304.test';
import { runBadgesDeleteSimulationTest } from './badges-delete-tsk305.test';
import { runBottomNavbarSimulationTest } from './bottom-navbar-tsk401.test';
import { runCleaningPersistenceSimulationTest } from './cleaning-persistence-tsk403.test';
import { runHomeWeekSimulationTest } from './home-week-tsk404.test';
import { runCardExpandableSimulationTest } from './card-expandable-tsk405.test';
import { runCleaningNotesIndicatorSimulationTest } from './cleaning-notes-indicator-tsk406.test';

/**
 * Ponte temporária (TSK-701): executa as simulações legadas — escritas para o
 * antigo painel de auditoria in-app — como testes Vitest, para servirem de rede
 * de regressão até serem substituídas por suítes .spec.ts nativas.
 * Elas exercitam o mock em localStorage e deixam de valer quando o mock for
 * removido na migração para o Supabase real.
 */
type LegacySuite = () => Promise<{ passed: boolean; message: string; details?: Record<string, unknown> }>;

const suites: [string, LegacySuite][] = [
  ['Épico 2 · 1 casa por criador', runHouseConstraintSimulationTest],
  ['Épico 2 · código de convite', runInviteCodeSimulationTest],
  ['Épico 2 · aba de casas (TSK-203)', runHousesPanelSimulationTest],
  ['Épico 2 · seletor de casa ativa (TSK-204)', runHouseSelectorSimulationTest],
  ['Épico 2 · exclusão de casa (TSK-205)', runHouseDeletionSimulationTest],
  ['Épico 3 · seed de badges (TSK-301)', runBadgesSeedSimulationTest],
  ['Épico 3 · tela de badges (TSK-302)', runBadgesScreenSimulationTest],
  ['Épico 3 · criação de badges (TSK-303)', runBadgesCreateSimulationTest],
  ['Épico 3 · edição de badges (TSK-304)', runBadgesEditSimulationTest],
  ['Épico 3 · exclusão de badges (TSK-305)', runBadgesDeleteSimulationTest],
  ['Épico 4 · bottom navbar (TSK-401)', runBottomNavbarSimulationTest],
  ['Épico 4 · persistência de faxina (TSK-403)', runCleaningPersistenceSimulationTest],
  ['Épico 4 · semana vigente (TSK-404)', runHomeWeekSimulationTest],
  ['Épico 4 · card expansível (TSK-405)', runCardExpandableSimulationTest],
  ['Épico 4 · indicador de observações (TSK-406)', runCleaningNotesIndicatorSimulationTest]
];

describe('Simulações legadas (mock localStorage)', () => {
  beforeEach(() => localStorage.clear());

  it.each(suites)('%s', async (_name, run) => {
    const result = await run();
    expect(result.passed, `${result.message}\n${JSON.stringify(result.details ?? {}, null, 2)}`).toBe(true);
  });
});
