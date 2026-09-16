import { runHouseConstraintSimulationTest } from './houses-constraint.test';
import { runInviteCodeSimulationTest } from './invite-code.test';
import { runHousesPanelSimulationTest } from './houses-panel-tsk203.test';
import { runHouseSelectorSimulationTest } from './house-selector-tsk204.test';
import { runHouseDeletionSimulationTest } from './house-deletion-tsk205.test';

export interface Epic2GateResult {
  id: number;
  name: string;
  description: string;
  passed: boolean;
  message: string;
  totalTested: number;
  durationMs: number;
  details?: Record<string, any>;
}

export interface Epic2AuditReport {
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
  gates: Epic2GateResult[];
}

/**
 * Runner Consolidado da Suíte de Auditoria do Épico 2 (TSK-206 / SPEC-008)
 * Valida a Restrição Obrigatória nº 3 (1 casa por criador / RN-18) e nº 4
 * (hierarquia de permissões) através de 5 gates de domínio (mock):
 *  - GATE 1: Criação de casa + bloqueio inviolável da 2ª casa (HOUSE_LIMIT_REACHED),
 *    vínculo do criador como 'CREATOR' e seed dos 14 badges.
 *  - GATE 2: Código de convite de 6 caracteres, alfabeto amigável e unicidade (TSK-202).
 *  - GATE 3: Fluxos da aba Minhas Casas (criar / entrar via código / erros) (TSK-203).
 *  - GATE 4: Seletor de casa ativa e alternância multi-casa (TSK-204).
 *  - GATE 5: Exclusão de casa restrita ao proprietário com auditoria (TSK-205).
 */
export async function runEpic2Audit(
  onProgress?: (currentGate: number, gateName: string, totalGates: number) => void
): Promise<Epic2AuditReport> {
  const startTime = Date.now();
  const gates: Epic2GateResult[] = [];

  const tasks: { id: number; name: string; description: string; run: () => Promise<{ passed: boolean; totalTested: number; message: string; details: Record<string, any> }> }[] = [
    {
      id: 1,
      name: 'Restrição de 1 Casa por Criador',
      description: 'Cenários 1 e 2 da SPEC-008: criação de casa com CREATOR + 14 badges e bloqueio estrito da 2ª casa com HOUSE_LIMIT_REACHED.',
      run: runHouseConstraintSimulationTest
    },
    {
      id: 2,
      name: 'Geração do Código de Convite',
      description: 'Cenário 6: código com exatamente 6 caracteres, alfabeto amigável sem ambíguos e unicidade entre casas.',
      run: runInviteCodeSimulationTest
    },
    {
      id: 3,
      name: 'Fluxos da Aba de Casas',
      description: 'Cenários 1-3: criar casa, bloquear 2ª casa (HOUSE_LIMIT_REACHED), entrar via código (INVALID_INVITE_CODE / ALREADY_MEMBER).',
      run: runHousesPanelSimulationTest
    },
    {
      id: 4,
      name: 'Seletor de Casa Ativa Multi-Casa',
      description: 'RN-19: alternância entre múltiplas casas como membro com persistência da escolha e isolamento de vínculo.',
      run: runHouseSelectorSimulationTest
    },
    {
      id: 5,
      name: 'Exclusão Restrita ao Proprietário',
      description: 'Cenário 8: rejeição por membro/terceiro (NOT_HOUSE_OWNER), cadeia de auditoria e liberação do UNIQUE(creator_id).',
      run: runHouseDeletionSimulationTest
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
    epic: 'EPIC-2: Gestão de Casas, Membros e Permissões',
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