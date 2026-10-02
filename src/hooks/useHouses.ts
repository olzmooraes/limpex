import { useCallback, useEffect, useState } from 'react';
import { getMyHouses } from '../data/houses';
import { toAppError } from '../lib/appError';
import { getStoredActiveHouseId, resolveActiveHouse, saveActiveHouseId } from '../services/houseSelection';
import type { House } from '../types';

export interface UseHousesResult {
  houses: House[];
  activeHouse: House | null;
  selectHouse: (house: House) => void;
  /** Recarrega as casas (após criar, entrar ou excluir) e reelege a casa ativa. */
  refresh: () => Promise<void>;
  error: string | null;
  retry: () => void;
}

/**
 * TSK-203/204 + SPEC-022: casas do usuário logado e casa ativa (RN-19). A casa
 * ativa é a preferência salva no dispositivo, se o usuário ainda participar
 * dela, ou a primeira da lista.
 */
export const useHouses = (): UseHousesResult => {
  const [houses, setHouses] = useState<House[]>([]);
  const [activeHouse, setActiveHouse] = useState<House | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  const apply = useCallback((list: House[]) => {
    setHouses(list);
    setActiveHouse(resolveActiveHouse(list, getStoredActiveHouseId()));
  }, []);

  useEffect(() => {
    let cancelled = false;
    getMyHouses()
      .then((list) => !cancelled && apply(list))
      .catch((err) => !cancelled && setError(toAppError(err).message));
    return () => {
      cancelled = true;
    };
  }, [apply, reloadNonce]);

  const refresh = useCallback(async () => apply(await getMyHouses()), [apply]);

  const selectHouse = useCallback((house: House) => {
    setActiveHouse(house);
    saveActiveHouseId(house.id);
  }, []);

  const retry = useCallback(() => {
    setError(null);
    setReloadNonce((n) => n + 1);
  }, []);

  return { houses, activeHouse, selectHouse, refresh, error, retry };
};
