import { describe, it, expect } from 'vitest';
import { badgeFromRow, cleaningFromRow, houseFromRow, memberFromRow } from './mappers';

// SPEC-022 §4.2 — linhas do banco (snake_case) → tipos do app (camelCase)

describe('mapeamentos', () => {
  it('casa', () => {
    expect(
      houseFromRow({
        id: 'h1',
        name: 'Ap 402',
        invite_code: 'ABC234',
        creator_id: 'u1',
        created_at: '2026-09-01T12:00:00+00:00',
        updated_at: '2026-09-02T12:00:00+00:00'
      })
    ).toEqual({
      id: 'h1',
      name: 'Ap 402',
      inviteCode: 'ABC234',
      creatorId: 'u1',
      createdAt: '2026-09-01T12:00:00+00:00',
      updatedAt: '2026-09-02T12:00:00+00:00'
    });
  });

  it('membro com o perfil embutido; sem PK própria, o id é casa:usuário', () => {
    expect(
      memberFromRow({
        house_id: 'h1',
        user_id: 'u2',
        role: 'MEMBER',
        joined_at: '2026-09-03T12:00:00+00:00',
        users: { name: 'Carlos', email: 'carlos@exemplo.com' }
      })
    ).toEqual({
      id: 'h1:u2',
      houseId: 'h1',
      userId: 'u2',
      userName: 'Carlos',
      userEmail: 'carlos@exemplo.com',
      role: 'MEMBER',
      joinedAt: '2026-09-03T12:00:00+00:00'
    });
  });

  it('badge ativo e badge excluído', () => {
    const base = { id: 'b1', house_id: 'h1', name: 'Cozinha', is_system: true, display_order: 8, created_at: 'c' };
    expect(badgeFromRow({ ...base, deleted_at: null })).toEqual({
      id: 'b1',
      houseId: 'h1',
      name: 'Cozinha',
      isSystem: true,
      displayOrder: 8,
      createdAt: 'c',
      deletedAt: undefined
    });
    expect(badgeFromRow({ ...base, deleted_at: 'd' }).deletedAt).toBe('d');
  });

  it('faxina usa responsible_name e junta os vínculos de badges', () => {
    expect(
      cleaningFromRow({
        id: 'c1',
        house_id: 'h1',
        user_id: 'u2',
        responsible_name: 'Carlos',
        registered_by_id: 'u1',
        cleaning_date: '2026-09-28',
        notes: null,
        created_at: 'c',
        updated_at: 'u',
        cleaning_badges: [{ badge_id: 'b1' }, { badge_id: 'b2' }]
      })
    ).toEqual({
      id: 'c1',
      houseId: 'h1',
      userId: 'u2',
      userName: 'Carlos',
      registeredById: 'u1',
      cleaningDate: '2026-09-28',
      badgeIds: ['b1', 'b2'],
      notes: undefined,
      createdAt: 'c'
    });
  });
});
