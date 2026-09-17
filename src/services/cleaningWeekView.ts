// TSK-404 / SPEC-017: Camada de domínio da tela principal (semana vigente)
import type { CleaningRecord, Badge, DayOfWeek } from '../types';
import { WEEKDAY_LABELS, computeRecordWeek, getTodayDayOfWeek } from './cleaningRegistration';
import { hasValidNotes } from './cleaningNotesIndicator';

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
  'Dezembro',
];

export interface WeekContext {
  weekNumber: number;
  month: number;
  year: number;
  weekLabel: string;
  todayDayOfWeek: DayOfWeek;
}

export interface CleaningCardView {
  recordId: string;
  userName: string;
  initials: string;
  weekdayLabel: string;
  badgeNames: string[];
  hasNotes: boolean;
  notes?: string;
  isExpandable: boolean;
  overflowCount: number;
}

/** Deriva o contexto determinístico da semana vigente a partir da data atual. */
export function deriveWeekContext(now: Date = new Date()): WeekContext {
  const { weekNumber, month, year } = computeRecordWeek(now);
  const weekLabel = `Semana ${weekNumber} de ${PT_MONTH_NAMES[month - 1]} de ${year}`;
  return {
    weekNumber,
    month,
    year,
    weekLabel,
    todayDayOfWeek: getTodayDayOfWeek(now),
  };
}

const LINKING_PARTICLES = new Set(['de', 'da', 'do', 'das', 'dos', 'e', '&']);

/** Normaliza o nome para comparação e extração de iniciais (remove acentos). */
export function normalizeName(name: string): string {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Extrai até 2 iniciais (1ª + última palavra significativa). */
export function getInitials(name: string): string {
  const words = normalizeName(name.trim())
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => !LINKING_PARTICLES.has(w.toLowerCase()));
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

/** Resolve os nomes dos badges na ordem de record.badgeIds (ignorando órfãos removidos). */
export function resolveBadgeNames(record: CleaningRecord, badges: Badge[]): string[] {
  const badgeById = new Map(badges.map((b) => [b.id, b.name]));
  return record.badgeIds.map((id) => badgeById.get(id)).filter((n): n is string => Boolean(n));
}

export const TWO_TASKS_LIMIT = 2;

/** Monta a visão exibível de um card de faxina da semana vigente. */
export function buildCleaningCardView(record: CleaningRecord, badges: Badge[]): CleaningCardView {
  const badgeNames = resolveBadgeNames(record, badges);
  return {
    recordId: record.id,
    userName: record.userName,
    initials: getInitials(record.userName),
    weekdayLabel: WEEKDAY_LABELS[record.dayOfWeek],
    badgeNames,
    hasNotes: hasValidNotes(record.notes),
    notes: record.notes?.trim() || undefined,
    isExpandable: badgeNames.length > TWO_TASKS_LIMIT,
    overflowCount: Math.max(0, badgeNames.length - TWO_TASKS_LIMIT),
  };
}

/** Nomes de badges visíveis conforme o estado colapsado/expandido do card. */
export function visibleBadgeNames(card: CleaningCardView, isExpanded: boolean): string[] {
  if (isExpanded) return card.badgeNames;
  return card.badgeNames.slice(0, TWO_TASKS_LIMIT);
}

export interface WeekHomeDerivedState {
  weekContext: WeekContext;
  count: number;
  cards: CleaningCardView[];
}

/** Estado consolidado da tela: contexto da semana + cards derivados dos registros. */
export function deriveWeekHomeState(
  records: CleaningRecord[],
  badges: Badge[],
  now: Date = new Date()
): WeekHomeDerivedState {
  const weekContext = deriveWeekContext(now);
  const cards = records.map((record) => buildCleaningCardView(record, badges));
  return { weekContext, count: records.length, cards };
}

export function formatRecordCount(count: number): string {
  return `${count} ${count === 1 ? 'registrada' : 'registradas'}`;
}