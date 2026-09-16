import { Badge } from '../types';
import { MAX_TOTAL_BADGES, MAX_CUSTOM_BADGES, SYSTEM_BADGE_COUNT } from './badgeDefinitions';

export const BADGE_NAME_MAX_LENGTH = 40;
export const BADGE_NAME_MIN_LENGTH = 1;

export type BadgeCreationErrorCode =
  | 'BADGE_NAME_EMPTY'
  | 'BADGE_NAME_TOO_LONG'
  | 'BADGE_NAME_DUPLICATE'
  | 'BADGE_LIMIT_REACHED'
  | 'BADGE_CUSTOM_LIMIT_REACHED';

export interface BadgeCreationValidation {
  valid: boolean;
  errorCode?: BadgeCreationErrorCode;
  errorMessage?: string;
}

/**
 * Valida o nome de um novo badge customizado (TSK-303 / SPEC-011 / RN-11 / RN-12).
 *
 * Regras:
 * 1. Nome não pode ser vazio (após trim).
 * 2. Nome não pode exceder 40 caracteres.
 * 3. Nome não pode duplicar nenhum badge existente na casa (sistema ou customizado).
 * 4. Total de badges da casa não pode exceder 34 (RN-12 / Restrição nº 3).
 * 5. Total de badges customizados não pode exceder 20 (RN-11).
 */
export function validateBadgeName(
  name: string,
  existingBadges: Badge[]
): BadgeCreationValidation {
  const trimmed = name.trim();

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
    (b) => b.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (duplicate) {
    return {
      valid: false,
      errorCode: 'BADGE_NAME_DUPLICATE',
      errorMessage: 'Já existe um badge com este nome na casa.'
    };
  }

  const total = existingBadges.length;
  if (total >= MAX_TOTAL_BADGES) {
    return {
      valid: false,
      errorCode: 'BADGE_LIMIT_REACHED',
      errorMessage: `Teto de ${MAX_TOTAL_BADGES} badges por casa atingido (14 do sistema + ${MAX_CUSTOM_BADGES} customizados).`
    };
  }

  const customCount = existingBadges.filter((b) => !b.isSystem).length;
  if (customCount >= MAX_CUSTOM_BADGES) {
    return {
      valid: false,
      errorCode: 'BADGE_CUSTOM_LIMIT_REACHED',
      errorMessage: `Limite de ${MAX_CUSTOM_BADGES} badges customizados atingido.`
    };
  }

  return { valid: true };
}

/**
 * Calcula o displayOrder para o próximo badge customizado.
 * Os badges do sistema ocupam 1..14; customizados começam em SYSTEM_BADGE_COUNT + 1.
 */
export function nextCustomDisplayOrder(existingBadges: Badge[]): number {
  const maxOrder = existingBadges.reduce(
    (max, b) => Math.max(max, b.displayOrder ?? 0),
    0
  );
  return Math.max(maxOrder + 1, SYSTEM_BADGE_COUNT + 1);
}
