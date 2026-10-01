import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { useCurrentWeek } from './useCurrentWeek';
import type { WeekContext } from '../services/cleaningWeekView';

// SPEC-020 Cenário 7 — reset da semana com o app aberto

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let latest: WeekContext | null = null;
const Probe = () => {
  latest = useCurrentWeek();
  return null;
};

describe('useCurrentWeek', () => {
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-04T02:59:00Z')); // sábado 03/10 23:59 em Brasília
    root = createRoot(document.createElement('div'));
    act(() => root.render(createElement(Probe)));
  });

  afterEach(() => {
    act(() => root.unmount());
    vi.useRealTimers();
  });

  it('vira para a nova semana à meia-noite de domingo, com o app aberto', () => {
    expect(latest?.label).toBe('Semana 5 de Setembro de 2026');
    expect(latest?.today).toBe('2026-10-03');

    act(() => {
      vi.advanceTimersByTime(61_000);
    });

    expect(latest?.label).toBe('Semana 1 de Outubro de 2026');
    expect(latest?.today).toBe('2026-10-04');
    expect(latest?.start).toBe('2026-10-04');
  });

  it('recalcula ao voltar ao primeiro plano depois da virada', () => {
    vi.setSystemTime(new Date('2026-10-05T12:00:00Z')); // relógio avançou com o app em segundo plano
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(latest?.today).toBe('2026-10-05');
    expect(latest?.label).toBe('Semana 1 de Outubro de 2026');
  });
});
