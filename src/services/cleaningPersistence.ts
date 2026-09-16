import { CleaningRecord, House, HouseMember, Badge } from '../types';

export type CleaningPersistenceErrorCode =
  | 'CLEANING_HOUSE_NOT_FOUND'
  | 'CLEANING_MEMBERSHIP_REQUIRED'
  | 'CLEANING_RESPONSIBLE_NOT_IN_HOUSE'
  | 'CLEANING_BADGE_NOT_IN_HOUSE';

export interface CleaningPersistenceCheck {
  valid: boolean;
  errorCode?: CleaningPersistenceErrorCode;
  errorMessage?: string;
}

export const CLEANING_PERSISTENCE_ERROR_MESSAGES: Record<CleaningPersistenceErrorCode, string> = {
  CLEANING_HOUSE_NOT_FOUND: 'Casa inexistente. Selecione uma casa válida para registrar a faxina.',
  CLEANING_MEMBERSHIP_REQUIRED:
    'CLEANING_MEMBERSHIP_REQUIRED: você precisa estar vinculado à casa para registrar faxinas (RN-20).',
  CLEANING_RESPONSIBLE_NOT_IN_HOUSE:
    'CLEANING_RESPONSIBLE_NOT_IN_HOUSE: o responsável selecionado não é membro da casa ativa (RN-19).',
  CLEANING_BADGE_NOT_IN_HOUSE:
    'CLEANING_BADGE_NOT_IN_HOUSE: um dos badges selecionados não pertence à casa ativa (RN-19).'
};

/**
 * TSK-403 / SPEC-016: Valida a persistência de um registro de faxina no nível de
 * domínio, espelhando as regras de negócio RN-19 (isolamento por casa) e RN-20
 * (qualquer membro vinculado pode registrar) e as políticas RLS da migração
 * 20260915000000_cleaning_persistence_rls.sql.
 *
 * Ordens de checagem (defensiva):
 * 1. Casa deve existir (CLEANING_HOUSE_NOT_FOUND).
 * 2. Solicitante (registeredById) deve ser membro da casa (CLEANING_MEMBERSHIP_REQUIRED).
 * 3. Responsável (userId) deve ser membro da casa (CLEANING_RESPONSIBLE_NOT_IN_HOUSE).
 * 4. Todos os badges devem pertencer à casa ativa (CLEANING_BADGE_NOT_IN_HOUSE).
 */
export function validateCleaningPersistence(
  record: CleaningRecord,
  house: House | null,
  members: HouseMember[],
  badges: Badge[]
): CleaningPersistenceCheck {
  const scopedMembers = members.filter((m) => m.houseId === record.houseId);
  const scopedBadgeIds = new Set(
    badges.filter((b) => b.houseId === record.houseId).map((b) => b.id)
  );

  if (!house || house.id !== record.houseId) {
    return {
      valid: false,
      errorCode: 'CLEANING_HOUSE_NOT_FOUND',
      errorMessage: CLEANING_PERSISTENCE_ERROR_MESSAGES.CLEANING_HOUSE_NOT_FOUND
    };
  }

  if (!scopedMembers.some((m) => m.userId === record.registeredById)) {
    return {
      valid: false,
      errorCode: 'CLEANING_MEMBERSHIP_REQUIRED',
      errorMessage: CLEANING_PERSISTENCE_ERROR_MESSAGES.CLEANING_MEMBERSHIP_REQUIRED
    };
  }

  if (!scopedMembers.some((m) => m.userId === record.userId)) {
    return {
      valid: false,
      errorCode: 'CLEANING_RESPONSIBLE_NOT_IN_HOUSE',
      errorMessage: CLEANING_PERSISTENCE_ERROR_MESSAGES.CLEANING_RESPONSIBLE_NOT_IN_HOUSE
    };
  }

  const foreignBadge = record.badgeIds.find((badgeId) => !scopedBadgeIds.has(badgeId));
  if (foreignBadge) {
    return {
      valid: false,
      errorCode: 'CLEANING_BADGE_NOT_IN_HOUSE',
      errorMessage: CLEANING_PERSISTENCE_ERROR_MESSAGES.CLEANING_BADGE_NOT_IN_HOUSE
    };
  }

  return { valid: true };
}