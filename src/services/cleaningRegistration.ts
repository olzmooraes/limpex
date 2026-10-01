import { Badge, CleaningRecord, DayOfWeek, House, HouseMember } from '../types';
import {
  IsoDate,
  WEEKDAY_ORDER,
  businessDateOf,
  dateOfWeekday,
  formatLongDate,
  isAfter,
  todayInBusinessTz,
  weekOf
} from '../domain/week';

export { WEEKDAY_ORDER, WEEKDAY_LABELS } from '../domain/week';

/**
 * TSK-402 / SPEC-015 + TSK-407/408 / SPEC-020: Camada de domínio do Registro de
 * Faxina (Item Central da Navbar). Cobre RN-09 (responsável, data, badges,
 * observações), RN-20 (qualquer membro pode registrar) e RN-19 (isolamento por
 * casa ativa). A data da faxina é a única fonte da verdade: dia da semana e
 * semana são sempre derivados dela.
 */

/** Limite de caracteres do campo Observações (SPEC-015 §3 Cenário 7). */
export const CLEANING_NOTES_MAX_LENGTH = 500;

export interface CleaningFormDraft {
  responsibleMemberId: string;
  cleaningDate: IsoDate;
  badgeIds: string[];
  notes: string;
}

/** Intervalo permitido para a data da faxina (RN-09 revisada). */
export interface CleaningDateBounds {
  today: IsoDate;
  minDate: IsoDate;
}

export type CleaningValidationErrorCode =
  | 'CLEANING_RESPONSIBLE_REQUIRED'
  | 'CLEANING_DATE_REQUIRED'
  | 'CLEANING_DATE_IN_FUTURE'
  | 'CLEANING_DATE_BEFORE_HOUSE'
  | 'CLEANING_MIN_BADGES'
  | 'CLEANING_BADGE_NOT_IN_HOUSE'
  | 'CLEANING_NOTES_TOO_LONG';

export type CleaningValidationResult =
  | { valid: true }
  | { valid: false; errorCode: CleaningValidationErrorCode; message: string };

/**
 * Datas permitidas: da criação da casa até hoje, ambas em Brasília. Se o relógio
 * do dispositivo estiver atrasado em relação à criação, o mínimo é hoje.
 */
export function cleaningDateBoundsFor(
  house: House,
  today: IsoDate = todayInBusinessTz()
): CleaningDateBounds {
  const created = businessDateOf(house.createdAt);
  return { today, minDate: isAfter(created, today) ? today : created };
}

/**
 * RN-09: estado inicial do formulário — responsável pré-selecionado com o
 * usuário autenticado (se membro da casa) e data de hoje.
 */
export function deriveCleaningFormState(
  members: HouseMember[],
  currentUserId: string,
  today: IsoDate
): CleaningFormDraft {
  const isMember = members.some((m) => m.userId === currentUserId);
  return {
    responsibleMemberId: isMember ? currentUserId : (members[0]?.userId ?? ''),
    cleaningDate: today,
    badgeIds: [],
    notes: ''
  };
}

export interface WeekdayChip {
  day: DayOfWeek;
  date: IsoDate;
  /** Dia do mês com 2 dígitos ("28"), pois a semana pode cruzar meses. */
  dayOfMonth: string;
  isToday: boolean;
  isFuture: boolean;
  isBeforeHouse: boolean;
}

/**
 * SPEC-020 Cenário 9: chips dom..sab da semana atual. Dias futuros e dias
 * anteriores à criação da casa (minDate) ficam indisponíveis (RN-09).
 */
export function deriveWeekdayChips(today: IsoDate, minDate?: IsoDate): WeekdayChip[] {
  const week = weekOf(today);
  return WEEKDAY_ORDER.map((day) => {
    const date = dateOfWeekday(day, week);
    return {
      day,
      date,
      dayOfMonth: date.slice(8, 10),
      isToday: date === today,
      isFuture: isAfter(date, today),
      isBeforeHouse: minDate !== undefined && isAfter(minDate, date)
    };
  });
}

