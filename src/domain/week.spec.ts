import { describe, it, expect, afterEach } from 'vitest';
import {
  addDays,
  businessDateOf,
  dateOfWeekday,
  dayOfWeekOf,
  formatLongDate,
  formatShortDate,
  isAfter,
  msUntilNextBusinessDay,
  todayInBusinessTz,
  weekOf
} from './week';

// SPEC-020 — regra de semana (RN-08/RN-24 revisadas)

describe('weekOf — semana de domingo a sábado', () => {
  it('Cenário 1: quinta 01/10/2026 pertence à semana 27/09 a 03/10', () => {
    const week = weekOf('2026-10-01');
    expect(week.start).toBe('2026-09-27');
    expect(week.end).toBe('2026-10-03');
  });

  it.each([
    ['2026-10-01', 'Semana 5 de Setembro de 2026'],
    ['2026-09-27', 'Semana 5 de Setembro de 2026'],
    ['2026-10-03', 'Semana 5 de Setembro de 2026'],
    ['2026-10-04', 'Semana 1 de Outubro de 2026'],
    ['2026-09-10', 'Semana 2 de Setembro de 2026'],
    ['2026-08-01', 'Semana 5 de Julho de 2026']
  ])('Cenário 2: %s → "%s" (mês da maioria dos dias)', (date, label) => {
    expect(weekOf(date).label).toBe(label);
  });

  it('Cenário 3: virada de ano', () => {
    expect(weekOf('2025-12-28').label).toBe('Semana 5 de Dezembro de 2025');
    expect(weekOf('2026-01-03')).toMatchObject({ number: 5, month: 12, year: 2025 });
    expect(weekOf('2026-01-04').label).toBe('Semana 1 de Janeiro de 2026');
  });

  it('Cenário 4: fevereiro de 2026 tem 4 semanas', () => {
    expect(weekOf('2026-02-28')).toMatchObject({ start: '2026-02-22', number: 4, month: 2 });
    expect(weekOf('2026-03-01').label).toBe('Semana 1 de Março de 2026');
  });

  it('propriedades válidas para todos os dias de 2025 a 2027', () => {
    for (let date = '2025-01-01'; date <= '2027-12-31'; date = addDays(date, 1)) {
      const week = weekOf(date);
      expect(dayOfWeekOf(week.start)).toBe('dom');
      expect(addDays(week.start, 6)).toBe(week.end);
      expect(date >= week.start && date <= week.end).toBe(true);
      expect(week.number).toBeGreaterThanOrEqual(1);
      expect(week.number).toBeLessThanOrEqual(5);
      // O mês do título contém a maioria (≥ 4) dos 7 dias da semana
      const daysInLabelMonth = [0, 1, 2, 3, 4, 5, 6]
        .map((i) => addDays(week.start, i))
        .filter((d) => Number(d.slice(5, 7)) === week.month && Number(d.slice(0, 4)) === week.year).length;
      expect(daysInLabelMonth).toBeGreaterThanOrEqual(4);
    }
  });
});

describe('fuso de negócio (America/Sao_Paulo)', () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it('Cenário 5: sábado 23:30 em Brasília ainda é a semana de 27/09', () => {
    const now = new Date('2026-10-04T02:30:00Z');
    expect(todayInBusinessTz(now)).toBe('2026-10-03');
    expect(weekOf(todayInBusinessTz(now)).start).toBe('2026-09-27');
  });

  it('Cenário 5: domingo 00:00 em Brasília inicia a semana de 04/10', () => {
    const now = new Date('2026-10-04T03:00:00Z');
    expect(todayInBusinessTz(now)).toBe('2026-10-04');
    expect(weekOf(todayInBusinessTz(now)).start).toBe('2026-10-04');
  });

  it.each(['UTC', 'Asia/Tokyo', 'America/Los_Angeles'])('independe do fuso do dispositivo (%s)', (tz) => {
    process.env.TZ = tz;
    expect(todayInBusinessTz(new Date('2026-10-04T02:30:00Z'))).toBe('2026-10-03');
    expect(businessDateOf('2026-09-01T02:00:00.000Z')).toBe('2026-08-31');
  });
});

describe('msUntilNextBusinessDay', () => {
  it('sábado 23:59 em Brasília → 60 s até a virada da semana', () => {
    expect(msUntilNextBusinessDay(new Date('2026-10-04T02:59:00Z'))).toBe(60_000);
  });

  it('domingo 00:00 em Brasília → 24 h até a próxima meia-noite', () => {
    expect(msUntilNextBusinessDay(new Date('2026-10-04T03:00:00Z'))).toBe(24 * 60 * 60 * 1000);
  });

  it('independe do fuso do dispositivo', () => {
    const originalTz = process.env.TZ;
    process.env.TZ = 'Asia/Tokyo';
    try {
      // 15:00Z = 12:00 em Brasília → 12 h até a meia-noite
      expect(msUntilNextBusinessDay(new Date('2026-10-01T15:00:00Z'))).toBe(12 * 60 * 60 * 1000);
    } finally {
      process.env.TZ = originalTz;
    }
  });
});

describe('utilitários de data civil', () => {
  it('dayOfWeekOf e dateOfWeekday', () => {
    expect(dayOfWeekOf('2026-10-01')).toBe('qui');
    expect(dateOfWeekday('seg', weekOf('2026-10-01'))).toBe('2026-09-28');
    expect(dateOfWeekday('sab', weekOf('2026-10-01'))).toBe('2026-10-03');
  });

  it('isAfter compara datas civis', () => {
    expect(isAfter('2026-10-02', '2026-10-01')).toBe(true);
    expect(isAfter('2026-10-01', '2026-10-01')).toBe(false);
    expect(isAfter('2026-09-30', '2026-10-01')).toBe(false);
  });

  it('formatação pt-BR', () => {
    expect(formatShortDate('2026-09-28')).toBe('28/09');
    expect(formatLongDate('2026-09-10')).toBe('Quinta-feira, 10/09/2026');
  });

  it('rejeita datas inválidas', () => {
    expect(() => weekOf('2026-02-30')).toThrow();
    expect(() => weekOf('01/10/2026')).toThrow();
  });
});
