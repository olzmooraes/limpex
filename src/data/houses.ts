import { requireSupabase } from '../lib/supabase';
import { toAppError } from '../lib/appError';
import type { House, HouseMember } from '../types';
import { houseFromRow, memberFromRow } from './mappers';

/**
 * SPEC-022 E3: casas e membros. Leitura via RLS (só casas do usuário);
 * escrita pelas RPCs da SPEC-021, que aplicam RN-16 a RN-22.
 */

/** RN-19: casas em que o usuário é criador ou membro, na ordem de criação. */
export async function getMyHouses(): Promise<House[]> {
  const { data, error } = await requireSupabase().from('houses').select('*').order('created_at');
  if (error) throw toAppError(error);
  return data.map(houseFromRow);
}

export async function getHouseMembers(houseId: string): Promise<HouseMember[]> {
  const { data, error } = await requireSupabase()
    .from('house_members')
    .select('house_id, user_id, role, joined_at, users(name, email)')
    .eq('house_id', houseId)
    .order('joined_at');
  if (error) throw toAppError(error);
  return data.map(memberFromRow);
}

export async function createHouse(name: string): Promise<House> {
  const { data, error } = await requireSupabase().rpc('create_house', { p_name: name });
  if (error) throw toAppError(error);
  return houseFromRow(data);
}

export async function joinHouse(inviteCode: string): Promise<House> {
  const { data, error } = await requireSupabase().rpc('join_house', { p_invite_code: inviteCode });
  if (error) throw toAppError(error);
  return houseFromRow(data);
}

export async function deleteHouse(houseId: string): Promise<void> {
  const { error } = await requireSupabase().rpc('delete_house', { p_house_id: houseId });
  if (error) throw toAppError(error);
}
