import { useCallback, useEffect, useMemo, useState } from 'react';
import { activeBadges as onlyActive, getBadges } from '../data/badges';
import { getCleanings } from '../data/cleanings';
import { getHouseMembers } from '../data/houses';
import { toAppError } from '../lib/appError';
import type { Badge, CleaningRecord, House, HouseMember } from '../types';

export interface UseHouseDataResult {
  /** Todos os badges, inclusive excluídos (nomeiam tarefas no histórico). */
  badges: Badge[] | null;
  /** Só os ativos: gestão, formulário e contadores (RN-14 revisada). */
  activeBadges: Badge[] | null;
  members: HouseMember[] | null;
  weeklyRecords: CleaningRecord[] | null;
  badgesLoading: boolean;
  membersLoading: boolean;
  weeklyLoading: boolean;
  refreshBadges: () => Promise<void>;
  refreshWeek: () => void;
  error: string | null;
  retry: () => void;
}

/**
 * SPEC-022: dados da casa ativa — badges, membros e faxinas da semana vigente
 * (domingo a sábado, Brasília — SPEC-020). Recarrega ao trocar de casa e na
 * virada da semana; nunca mistura dados de casas diferentes (RN-19).
 */
export const useHouseData = (house: House | null, week: { start: string; end: string }): UseHouseDataResult => {
  const [badges, setBadges] = useState<Badge[] | null>(null);
  const [badgesLoading, setBadgesLoading] = useState(false);
  const [members, setMembers] = useState<HouseMember[] | null>(null);
  const [membersLoading, setMembersLoading] = useState(false);
  const [weeklyRecords, setWeeklyRecords] = useState<CleaningRecord[] | null>(null);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [weekNonce, setWeekNonce] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  const houseId = house?.id ?? null;
  const reportError = (err: unknown) => setError(toAppError(err).message);

  useEffect(() => {
    if (!houseId) {
      setBadges(null);
      setBadgesLoading(false);
      return;
    }
    let cancelled = false;
    setBadgesLoading(true);
    getBadges(houseId)
      .then((list) => !cancelled && setBadges(list))
      .catch((err) => !cancelled && reportError(err))
      .finally(() => !cancelled && setBadgesLoading(false));
    return () => {
      cancelled = true;
    };
  }, [houseId, reloadNonce]);

  useEffect(() => {
    if (!houseId) {
      setMembers(null);
      setMembersLoading(false);
      return;
    }
    let cancelled = false;
    setMembersLoading(true);
    getHouseMembers(houseId)
      .then((list) => !cancelled && setMembers(list))
      .catch((err) => !cancelled && reportError(err))
      .finally(() => !cancelled && setMembersLoading(false));
    return () => {
      cancelled = true;
    };
  }, [houseId, reloadNonce]);

  useEffect(() => {
    if (!houseId) {
      setWeeklyRecords(null);
      setWeeklyLoading(false);
      return;
    }
    let cancelled = false;
    setWeeklyLoading(true);
    getCleanings(houseId, { from: week.start, to: week.end })
      .then((records) => !cancelled && setWeeklyRecords(records))
      .catch((err) => !cancelled && reportError(err))
      .finally(() => !cancelled && setWeeklyLoading(false));
    return () => {
      cancelled = true;
    };
  }, [houseId, week.start, week.end, weekNonce, reloadNonce]);

  const refreshBadges = useCallback(async () => {
    if (houseId) setBadges(await getBadges(houseId));
  }, [houseId]);

  const refreshWeek = useCallback(() => setWeekNonce((n) => n + 1), []);

  const retry = useCallback(() => {
    setError(null);
    setReloadNonce((n) => n + 1);
  }, []);

  const activeBadges = useMemo(() => (badges ? onlyActive(badges) : null), [badges]);

  return {
    badges,
    activeBadges,
    members,
    weeklyRecords,
    badgesLoading,
    membersLoading,
    weeklyLoading,
    refreshBadges,
    refreshWeek,
    error,
    retry
  };
};
