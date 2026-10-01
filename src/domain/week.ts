import type { DayOfWeek } from '../types';

/**
 * SPEC-020 — Domínio de calendário do Limpex (RN-08 / RN-09 / RN-24 revisadas).
 * Toda regra de data usa o fuso de Brasília e trabalha com datas civis
 * ('AAAA-MM-DD'), sem horas, para não depender do fuso do dispositivo.
 */

export const BUSINESS_TIME_ZONE = 'America/Sao_Paulo';

/** Data civil sem hora, no formato 'AAAA-MM-DD'. */
export type IsoDate = string;

/** Ordem canônica dos dias (domingo a sábado). */
export const WEEKDAY_ORDER: DayOfWeek[] = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

export const WEEKDAY_LABELS: Record<DayOfWeek, string> = {
  dom: 'Domingo',
  seg: 'Segunda-feira',
  ter: 'Terça-feira',
  qua: 'Quarta-feira',
  qui: 'Quinta-feira',
  sex: 'Sexta-feira',
  sab: 'Sábado'
};

export const PT_MONTH_NAMES: readonly string[] = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro'
];

export interface WeekInfo {
  /** Domingo da semana. */
  start: IsoDate;
  /** Sábado da semana. */
  end: IsoDate;
  /** 1..5 — ordem da semana dentro do mês da sua quarta-feira. */
  number: number;
  /** 1..12 — mês da quarta-feira (o mês com a maioria dos dias da semana). */
  month: number;
  year: number;
  /** "Semana N de <Mês> de <Ano>" */
  label: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Converte a data civil em um Date à meia-noite UTC (somente para aritmética). */
function toUtcDate(date: IsoDate): Date {
  const match = ISO_DATE_PATTERN.exec(date);
  if (match) {
    const [, y, m, d] = match.map(Number);
    const utc = new Date(Date.UTC(y, m - 1, d));
    if (utc.getUTCFullYear() === y && utc.getUTCMonth() === m - 1 && utc.getUTCDate() === d) {
      return utc;
    }
  }
  throw new Error(`Data inválida: "${date}" (esperado AAAA-MM-DD).`);
}

function fromUtcDate(utc: Date): IsoDate {
  return utc.toISOString().slice(0, 10);
}

const businessFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: BUSINESS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23'
});

/** Componentes de relógio de parede em Brasília para um instante. */
function businessWallClock(instant: Date) {
  const parts = Object.fromEntries(
    businessFormatter.formatToParts(instant).map((p) => [p.type, p.value])
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second)
  };
}

/** Data civil, em Brasília, de um instante (Date ou string ISO-8601). */
export function businessDateOf(instant: Date | string): IsoDate {
  const { year, month, day } = businessWallClock(new Date(instant));
  return fromUtcDate(new Date(Date.UTC(year, month - 1, day)));
}

/** "Hoje" em Brasília, independentemente do fuso do dispositivo. */
export function todayInBusinessTz(now: Date = new Date()): IsoDate {
  return businessDateOf(now);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return fromUtcDate(new Date(toUtcDate(date).getTime() + days * DAY_MS));
}

export function dayOfWeekOf(date: IsoDate): DayOfWeek {
  return WEEKDAY_ORDER[toUtcDate(date).getUTCDay()];
}

/** `a` é posterior a `b`? Lança erro se alguma das datas for inválida. */
export function isAfter(a: IsoDate, b: IsoDate): boolean {
  return toUtcDate(a).getTime() > toUtcDate(b).getTime();
}

/**
 * Semana (domingo a sábado) que contém a data. O título usa o mês da
 * quarta-feira; a k-ésima quarta-feira de um mês cai entre os dias 7(k−1)+1 e
 * 7k, logo N = teto(dia da quarta-feira / 7), sempre entre 1 e 5.
 */
export function weekOf(date: IsoDate): WeekInfo {
  const start = addDays(date, -toUtcDate(date).getUTCDay());
  const wednesday = toUtcDate(addDays(start, 3));
  const number = Math.ceil(wednesday.getUTCDate() / 7);
  const month = wednesday.getUTCMonth() + 1;
  const year = wednesday.getUTCFullYear();
  return {
    start,
    end: addDays(start, 6),
    number,
    month,
    year,
    label: `Semana ${number} de ${PT_MONTH_NAMES[month - 1]} de ${year}`
  };
}

export function dateOfWeekday(day: DayOfWeek, week: WeekInfo): IsoDate {
  return addDays(week.start, WEEKDAY_ORDER.indexOf(day));
}

/** Instante UTC em que o relógio de Brasília marca 00:00 da data civil. */
function businessMidnight(date: IsoDate): number {
  const target = toUtcDate(date).getTime();
  let instant = target;
  // Duas iterações cobrem eventuais mudanças de offset (horário de verão).
  for (let i = 0; i < 2; i++) {
    const wall = businessWallClock(new Date(instant));
    const wallAsUtc = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second);
    instant = target - (wallAsUtc - instant);
  }
  return instant;
}

/**
 * Milissegundos até a próxima meia-noite em Brasília. Recalcular "hoje" a cada
 * virada de dia cobre o reset semanal de domingo 00:00 (RN-08) e mantém os
 * dias futuros do formulário corretos com o app aberto.
 */
export function msUntilNextBusinessDay(now: Date = new Date()): number {
  const tomorrow = addDays(todayInBusinessTz(now), 1);
  return Math.max(0, businessMidnight(tomorrow) - now.getTime());
}

/** "28/09" */
export function formatShortDate(date: IsoDate): string {
  return `${date.slice(8, 10)}/${date.slice(5, 7)}`;
}

/** "Quinta-feira, 10/09/2026" */
export function formatLongDate(date: IsoDate): string {
  return `${WEEKDAY_LABELS[dayOfWeekOf(date)]}, ${formatShortDate(date)}/${date.slice(0, 4)}`;
}
