import { useEffect, useState } from 'react';
import { msUntilNextBusinessDay } from '../domain/week';
import { WeekContext, deriveWeekContext } from '../services/cleaningWeekView';

/** Folga para garantir que o timer dispare já no novo dia. */
const MIDNIGHT_MARGIN_MS = 1000;

/**
 * SPEC-020 Cenário 7 (RN-08): semana vigente e "hoje" em Brasília, recalculados
 * a cada meia-noite e sempre que o app volta ao primeiro plano. Nenhum dado é
 * alterado — apenas a janela exibida muda.
 */
export const useCurrentWeek = (): WeekContext => {
  const [context, setContext] = useState<WeekContext>(() => deriveWeekContext());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const refresh = () => {
      setContext((prev) => {
        const next = deriveWeekContext();
        return next.today === prev.today ? prev : next;
      });
    };

    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        refresh();
        schedule();
      }, msUntilNextBusinessDay() + MIDNIGHT_MARGIN_MS);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refresh();
        schedule();
      }
    };

    schedule();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return context;
};
