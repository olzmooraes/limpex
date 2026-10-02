// TSK-404 / SPEC-017 + TSK-407 / SPEC-020: Camada de domínio da tela principal (semana vigente)
import type { CleaningRecord, Badge } from '../types';
import {
  IsoDate,
  WEEKDAY_LABELS,
  WeekInfo,
  dayOfWeekOf,
  formatShortDate,
  todayInBusinessTz,
  weekOf
} from '../domain/week';
import { hasValidNotes } from './cleaningNotesIndicator';

/** Semana vigente (domingo a sábado, Brasília) e a data de hoje. */
export interface WeekContext extends WeekInfo {
  today: IsoDate;
}

export interface CleaningCardView {
  recordId: string;
  userName: string;
  initials: string;
  /** "Segunda-feira" — derivado da data da faxina. */
  weekdayLabel: string;
  /** "28/09" — a semana pode cruzar meses (SPEC-020). */
  dateLabel: string;
  badgeNames: string[];
  hasNotes: boolean;
  notes?: string;
  isExpandable: boolean;
  overflowCount: number;
}

/** Deriva a semana vigente a partir do instante atual, no horário de Brasília (RN-08). */
export function deriveWeekContext(now: Date = new Date()): WeekContext {
  const today = todayInBusinessTz(now);
  return { ...weekOf(today), today };
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

/** Resolve os nomes dos badges da faxina (inclusive excluídos, que são histórico), ignorando referências inexistentes. */
export function resolveBadgeNames(record: CleaningRecord, badges: Badge[]): string[] {
  // Ordem dos badges da casa (display_order, RN-10): o banco não garante a
  // ordem dos vínculos, e assim os cards ficam estáveis.
  const linked = new Set(record.badgeIds);
  return [...badges]
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
    .filter((badge) => linked.has(badge.id))
    .map((badge) => badge.name);
}

export const TWO_TASKS_LIMIT = 2;

/** Monta a visão exibível de um card de faxina da semana vigente. */
export function buildCleaningCardView(record: CleaningRecord, badges: Badge[]): CleaningCardView {
  const badgeNames = resolveBadgeNames(record, badges);
  return {
    recordId: record.id,
    userName: record.userName,
    initials: getInitials(record.userName),
    weekdayLabel: WEEKDAY_LABELS[dayOfWeekOf(record.cleaningDate)],
    dateLabel: formatShortDate(record.cleaningDate),
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