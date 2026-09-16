import { Badge } from '../types';
import { MAX_TOTAL_BADGES, MAX_CUSTOM_BADGES, SYSTEM_BADGE_COUNT } from './badgeDefinitions';

export interface BadgePanelDerivedState {
  total: number;
  systemCount: number;
  customCount: number;
  systemBadges: Badge[];
  customBadges: Badge[];
  capReached: boolean; // RN-12: total >= 34 (Restrição Obrigatória nº 3)
  customLimitReached: boolean; // RN-11: customizados >= 20
}

/**
 * Deriva o estado de exibição da tela de Gestão de Badges (TSK-302 / SPEC-010):
 * agrupa os badges da casa ativa em Sistema (RN-10) e Customizados (RN-11),
 * calcula os contadores em tempo real e as travas visuais por teto (RN-12).
 */
export function deriveBadgePanelState(badges: Badge[]): BadgePanelDerivedState {
  const sorted = [...badges].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  const systemBadges = sorted.filter((b) => b.isSystem);
  const customBadges = sorted.filter((b) => !b.isSystem);
  const total = badges.length;
  const customCount = customBadges.length;

  return {
    total,
    systemCount: systemBadges.length,
    customCount,
    systemBadges,
    customBadges,
    capReached: total >= MAX_TOTAL_BADGES,
    customLimitReached: customCount >= MAX_CUSTOM_BADGES
  };
}

/**
 * Verifica se o usuário é o criador (proprietário) da casa (RN-21): apenas o
 * criador visualiza os controles de gestão de badges (Novo Badge / editar / excluir).
 */
export function canManageBadges(houseCreatorId: string | undefined, currentUserId: string): boolean {
  if (!houseCreatorId) return false;
  return houseCreatorId === currentUserId;
}

export { MAX_TOTAL_BADGES, MAX_CUSTOM_BADGES, SYSTEM_BADGE_COUNT };