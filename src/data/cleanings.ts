import { requireSupabase } from '../lib/supabase';
import { toAppError } from '../lib/appError';
import type { CleaningRecord } from '../types';
import { cleaningFromRow } from './mappers';

/**
 * SPEC-022 E3: faxinas. A semana é um intervalo de datas (SPEC-020); as regras
 * de data, membros e badges são aplicadas pelo banco (create_cleaning).
 */

export async function getCleanings(
  houseId: string,
  range: { from: string; to: string }
): Promise<CleaningRecord[]> {
  const { data, error } = await requireSupabase()
    .from('cleaning_records')
    .select('*, cleaning_badges(badge_id)')
    .eq('house_id', houseId)
    .gte('cleaning_date', range.from)
    .lte('cleaning_date', range.to)
    .order('cleaning_date')
    .order('created_at');
  if (error) throw toAppError(error);
  return data.map(cleaningFromRow);
}

export interface NewCleaning {
  houseId: string;
  responsibleId: string;
  cleaningDate: string;
  badgeIds: string[];
  notes?: string;
}

export async function createCleaning(input: NewCleaning): Promise<CleaningRecord> {
  const { data, error } = await requireSupabase().rpc('create_cleaning', {
    p_house_id: input.houseId,
    p_responsible_id: input.responsibleId,
    p_cleaning_date: input.cleaningDate,
    p_badge_ids: input.badgeIds,
    p_notes: input.notes
  });
  if (error) throw toAppError(error);
  return cleaningFromRow({ ...data, cleaning_badges: input.badgeIds.map((badge_id) => ({ badge_id })) });
}
