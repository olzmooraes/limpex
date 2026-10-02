import { useState, useEffect, useCallback } from 'react';
import { getSystemCapacity, SystemCapacity } from '../data/auth';

export interface UseSystemCapacityReturn extends SystemCapacity {
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * RN-01: consulta prévia do teto de 100 usuários para a tela de autenticação.
 * Em caso de falha, o cadastro continua visível: o servidor barra o excesso
 * de qualquer forma (trigger em auth.users).
 */
export const useSystemCapacity = (): UseSystemCapacityReturn => {
  const [capacity, setCapacity] = useState<SystemCapacity>({
    totalUsers: 0,
    maxUsers: 100,
    isRegistrationAllowed: true
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCapacity = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setCapacity(await getSystemCapacity());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Não foi possível consultar a capacidade do sistema.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCapacity();
  }, [fetchCapacity]);

  return {
    ...capacity,
    isLoading,
    error,
    refetch: fetchCapacity
  };
};
