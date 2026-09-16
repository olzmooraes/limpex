import { Badge } from '../types';

export type BadgeDeleteErrorCode = 'BADGE_NOT_FOUND' | 'BADGE_DELETE_FORBIDDEN';

export interface BadgeDeleteCheck {
  valid: boolean;
  errorCode?: BadgeDeleteErrorCode;
  errorMessage?: string;
}

/**
 * Valida a exclusão de um badge (TSK-305 / SPEC-013 / RN-14 / RN-21 / RN-19).
 *
 * Regras:
 * 1. O badge deve existir na casa ativa (BADGE_NOT_FOUND) — isolamento RN-19.
 * 2. O solicitante deve ser o criador da casa (BADGE_DELETE_FORBIDDEN) — RN-21.
 *
 * Nota: a exclusão não cria badges; as travas de teto (RN-11 / RN-12) são
 * apenas liberadas (remover um badge abre uma vaga).
 */
export function validateBadgeDelete(
  houseId: string,
  badgeId: string,
  houseBadges: Badge[],
  houseCreatorId: string | undefined,
  requesterId: string
): BadgeDeleteCheck {
  const scopedBadges = houseBadges.filter((b) => b.houseId === houseId);
  const badge = scopedBadges.find((b) => b.id === badgeId);
  if (!badge) {
    return {
      valid: false,
      errorCode: 'BADGE_NOT_FOUND',
      errorMessage: 'Badge não encontrado na casa.'
    };
  }

  if (houseCreatorId !== requesterId) {
    return {
      valid: false,
      errorCode: 'BADGE_DELETE_FORBIDDEN',
      errorMessage: 'BADGE_DELETE_FORBIDDEN: Apenas o proprietário (criador) pode excluir badges.'
    };
  }

  return { valid: true };
}