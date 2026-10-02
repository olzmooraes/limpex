import { describe, it, expect, beforeEach } from 'vitest';
import type { House } from '../types';
import { getStoredActiveHouseId, resolveActiveHouse, saveActiveHouseId } from './houseSelection';

// TSK-204 / RN-19: casa ativa escolhida no dispositivo

const house = (id: string): House => ({
  id,
  name: id,
  inviteCode: 'ABC234',
  creatorId: 'u1',
  createdAt: 'c',
  updatedAt: 'u'
});

describe('resolveActiveHouse', () => {
  const houses = [house('h1'), house('h2')];

  it('prefere a casa salva quando o usuário ainda participa dela', () => {
    expect(resolveActiveHouse(houses, 'h2')?.id).toBe('h2');
  });

  it('casa salva que não está mais na lista (saiu ou foi excluída) → primeira casa', () => {
    expect(resolveActiveHouse(houses, 'h-antiga')?.id).toBe('h1');
    expect(resolveActiveHouse(houses, null)?.id).toBe('h1');
  });

  it('sem casas → null', () => {
    expect(resolveActiveHouse([], 'h1')).toBeNull();
  });
});

describe('preferência salva no dispositivo', () => {
  beforeEach(() => localStorage.clear());

  it('salva, lê e limpa', () => {
    saveActiveHouseId('h2');
    expect(getStoredActiveHouseId()).toBe('h2');
    saveActiveHouseId(null);
    expect(getStoredActiveHouseId()).toBeNull();
  });
});
