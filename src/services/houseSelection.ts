import { House } from '../types';

/**
 * TSK-204 / SPEC-008: Seleção da casa ativa no topo do aplicativo (RN-19).
 * Encapsula a regra de escolha da casa ativa e sua persistência local,
 * permitindo que o seletor do Header e a lógica do App compartilhem o mesmo
 * contrato e possam ser testados isoladamente.
 */

export const LOCAL_STORAGE_KEY_ACTIVE_HOUSE = 'limpex_active_house_id';

/**
 * Lê a identificação da casa ativa previamente salva no dispositivo.
 */
export const getStoredActiveHouseId = (): string | null => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(LOCAL_STORAGE_KEY_ACTIVE_HOUSE);
};

/**
 * Persiste a casa ativa escolhida pelo usuário para a próxima sessão.
 */
export const saveActiveHouseId = (houseId: string | null): void => {
  if (typeof window === 'undefined') return;
  if (houseId) {
    window.localStorage.setItem(LOCAL_STORAGE_KEY_ACTIVE_HOUSE, houseId);
  } else {
    window.localStorage.removeItem(LOCAL_STORAGE_KEY_ACTIVE_HOUSE);
  }
};

/**
 * TSK-204: Resolve qual casa deve ficar ativa dado o conjunto de casas do usuário.
 * - Prefere a casa previamente eleita (preferredId) quando ainda consta na lista.
 * - Caso contrário, elege a primeira casa da lista (ordem de associação).
 * - Retorna null quando o usuário não participa de nenhuma casa.
 * Nunca retorna uma casa da qual o usuário não é membro/criador (isolamento RN-19).
 */
export const resolveActiveHouse = (
  houses: House[],
  preferredId: string | null
): House | null => {
  if (houses.length === 0) return null;
  if (preferredId) {
    const preferred = houses.find((h) => h.id === preferredId);
    if (preferred) return preferred;
  }
  return houses[0];
};