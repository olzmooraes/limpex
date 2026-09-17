import { runBottomNavbarSimulationTest } from './bottom-navbar-tsk401.test';
import { runCleaningRegistrationSimulationTest } from './cleaning-registration-tsk402.test';
import { runCleaningPersistenceSimulationTest } from './cleaning-persistence-tsk403.test';
import { runHomeWeekSimulationTest } from './home-week-tsk404.test';
import { runCardExpandableSimulationTest } from './card-expandable-tsk405.test';
import { runCleaningNotesIndicatorSimulationTest } from './cleaning-notes-indicator-tsk406.test';

export interface Epic4GateResult {
  id: number;
  name: string;
  description: string;
  passed: boolean;
  message: string;
  totalTested: number;
  durationMs: number;
  details?: Record<string, any>;
}

export interface Epic4AuditReport {
  timestamp: string;
  epic: string;
  allPassed: boolean;
  totalGates: number;
  passedGates: number;
  failedGates: number;
  totalTested: number;
  passedTests: number;
  failedTests: number;
  totalDurationMs: number;
  gates: Epic4GateResult[];
}

/**
 * Runner Consolidado da Suíte de Auditoria do Épico 4 (TSK-401 a TSK-407)
 * - GATE 1: Bottom Navigation Bar de 5 posições com botão central "+ Faxina"
 *   elevado (Restrição Obrigatória nº 1 / RN-06 / RN-19).
 * - GATE 2: Tela/Registro de Faxina (TSK-402 / SPEC-015) — responsável
 *   pré-selecionado, dia atual, badges multi-seleção, notas e payload (RN-09/RN-19/RN-20).
 * - GATE 3: Backend e persistência de registros de faxina (TSK-403 / SPEC-016) —
 *   cleaning_records + cleaning_badges com isolamento por casa (RN-19) e permissão
 *   de membro (RN-20), filtros por semana, cascatas de exclusão e idempotência.
 * - GATE 4: Tela Principal da Semana Vigente (TSK-404 / SPEC-017) — cards reais de
 *   faxinas da semana corrente com contexto determinístico (RN-08), isolamento por
 *   casa (RN-19), responsável/iniciais/dia/chips de badges (RN-07), expansão funcional
 *   e contador.
 * - GATE 5: Micro-Animação do Card Expansível (TSK-405 / SPEC-018) — gaveta CSS Grid
 *   suave (0fr ➔ 1fr), rotação do chevron de 180°, rótulos dinâmicos e preferência
 *   de movimento reduzido (RN-07 / Restrição nº 1).
 * - GATE 6: Ícone Indicativo Visual de Observações/Ressalvas (TSK-406 / SPEC-019) —
 *   exibição condicional de ícone no cabeçalho quando há notas (RN-07), sanitização estrita,
 *   estados colapsado com badge dot e expandido com gaveta de notas, acessibilidade semântica
 *   (aria-label/controls/expanded), suporte a textos de até 500 caracteres (CLEANING_NOTES_MAX_LENGTH)
 *   e alvo de toque ergonômico ≥ 44x44px (Restrição nº 1).
 * O último gate será adicionado conforme TSK-407 for concluída.
 */