/** SPEC-020 Cenário 11: descrição da data escolhida e da semana a que pertence. */
export function describeCleaningDate(
  date: IsoDate,
  today: IsoDate
): { longLabel: string; weekLabel: string; isCurrentWeek: boolean } {
  const week = weekOf(date);
  return {
    longLabel: formatLongDate(date),
    weekLabel: week.label,
    isCurrentWeek: week.start === weekOf(today).start
  };
}

function isValidDate(value: string): boolean {
  try {
    weekOf(value);
    return true;
  } catch {
    return false;
  }
}

/** SPEC-015 §3 Cenários 5-7 e SPEC-020 Cenários 10-12: validação contra a casa ativa. */
export function validateCleaningRegistration(
  draft: CleaningFormDraft,
  members: HouseMember[],
  badges: Badge[],
  bounds: CleaningDateBounds
): CleaningValidationResult {
  if (draft.responsibleMemberId && !members.some((m) => m.userId === draft.responsibleMemberId)) {
    return {
      valid: false,
      errorCode: 'CLEANING_RESPONSIBLE_REQUIRED',
      message: 'Selecione um responsável que seja membro vinculado à casa.'
    };
  }
  if (!draft.responsibleMemberId) {
    return {
      valid: false,
      errorCode: 'CLEANING_RESPONSIBLE_REQUIRED',
      message: 'Nenhum membro está vinculado à casa para ser o responsável.'
    };
  }
  if (!isValidDate(draft.cleaningDate)) {
    return {
      valid: false,
      errorCode: 'CLEANING_DATE_REQUIRED',
      message: 'Selecione a data em que a faxina foi realizada.'
    };
  }
  if (isAfter(draft.cleaningDate, bounds.today)) {
    return {
      valid: false,
      errorCode: 'CLEANING_DATE_IN_FUTURE',
      message: 'Não é possível registrar uma faxina em uma data futura.'
    };
  }
  if (isAfter(bounds.minDate, draft.cleaningDate)) {
    return {
      valid: false,
      errorCode: 'CLEANING_DATE_BEFORE_HOUSE',
      message: 'A data da faxina não pode ser anterior à criação da casa.'
    };
  }
  if (draft.badgeIds.length === 0) {
    return {
      valid: false,
      errorCode: 'CLEANING_MIN_BADGES',
      message: 'Selecione ao menos 1 tarefa (badge) realizada na faxina.'
    };
  }
  if (draft.notes.trim().length > CLEANING_NOTES_MAX_LENGTH) {
    return {
      valid: false,
      errorCode: 'CLEANING_NOTES_TOO_LONG',
      message: `As observações devem ter no máximo ${CLEANING_NOTES_MAX_LENGTH} caracteres.`
    };
  }
  const houseBadgeIds = new Set(badges.map((b) => b.id));
  const foreignBadge = draft.badgeIds.find((badgeId) => !houseBadgeIds.has(badgeId));
  if (foreignBadge) {
    return {
      valid: false,
      errorCode: 'CLEANING_BADGE_NOT_IN_HOUSE',
      message: 'Um dos badges selecionados não pertence à casa ativa.'
    };
  }
  return { valid: true };
}

export interface BuildCleaningRecordPayloadOptions {
  houseId: string;
  members: HouseMember[];
  registeredById: string;
  now?: Date;
}

/**
 * SPEC-015 §3 Cenário 4 / SPEC-020 §4.2: monta o payload `CleaningRecord` a
 * partir do formulário validado. Grava apenas a data civil da faxina.
 */
export function buildCleaningRecordPayload(
  draft: CleaningFormDraft,
  opts: BuildCleaningRecordPayloadOptions
): CleaningRecord {
  const now = opts.now ?? new Date();
  const responsible = opts.members.find((m) => m.userId === draft.responsibleMemberId);
  const trimmedNotes = draft.notes.trim();

  return {
    id: `cln-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    houseId: opts.houseId,
    userId: draft.responsibleMemberId,
    userName: responsible?.userName ?? draft.responsibleMemberId,
    registeredById: opts.registeredById,
    cleaningDate: draft.cleaningDate,
    badgeIds: [...draft.badgeIds],
    notes: trimmedNotes ? trimmedNotes : undefined,
    createdAt: now.toISOString()
  };
}
