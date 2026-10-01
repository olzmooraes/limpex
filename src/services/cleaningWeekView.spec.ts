import { describe, it, expect, beforeEach } from 'vitest';
import { dbService } from './supabase';
import { buildCleaningCardView, deriveWeekContext } from './cleaningWeekView';
import type { CleaningRecord } from '../types';

// SPEC-020 Cenários 6 e 8 — tela Início consulta a semana pela data da faxina

const NOW = new Date('2026-10-01T13:00:00Z'); // quinta 01/10/2026, 10:00 em Brasília
const RECORDS_KEY = 'limpex_mock_cleaning_records';

const record = (id: string, cleaningDate: string, extra: Record<string, unknown> = {}): CleaningRecord =>
  ({
    id,
    houseId: 'h1',
    userId: 'u1',
    userName: 'Ana Souza',
    registeredById: 'u1',
    cleaningDate,
    badgeIds: [],
    createdAt: '2026-10-01T13:00:00.000Z',
    ...extra
  }) as CleaningRecord;

describe('tela Início — semana vigente', () => {
  beforeEach(() => localStorage.clear());

  it('deriveWeekContext: semana 27/09 a 03/10 com título de setembro', () => {
    expect(deriveWeekContext(NOW)).toMatchObject({
      today: '2026-10-01',
      start: '2026-09-27',
      end: '2026-10-03',
      label: 'Semana 5 de Setembro de 2026'
    });
  });

  it('Cenário 6: faxinas de 28/09, 30/09 e 01/10 aparecem; 26/09 e outra casa não', async () => {
    localStorage.setItem(
      RECORDS_KEY,
      JSON.stringify([
        record('r-prev', '2026-09-26'),
        record('r-seg', '2026-09-28'),
        record('r-qua', '2026-09-30'),
        record('r-qui', '2026-10-01'),
        { ...record('r-outra-casa', '2026-09-29'), houseId: 'h2' }
      ])
    );
    const week = deriveWeekContext(NOW);
    const records = await dbService.getCleaningRecords('h1', { from: week.start, to: week.end });
    expect(records.map((r) => r.cleaningDate)).toEqual(['2026-09-28', '2026-09-30', '2026-10-01']);
  });

  it('Cenário 8: registro antigo com weekNumber/month da regra anterior é posicionado pela data', async () => {
    // Pela regra antiga, 30/09 era gravado como "semana 4 de setembro" e sumia da tela.
    localStorage.setItem(
      RECORDS_KEY,
      JSON.stringify([record('r-legado', '2026-09-30', { dayOfWeek: 'qua', weekNumber: 4, month: 9, year: 2026 })])
    );
    const week = deriveWeekContext(NOW);
    const records = await dbService.getCleaningRecords('h1', { from: week.start, to: week.end });
    expect(records.map((r) => r.id)).toEqual(['r-legado']);
  });

  it('card mostra dia da semana e data derivados de cleaningDate', () => {
    const card = buildCleaningCardView(record('r1', '2026-09-28'), []);
    expect(card.weekdayLabel).toBe('Segunda-feira');
    expect(card.dateLabel).toBe('28/09');
  });
});