export async function runEpic4Audit(
  onProgress?: (currentGate: number, gateName: string, totalGates: number) => void
): Promise<Epic4AuditReport> {
  const startTime = Date.now();
  const gates: Epic4GateResult[] = [];

  const tasks: { id: number; name: string; description: string; run: () => Promise<{ passed: boolean; totalTested: number; message: string; details: Record<string, any> }> }[] = [
    {
      id: 1,
      name: 'Bottom Navbar de 5 Posições (TSK-401)',
      description: 'SPEC-014: exatamente 5 posições na ordem Início · Badges · + Faxina (Central) · Casas · Histórico, botão central "+ Faxina" elevado no centro, IDs únicos, labels/aria descritivos, alvo de toque ≥ 44px (Restrição nº 1) e estabilidade de navegação (RN-06/RN-19).',
      run: runBottomNavbarSimulationTest
    },
    {
      id: 2,
      name: 'Registro de Faxina (TSK-402)',
      description: 'SPEC-015: responsável pré-selecionado com o usuário autenticado e alterável entre membros da casa (RN-09), dia da semana pré-selecionado com o dia atual, seleção múltipla de badges da casa ativa com isolação RN-19, observações opcionais (máx 500), payload CleaningRecord coerente e validações CLEANING_MIN_BADGES / CLEANING_RESPONSIBLE_REQUIRED / CLEANING_DAY_REQUIRED / CLEANING_BADGE_NOT_IN_HOUSE / CLEANING_NOTES_TOO_LONG (RN-20).',
      run: runCleaningRegistrationSimulationTest
    },
    {
      id: 3,
      name: 'Persistência de Registros de Faxina (TSK-403)',
      description: 'SPEC-016: persistência em cleaning_records + cleaning_badges com fidelidade de campos (dia/data/semana 1..4/mês/ano/notas/createdAt), consulta isolada por casa e filtros por semana/responsável (RN-19), permissão de registro apenas para membros vinculados (RN-20 / Restrição nº 4) com rejeições CLEANING_HOUSE_NOT_FOUND / CLEANING_MEMBERSHIP_REQUIRED / CLEANING_RESPONSIBLE_NOT_IN_HOUSE / CLEANING_BADGE_NOT_IN_HOUSE sem persistência parcial, cascatas de exclusão de badge/casa com auditoria preservada (Restrição nº 5) e idempotência de escrita.',
      run: runCleaningPersistenceSimulationTest
    },
    {
      id: 4,
      name: 'Tela Principal — Semana Vigente (TSK-404)',
      description: 'SPEC-017: cards reais de faxinas da semana corrente com contexto determinístico da data atual (Semana X de Mês de Ano — RN-08/RN-24), consulta estritamente isolada por casa e semana (RN-19), cards com responsável/avatar de iniciais/dia da semana/chips de badges/observações (RN-07), expansão funcional acima de 2 tarefas (base TSK-405), indicador de notas (base TSK-406), contador dinâmico e tratamento de referências órfãs de badges removidos.',
      run: runHomeWeekSimulationTest
    },
    {
      id: 5,
      name: 'Micro-Animação do Card Expansível (TSK-405)',
      description: 'SPEC-018: expansão suave de cards com mais de 2 tarefas com gaveta CSS Grid (0fr ➔ 1fr), rotação animada do chevron de 180° em 250ms, preservação estrita da ordem dos badges, rótulos dinâmicos singular/plural (+ 1 tarefa vs + N tarefas) e respeito a prefers-reduced-motion (RN-07 / Restrição nº 1).',
      run: runCardExpandableSimulationTest
    },
    {
      id: 6,
      name: 'Ícone Indicativo Visual de Observações (TSK-406)',
      description: 'SPEC-019: exibição condicional de ícone FileText no cabeçalho do card quando há notas (RN-07), sanitização estrita, estados colapsado com badge dot e expandido com gaveta de notas, acessibilidade semântica (aria-label/controls/expanded), suporte a textos de até 500 caracteres (CLEANING_NOTES_MAX_LENGTH) e alvo de toque ergonômico ≥ 44x44px (Restrição nº 1).',
      run: runCleaningNotesIndicatorSimulationTest
    }
  ];

  for (const task of tasks) {
    onProgress?.(task.id, task.name, tasks.length);
    const gateStart = Date.now();
    try {
      const res = await task.run();
      gates.push({
        id: task.id,
        name: task.name,
        description: task.description,
        passed: res.passed,
        message: res.message,
        totalTested: res.totalTested,
        durationMs: Date.now() - gateStart,
        details: res.details
      });
    } catch (err) {
      gates.push({
        id: task.id,
        name: task.name,
        description: task.description,
        passed: false,
        message: `Falha ao executar o gate: ${err instanceof Error ? err.message : String(err)}`,
        totalTested: 0,
        durationMs: Date.now() - gateStart
      });
    }
  }

  const passedGates = gates.filter((g) => g.passed).length;
  const failedGates = gates.length - passedGates;
  const totalTested = gates.reduce((acc, g) => acc + g.totalTested, 0);
  const passedTests = gates.reduce((acc, g) => acc + (g.passed ? g.totalTested : 0), 0);
  const failedTests = totalTested - passedTests;

  return {
    timestamp: new Date().toISOString(),
    epic: 'EPIC-4: Registro de Faxina e Tela Principal Semanal',
    allPassed: failedGates === 0,
    totalGates: gates.length,
    passedGates,
    failedGates,
    totalTested,
    passedTests,
    failedTests,
    totalDurationMs: Date.now() - startTime,
    gates
  };
}