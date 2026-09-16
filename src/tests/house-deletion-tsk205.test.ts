import { dbService } from '../services/supabase';
import { House, ExclusionLog } from '../types';

/**
 * Teste Automatizado de Domínio: Exclusão de Casa Restrita ao Proprietário (TSK-205)
 * Valida o Cenário 8 da SPEC-008 e a Restrição Obrigatória nº 4 (RN-21):
 * - Membro comum tenta excluir a casa → rejeitado com NOT_HOUSE_OWNER, nada é removido.
 * - Terceiro sem vínculo tenta excluir → rejeitado com NOT_HOUSE_OWNER.
 * - Casa inexistente → erro HOUSE_NOT_FOUND.
 * - Proprietário exclui a casa → sucesso em cascata (members + badges removidos) e
 *   log imutável gravado em exclusion_logs (Restrição Obrigatória nº 5).
 * - Após a exclusão, o UNIQUE(creator_id) é liberado e o usuário pode criar nova casa.
 */
export async function runHouseDeletionSimulationTest(): Promise<{
  passed: boolean;
  totalTested: number;
  message: string;
  details: Record<string, any>;
}> {
  const CREATOR = 'usr-tsk205-creator';
  const MEMBER = 'usr-tsk205-member';
  const STRANGER = 'usr-tsk205-stranger';
  const LOCAL_STORAGE_KEY_HOUSES = 'limpex_mock_houses';
  const LOCAL_STORAGE_KEY_HOUSE_MEMBERS = 'limpex_mock_house_members';
  const LOCAL_STORAGE_KEY_BADGES = 'limpex_mock_badges';
  const LOCAL_STORAGE_KEY_LOGS = 'limpex_mock_exclusion_logs';

  const state = {
    houses: (): House[] => JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_HOUSES) || '[]'),
    members: (): any[] => JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_HOUSE_MEMBERS) || '[]'),
    badges: (): any[] => JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_BADGES) || '[]'),
    logs: (): ExclusionLog[] => JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_LOGS) || '[]')
  };

  // 1. Ambiente isolado de teste
  localStorage.setItem(LOCAL_STORAGE_KEY_HOUSES, JSON.stringify([]));
  localStorage.setItem(LOCAL_STORAGE_KEY_HOUSE_MEMBERS, JSON.stringify([]));
  localStorage.setItem(LOCAL_STORAGE_KEY_BADGES, JSON.stringify([]));
  localStorage.setItem(LOCAL_STORAGE_KEY_LOGS, JSON.stringify([]));

  // 2. Criador cria a casa alvo + membro B entra via código de convite
  const createRes = await dbService.createHouse('Ap 402 - Família', CREATOR, 'Criador TSK205', 'criador@teste.com');
  if (!createRes.success || !createRes.house) {
    return { passed: false, totalTested: 1, message: `Falha ao criar a casa alvo: ${createRes.error}`, details: { createRes } };
  }
  const houseA = createRes.house;

  const joinRes = await dbService.joinHouseByInviteCode(houseA.inviteCode, MEMBER, 'Membro TSK205', 'membro@teste.com');
  if (!joinRes.success) {
    return { passed: false, totalTested: 2, message: `Falha ao vincular membro B: ${joinRes.error}`, details: { joinRes } };
  }

  const badgesBefore = state.badges().filter(b => b.houseId === houseA.id).length;
  if (badgesBefore !== 14) {
    return { passed: false, totalTested: 3, message: `A casa alvo deveria ter 14 badges (tem ${badgesBefore})`, details: { badgesBefore } };
  }

  // 3. Membro (não proprietário) tenta excluir a casa → NOT_HOUSE_OWNER, nada é removido
  const memberDelete = await dbService.deleteHouseWithLog(houseA.id, MEMBER, 'Membro TSK205');
  if (memberDelete.success) {
    return { passed: false, totalTested: 4, message: 'VIOLAÇÃO: membro excluiu a casa com sucesso', details: { memberDelete } };
  }
  if (memberDelete.errorCode !== 'NOT_HOUSE_OWNER') {
    return { passed: false, totalTested: 4, message: `Código inesperado na exclusão por membro: ${memberDelete.errorCode}`, details: { memberDelete } };
  }
  if (!state.houses().some(h => h.id === houseA.id)) {
    return { passed: false, totalTested: 4, message: 'VIOLAÇÃO: a casa foi removida após tentativa do membro', details: {} };
  }
  if (state.members().filter(m => m.houseId === houseA.id).length !== 2 || state.badges().filter(b => b.houseId === houseA.id).length !== 14) {
    return { passed: false, totalTested: 4, message: 'VIOLAÇÃO: vínculos/badges foram alterados após tentativa do membro', details: {} };
  }

  // 4. Terceiro sem vínculo tenta excluir → NOT_HOUSE_OWNER
  const strangerDelete = await dbService.deleteHouseWithLog(houseA.id, STRANGER, 'Estranho TSK205');
  if (strangerDelete.success || strangerDelete.errorCode !== 'NOT_HOUSE_OWNER') {
    return { passed: false, totalTested: 5, message: 'Terceiro sem vínculo deveria ser rejeitado com NOT_HOUSE_OWNER', details: { strangerDelete } };
  }

  // 5. Casa inexistente → HOUSE_NOT_FOUND
  const missingDelete = await dbService.deleteHouseWithLog('hse-inexistente', CREATOR, 'Criador TSK205');
  if (missingDelete.success || missingDelete.errorCode !== 'HOUSE_NOT_FOUND') {
    return { passed: false, totalTested: 6, message: 'Casa inexistente deveria retornar HOUSE_NOT_FOUND', details: { missingDelete } };
  }

  // 6. Proprietário exclui a casa → sucesso em cascata + log imutável
  const ownerDelete = await dbService.deleteHouseWithLog(houseA.id, CREATOR, 'Criador TSK205');
  if (!ownerDelete.success) {
    return { passed: false, totalTested: 7, message: `O proprietário deveria excluir a casa: ${ownerDelete.error}`, details: { ownerDelete } };
  }
  if (state.houses().some(h => h.id === houseA.id)) {
    return { passed: false, totalTested: 7, message: 'A casa ainda consta no repositório após exclusão do proprietário', details: {} };
  }
  if (state.members().some(m => m.houseId === houseA.id)) {
    return { passed: false, totalTested: 7, message: 'Vínculos da casa não foram removidos em cascata', details: {} };
  }
  if (state.badges().some(b => b.houseId === houseA.id)) {
    return { passed: false, totalTested: 7, message: 'Badges da casa não foram removidos em cascata', details: {} };
  }

  const audit = state.logs().find(l => l.entityType === 'HOUSE' && l.entityId === houseA.id);
  if (!audit) {
    return { passed: false, totalTested: 7, message: 'VIOLAÇÃO: log de auditoria de exclusão da casa não foi gravado', details: { logs: state.logs() } };
  }
  if (audit.userId !== CREATOR || audit.entityName !== houseA.name) {
    return { passed: false, totalTested: 7, message: 'Log de auditoria da casa com autor/valor incorreto', details: { audit } };
  }
  const meta = (audit.metadata ?? {}) as any;
  if (meta.affectedMemberCount !== 2 || meta.affectedBadgeCount !== 14) {
    return { passed: false, totalTested: 7, message: `Log de auditoria sem as quantidades de vínculos/badges afetados (${JSON.stringify(meta)})`, details: { audit } };
  }

  // 7. UNIQUE(creator_id) liberado: criador pode criar nova casa após a exclusão
  const recreate = await dbService.createHouse('Casa Nova Pós-Exclusão', CREATOR, 'Criador TSK205', 'criador@teste.com');
  if (!recreate.success || !recreate.house) {
    return { passed: false, totalTested: 8, message: `Após excluir a casa, o criador deveria poder criar outra: ${recreate.error}`, details: { recreate } };
  }

  return {
    passed: true,
    totalTested: 8,
    message: 'SUCESSO: Exclusão de casa restrita ao proprietário validada — membro/terceiro rejeitados (NOT_HOUSE_OWNER), casa inexistente (HOUSE_NOT_FOUND), exclusão do proprietário em cascata com log imutável de auditoria.',
    details: {
      casaExcluida: houseA.name,
      membrosAfetados: meta.affectedMemberCount,
      badgesAfetados: meta.affectedBadgeCount,
      erroMembro: memberDelete.errorCode,
      erroTerceiro: strangerDelete.errorCode,
      erroCasaInexistente: missingDelete.errorCode,
      casaRecriada: recreate.house.name
    }
  };
}