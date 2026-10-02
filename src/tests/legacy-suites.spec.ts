import { describe, it, expect } from 'vitest';
import { runBottomNavbarSimulationTest } from './bottom-navbar-tsk401.test';
import { runCardExpandableSimulationTest } from './card-expandable-tsk405.test';
import { runCleaningNotesIndicatorSimulationTest } from './cleaning-notes-indicator-tsk406.test';

/**
 * Ponte temporária (TSK-701): executa as simulações legadas de lógica pura do
 * cliente como testes Vitest. As que dependiam do mock em localStorage foram
 * removidas na TSK-703 (SPEC-022); as regras delas são cobertas pelos testes
 * pgTAP do banco e pelos testes de integração.
 */
type LegacySuite = () => Promise<{ passed: boolean; message: string; details?: Record<string, unknown> }>;

const suites: [string, LegacySuite][] = [
  ['Épico 4 · bottom navbar (TSK-401)', runBottomNavbarSimulationTest],
  ['Épico 4 · card expansível (TSK-405)', runCardExpandableSimulationTest],
  ['Épico 4 · indicador de observações (TSK-406)', runCleaningNotesIndicatorSimulationTest]
];

describe('Simulações legadas (lógica pura do cliente)', () => {
  it.each(suites)('%s', async (_name, run) => {
    const result = await run();
    expect(result.passed, `${result.message}\n${JSON.stringify(result.details ?? {}, null, 2)}`).toBe(true);
  });
});
