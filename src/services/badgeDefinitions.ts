import { Badge } from '../types';

/**
 * Fonte Única de Verdade dos Badges do Sistema (RN-10 a RN-12 / SPEC-009).
 *
 * Substitui as 3 listas duplicadas que existiam em supabase.ts (seed inicial,
 * seed do createHouse) e App.tsx. A ordem fixa abaixo espelha 1:1 o trigger
 * SQL `handle_new_house` (handle_new_house) e a RN-10.
 */
export const SYSTEM_BADGE_NAMES: readonly string[] = [
  'Janelas', 'Portas', 'Quarto 1', 'Quarto 2', 'Quarto 3',
  'Banheiro', 'Varanda', 'Cozinha', 'Sala', 'Casa completa',
  'Garagem', 'Calçada', 'Área gourmet', 'Mobília'
] as const;

export const SYSTEM_BADGE_COUNT = 14; // RN-10
export const MAX_CUSTOM_BADGES = 20; // RN-11
export const MAX_TOTAL_BADGES = 34; // RN-12 (14 sistema + até 20 customizados)

/**
 * Gera os 14 badges do sistema para uma casa recém-criada (espelha o trigger
 * handle_new_house). Usado pelo seed do mock no createHouse e pelas simulações.
 */
export function createSystemBadges(houseId: string, createdAt: string): Badge[] {
  return SYSTEM_BADGE_NAMES.map((name, idx) => ({
    id: `bdg-${houseId}-${idx + 1}`,
    houseId,
    name,
    isSystem: true,
    displayOrder: idx + 1,
    createdAt
  }));
}
