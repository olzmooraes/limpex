import { Badge } from '../types';
import { BADGE_NAME_MAX_LENGTH } from './badgeCreation';

export type BadgeEditErrorCode =
  | 'BADGE_NAME_EMPTY'
  | 'BADGE_NAME_TOO_LONG'
  | 'BADGE_NAME_DUPLICATE';

export interface BadgeEditValidation {
  valid: boolean;
  errorCode?: BadgeEditErrorCode;
  errorMessage?: string;
}

/**
 * Valida o novo nome de um badge durante edição (TSK-304 / SPEC-012 / RN-13).
 *
 * Regras:
 * 1. Nome não pode ser vazio (após trim).
 * 2. Nome não pode exceder 40 caracteres.
 * 3. Nome não pode duplicar outro badge da casa (case-insensitive),
 *    mas permite manter o mesmo nome do badge sendo editado.
 *
 * Nota: como a edição não cria nem remove badges, as travas de teto
 * (RN-11: 20 customizados, RN-12: 34 totais) não se aplicam aqui.
 */
export function validateBadgeEditName(
  newName: string,
  badgeToEditId: string,
  existingBadges: Badge[]
): BadgeEditValidation {
  const trimmed = newName.trim();

  if (!trimmed) {
    return {
      valid: false,
      errorCode: 'BADGE_NAME_EMPTY',
      errorMessage: 'O nome do badge não pode ser vazio.'
    };
  }

  if (trimmed.length > BADGE_NAME_MAX_LENGTH) {
    return {
      valid: false,
      errorCode: 'BADGE_NAME_TOO_LONG',
      errorMessage: `O nome do badge não pode exceder ${BADGE_NAME_MAX_LENGTH} caracteres.`
    };
  }

  const duplicate = existingBadges.some(
    (b) => b.id !== badgeToEditId && b.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (duplicate) {
    return {
      valid: false,
      errorCode: 'BADGE_NAME_DUPLICATE',
      errorMessage: 'Já existe outro badge com este nome na casa.'
    };
  }

  return { valid: true };
}
