import type { Database } from '../types/database';
import type { Badge, CleaningRecord, House, HouseMember, MemberRole } from '../types';

/** SPEC-022 §4.2: linhas do banco (snake_case) → tipos do app (camelCase). */

type Tables = Database['public']['Tables'];
type HouseRow = Tables['houses']['Row'];
type BadgeRow = Tables['badges']['Row'];
type CleaningRow = Tables['cleaning_records']['Row'];
type MemberRow = Tables['house_members']['Row'] & { users: { name: string; email: string } | null };
type CleaningWithBadgesRow = CleaningRow & { cleaning_badges: { badge_id: string }[] };

export const houseFromRow = (row: HouseRow): House => ({
  id: row.id,
  name: row.name,
  inviteCode: row.invite_code,
  creatorId: row.creator_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

export const memberFromRow = (row: MemberRow): HouseMember => ({
  // house_members não tem PK própria (PK composta casa + usuário)
  id: `${row.house_id}:${row.user_id}`,
  houseId: row.house_id,
  userId: row.user_id,
  userName: row.users?.name ?? '',
  userEmail: row.users?.email ?? '',
  role: row.role as MemberRole,
  joinedAt: row.joined_at
});

export const badgeFromRow = (row: BadgeRow): Badge => ({
  id: row.id,
  houseId: row.house_id,
  name: row.name,
  isSystem: row.is_system,
  displayOrder: row.display_order,
  createdAt: row.created_at,
  deletedAt: row.deleted_at ?? undefined
});

export const cleaningFromRow = (row: CleaningWithBadgesRow): CleaningRecord => ({
  id: row.id,
  houseId: row.house_id,
  userId: row.user_id,
  userName: row.responsible_name,
  registeredById: row.registered_by_id,
  cleaningDate: row.cleaning_date,
  badgeIds: row.cleaning_badges.map((link) => link.badge_id),
  notes: row.notes ?? undefined,
  createdAt: row.created_at
});
