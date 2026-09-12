import { useState, useEffect, useCallback } from 'react';
import { authService, SystemCapacity } from '../services/authService';

export interface UseSystemCapacityReturn extends SystemCapacity {
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom Hook reativo para consulta prévia do teto de 100 usuários
 * Alimenta dinamicamente a tela inicial de autenticação
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
      const data = await authService.checkCapacity();
      setCapacity(data);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível consultar a capacidade do sistema.');
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
