/**
 * Limites de badges usados pela interface (RN-10 a RN-12). A fonte da verdade
 * é o banco: os 14 badges do sistema são criados por `create_house` e os
 * tetos são aplicados pelo trigger `enforce_badge_limits` (SPEC-021).
 */
export const SYSTEM_BADGE_COUNT = 14; // RN-10
export const MAX_CUSTOM_BADGES = 20; // RN-11
export const MAX_TOTAL_BADGES = 34; // RN-12 (14 sistema + até 20 customizados)
