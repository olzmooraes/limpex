import type { TabId } from '../types';

/**
 * Fonte única de verdade do modelo de navegação inferior do Limpex (TSK-401 / SPEC-014).
 * Restrição Obrigatória nº 1: Navbar fixa inferior com exatamente 5 posições.
 */
export type NavIcon = 'home' | 'tags' | 'plus' | 'building' | 'history';

export interface NavTabConfig {
  id: TabId;
  label: string;
  ariaLabel: string;
  icon: NavIcon;
  /** true apenas para a 3ª posição (+ Faxina), botão central elevado. */
  isCentral?: boolean;
}

/** Ordem exata das 5 posições: Início · Badges · + Faxina (Central) · Casas · Histórico. */
export const BOTTOM_NAV_ORDER: NavTabConfig[] = [
  { id: 'home', label: 'Início', ariaLabel: 'Início e faxinas da semana', icon: 'home' },
  { id: 'badges', label: 'Badges', ariaLabel: 'Gestão de badges e tarefas', icon: 'tags' },
  { id: 'new-cleaning', label: '+ Faxina', ariaLabel: 'Registrar nova faxina', icon: 'plus', isCentral: true },
  { id: 'houses', label: 'Casas', ariaLabel: 'Casas e membros', icon: 'building' },
  { id: 'history', label: 'Histórico', ariaLabel: 'Histórico de limpezas', icon: 'history' }
];

/** Número fixo de posições da Bottom Navbar (RN-06 / Restrição nº 1). */
export const BOTTOM_NAV_POSITIONS = 5;

/** Aba acionada pelo botão central elevado "+ Faxina". */
export const CENTRAL_TAB: TabId = 'new-cleaning';

/** Alvo mínimo de toque mobile-first (Restrição nº 1). */
export const TOUCH_TARGET_MIN = 44;

export function getNavTabById(id: TabId): NavTabConfig | undefined {
  return BOTTOM_NAV_ORDER.find((tab) => tab.id === id);
}

/** Retorna a posição 1..5 do item dentro da Navbar (0 quando não encontrado). */
export function getNavPosition(id: TabId): number {
  return BOTTOM_NAV_ORDER.findIndex((tab) => tab.id === id) + 1;
}