import { describe, it, expect } from 'vitest';
import type { Badge, CleaningRecord, House, HouseMember } from '../types';
import { validateCleaningPersistence } from './cleaningPersistence';

// SPEC-020 Cenário 10 — data futura rejeitada também na persistência (defesa em profundidade)

const house: House = {
  id: 'h1',
  name: 'Casa',
  inviteCode: 'ABC234',
  creatorId: 'u1',
  createdAt: '2026-09-01T15:00:00.000Z',
  updatedAt: '2026-09-01T15:00:00.000Z'
};
const members: HouseMember[] = [
  { id: 'm1', houseId: 'h1', userId: 'u1', userName: 'Ana', userEmail: '', role: 'CREATOR', joinedAt: '' }
];
const badges: Badge[] = [{ id: 'b1', houseId: 'h1', name: 'Cozinha', isSystem: true, createdAt: '' }];

const record = (cleaningDate: string): CleaningRecord => ({
  id: 'r1',
  houseId: 'h1',
  userId: 'u1',
  userName: 'Ana',
  registeredById: 'u1',
  cleaningDate,
  badgeIds: ['b1'],
  createdAt: '2026-10-01T13:00:00.000Z'
});

describe('validateCleaningPersistence — data da faxina', () => {
  it('aceita hoje e datas passadas', () => {
    expect(validateCleaningPersistence(record('2026-10-01'), house, members, badges, '2026-10-01').valid).toBe(true);
    expect(validateCleaningPersistence(record('2026-09-28'), house, members, badges, '2026-10-01').valid).toBe(true);
  });

  it('rejeita data futura com CLEANING_DATE_IN_FUTURE', () => {
    expect(validateCleaningPersistence(record('2026-10-02'), house, members, badges, '2026-10-01')).toMatchObject({
      valid: false,
      errorCode: 'CLEANING_DATE_IN_FUTURE'
    });
  });
});
