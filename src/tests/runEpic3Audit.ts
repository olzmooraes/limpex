import { runBadgesSeedSimulationTest } from './badges-seed-tsk301.test';
import { runBadgesScreenSimulationTest } from './badges-screen-tsk302.test';
import { runBadgesCreateSimulationTest } from './badges-create-tsk303.test';
import { runBadgesEditSimulationTest } from './badges-edit-tsk304.test';
import { runBadgesDeleteSimulationTest } from './badges-delete-tsk305.test';

export interface Epic3GateResult {
  id: number;
  name: string;
  description: string;
  passed: boolean;
  message: string;
  totalTested: number;
  durationMs: number;
  details?: Record<string, any>;
}

export interface Epic3AuditReport {
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
  gates: Epic3GateResult[];
}

/**
 * Runner Consolidado da Suíte de Auditoria do Épico 3 (TSK-301 / SPEC-009)
 * Valida a Restrição Obrigatória nº 3 (teto de 34 badges / RN-10 a RN-12) na
 * camada de seed:
*  - GATE 1: Seed dos 14 badges de sistema na criação de cada casa (RN-10),
 *    `isSystem = true`, `displayOrder` 1..14 na ordem fixa, unicidade
 *    `UNIQUE(house_id, name)` e isolamento completo entre casas.
 *  - GATE 2: Tela de Gestão de Badges (TSK-302 / SPEC-010) — agrupamento
 *    Sistema/Customizados com contadores em tempo real, RBAC por criador (RN-21),
 *    trava visual no teto de 34 (RN-12) e recarga da casa ativa (RN-19).
 *  - GATE 3: Criação de badges customizados (TSK-303 / SPEC-011) — validação de
 *    nome, trava de 20 customizados (RN-11) e de 34 totais (RN-12 / Restrição nº 3).
 *  - GATE 4: Edição de badges (TSK-304 / SPEC-012) — renomeação restrita ao
 *    criador (RN-13 / RN-21) preservando isSystem/displayOrder.
 *  - GATE 5: Exclusão de badges (TSK-305 / SPEC-013) — exclusão restrita ao
 *    criador (RN-14 / RN-21) com log obrigatório de auditoria (RN-15 / Restrição nº 5)
 *    e isolação entre casas (RN-19).
 */
export async function runEpic3Audit(
  onProgress?: (currentGate: number, gateName: string, totalGates: number) => void
): Promise<Epic3AuditReport> {
  const startTime = Date.now();
  const gates: Epic3GateResult[] = [];

  const tasks: { id: number; name: string; description: string; run: () => Promise<{ passed: boolean; totalTested: number; message: string; details: Record<string, any> }> }[] = [
    {
      id: 1,
      name: 'Seed dos 14 Badges de Sistema',
      description: 'RN-10: criação da casa seeda exatamente 14 badges (isSystem=true) com displayOrder 1..14 na ordem fixa, unicidade UNIQUE(house_id,name) e isolamento entre casas.',
      run: runBadgesSeedSimulationTest
    },
    {
      id: 2,
      name: 'Tela de Gestão de Badges (TSK-302)',
      description: 'SPEC-010: agrupamento Sistema (RN-10) e Customizados (RN-11) com contadores em tempo real, RBAC por criador (RN-21), trava visual no teto de 34 (RN-12) e recarga da casa ativa (RN-19).',
      run: runBadgesScreenSimulationTest
    },
    {
      id: 3,
      name: 'Criação de Badges Customizados (TSK-303)',
      description: 'SPEC-011: validação de nome (vazio, duplicado case-insensitive, limite de 40 chars), criação via dbService com displayOrder coerente, contadores atualizados em tempo real, trava de 20 customizados (RN-11) e trava de 34 badges totais (RN-12 / Restrição nº 3).',
      run: runBadgesCreateSimulationTest
    },
    {
      id: 4,
      name: 'Edição de Badges (TSK-304)',
      description: 'SPEC-012: renomeação de badge customizado e do sistema com preservação de isSystem/displayOrder (RN-13), no-op aceito, rejeição de nome vazio/duplicado case-insensitive/40+ chars e bloco de edição por membro (BADGE_EDIT_FORBIDDEN) e badge inexistente (BADGE_NOT_FOUND).',
      run: runBadgesEditSimulationTest
    },
    {
      id: 5,
      name: 'Exclusão de Badges (TSK-305)',
      description: 'SPEC-013: exclusão de badge customizado e do sistema restrita ao criador (RN-14 / RN-21), log obrigatório de auditoria com fidelidade (RN-15 / Restrição nº 5), rejeição por membro (BADGE_DELETE_FORBIDDEN), badge inexistente (BADGE_NOT_FOUND), isolação entre casas (RN-19) e liberação de vaga no teto de 34 (RN-11/RN-12).',
      run: runBadgesDeleteSimulationTest
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

  const passedGates = gates.filter(g => g.passed).length;
  const failedGates = gates.length - passedGates;
  const totalTested = gates.reduce((acc, g) => acc + g.totalTested, 0);
  const passedTests = gates.reduce((acc, g) => acc + (g.passed ? g.totalTested : 0), 0);
  const failedTests = totalTested - passedTests;

  return {
    timestamp: new Date().toISOString(),
    epic: 'EPIC-3: Gestão de Badges de Tarefas e Limitações',
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