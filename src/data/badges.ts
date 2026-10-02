import { requireSupabase } from '../lib/supabase';
import { toAppError } from '../lib/appError';
import type { Badge } from '../types';
import { badgeFromRow } from './mappers';

/**
 * SPEC-022 E3: badges da casa. A leitura inclui os excluídos (deletedAt), que
 * continuam nomeando tarefas no histórico; gestão e formulário usam só os
 * ativos (activeBadges). Tetos e permissões ficam no banco (SPEC-021).
 */

export async function getBadges(houseId: string): Promise<Badge[]> {
  const { data, error } = await requireSupabase()
    .from('badges')
    .select('*')
    .eq('house_id', houseId)
    .order('display_order');
  if (error) throw toAppError(error);
  return data.map(badgeFromRow);
}

export const activeBadges = (badges: Badge[]): Badge[] => badges.filter((badge) => !badge.deletedAt);

export async function createBadge(houseId: string, name: string): Promise<Badge> {
  const { data, error } = await requireSupabase().rpc('create_badge', { p_house_id: houseId, p_name: name });
  if (error) throw toAppError(error);
  return badgeFromRow(data);
}

export async function renameBadge(badgeId: string, name: string): Promise<Badge> {
  const { data, error } = await requireSupabase().rpc('rename_badge', { p_badge_id: badgeId, p_name: name });
  if (error) throw toAppError(error);
  return badgeFromRow(data);
}

export async function deleteBadge(badgeId: string): Promise<void> {
  const { error } = await requireSupabase().rpc('delete_badge', { p_badge_id: badgeId });
  if (error) throw toAppError(error);
}
