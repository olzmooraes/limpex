import { describe, it, expect } from 'vitest';
import type { Badge } from '../types';
import { validateBadgeName } from './badgeCreation';
import { validateBadgeEditName } from './badgeEdit';
import { canManageBadges, deriveBadgePanelState } from './badgeView';

// Validações e estado da tela de badges no cliente (SPEC-010 a SPEC-012).
// O banco aplica as mesmas regras (SPEC-021); aqui garantimos o retorno
// imediato nos modais. Recebem só os badges ATIVOS da casa.

const badge = (id: string, name: string, isSystem: boolean, displayOrder: number): Badge => ({
  id,
  houseId: 'h1',
  name,
  isSystem,
  displayOrder,
  createdAt: 'c'
});

const system = Array.from({ length: 14 }, (_, i) => badge(`s${i}`, i === 7 ? 'Cozinha' : `Sistema ${i}`, true, i + 1));
const custom = (n: number) => Array.from({ length: n }, (_, i) => badge(`c${i}`, `Extra ${i}`, false, 15 + i));

describe('validateBadgeName (criação)', () => {
  it('aceita nome novo', () => {
    expect(validateBadgeName('Lavanderia', system)).toEqual({ valid: true });
  });

  it.each([
    ['   ', 'BADGE_NAME_EMPTY'],
    ['x'.repeat(41), 'BADGE_NAME_TOO_LONG'],
    ['cozinha', 'BADGE_NAME_DUPLICATE']
  ])('"%s" → %s', (name, code) => {
    expect(validateBadgeName(name, system)).toMatchObject({ valid: false, errorCode: code });
  });

  it('bloqueia no teto de 20 customizados / 34 ativos', () => {
    expect(validateBadgeName('Nova', [...system, ...custom(19)])).toEqual({ valid: true });
    expect(validateBadgeName('Nova', [...system, ...custom(20)]).valid).toBe(false);
    // Sem alguns badges do sistema, o limite que pesa é o de customizados
    expect(validateBadgeName('Nova', [...system.slice(0, 10), ...custom(20)])).toMatchObject({
      errorCode: 'BADGE_CUSTOM_LIMIT_REACHED'
    });
  });
});

describe('validateBadgeEditName (renomear)', () => {
  it('aceita manter o próprio nome e recusa nome de outro badge', () => {
    expect(validateBadgeEditName('COZINHA', 's7', system)).toEqual({ valid: true });
    expect(validateBadgeEditName('cozinha', 's0', system)).toMatchObject({ errorCode: 'BADGE_NAME_DUPLICATE' });
  });

  it('nome vazio ou longo', () => {
    expect(validateBadgeEditName(' ', 's0', system)).toMatchObject({ errorCode: 'BADGE_NAME_EMPTY' });
    expect(validateBadgeEditName('x'.repeat(41), 's0', system)).toMatchObject({ errorCode: 'BADGE_NAME_TOO_LONG' });
  });
});

describe('tela de badges', () => {
  it('agrupa sistema e customizados e calcula as travas', () => {
    const state = deriveBadgePanelState([...custom(20), ...system]);
    expect(state).toMatchObject({ total: 34, systemCount: 14, customCount: 20, capReached: true, customLimitReached: true });
    expect(state.systemBadges[0].displayOrder).toBe(1);
  });

  it('só o criador gerencia badges (RN-21)', () => {
    expect(canManageBadges('u1', 'u1')).toBe(true);
    expect(canManageBadges('u1', 'u2')).toBe(false);
    expect(canManageBadges(undefined, 'u1')).toBe(false);
  });
});
