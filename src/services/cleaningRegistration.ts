import { Badge, CleaningRecord, DayOfWeek, HouseMember } from '../types';

/**
 * TSK-402 / SPEC-015: Camada de domínio do Registro de Faxina (Item Central da Navbar).
 * Cobre RN-09 (responsável, dia da semana, badges, observações), RN-20 (qualquer
 * membro pode registrar) e RN-19 (isolamento por casa ativa). A persistência em
 * banco é responsabilidade da TSK-403; aqui são gerados a validação e o payload.
 */

/** Ordem canônica dos dias da semana (RN-07/RESTRIÇÃO de exibição: dom..sab). */
export const WEEKDAY_ORDER: DayOfWeek[] = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

/** Rótulos legíveis dos dias (ex.: "Quinta-feira") para exibição mobile. */
export const WEEKDAY_LABELS: Record<DayOfWeek, string> = {
  dom: 'Domingo',
  seg: 'Segunda-feira',
  ter: 'Terça-feira',
  qua: 'Quarta-feira',
  qui: 'Quinta-feira',
  sex: 'Sexta-feira',
  sab: 'Sábado'
};

/** Limite de caracteres do campo Observações (SPEC-015 §3 Cenário 7). */
export const CLEANING_NOTES_MAX_LENGTH = 500;

export interface CleaningFormDraft {
  responsibleMemberId: string;
  dayOfWeek: DayOfWeek;
  badgeIds: string[];
  notes: string;
}

export type CleaningValidationErrorCode =
  | 'CLEANING_RESPONSIBLE_REQUIRED'
  | 'CLEANING_DAY_REQUIRED'
  | 'CLEANING_MIN_BADGES'
  | 'CLEANING_BADGE_NOT_IN_HOUSE'
  | 'CLEANING_NOTES_TOO_LONG';

export type CleaningValidationResult =
  | { valid: true }
  | { valid: false; errorCode: CleaningValidationErrorCode; message: string };

/**
 * Dia da semana corrente a partir de uma data (RN-09: pré-seleção do dia atual).
 * JS getDay(): 0=Domingo .. 6=Sábado → index direto em WEEKDAY_ORDER.
 */
export function getTodayDayOfWeek(now: Date = new Date()): DayOfWeek {
  return WEEKDAY_ORDER[now.getDay()] ?? 'dom';
}

/**
 * RN-09 / SPEC-015 §3 Cenários 1 e 2: deriva o estado inicial do formulário —
 * responsável pré-selecionado com o usuário autenticado (se membro da casa) e
 * dia da semana pré-selecionado com o dia atual.
 */
export function deriveCleaningFormState(
  members: HouseMember[],
  currentUserId: string,
  now: Date = new Date()
): CleaningFormDraft {
  const isMember = members.some((m) => m.userId === currentUserId);
  return {
    responsibleMemberId: isMember ? currentUserId : (members[0]?.userId ?? ''),
    dayOfWeek: getTodayDayOfWeek(now),
    badgeIds: [],
    notes: ''
  };
}

/**
 * SPEC-015 §3 Cenários 5, 6 e 7: validação do formulário contra a casa ativa.
 */
export function validateCleaningRegistration(
  draft: CleaningFormDraft,
  members: HouseMember[],
  badges: Badge[]
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
  if (!WEEKDAY_ORDER.includes(draft.dayOfWeek)) {
    return {
      valid: false,
      errorCode: 'CLEANING_DAY_REQUIRED',
      message: 'Selecione o dia da semana em que a faxina foi realizada.'
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

/** Data real (AAA-MM-DD) do dia da semana selecionado na semana corrente. */
export function dateForWeekday(dayOfWeek: DayOfWeek, now: Date): Date {
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = WEEKDAY_ORDER.indexOf(dayOfWeek) - base.getDay();
  base.setDate(base.getDate() + diff);
  return base;
}

/** Formata uma data como AAAA-MM-DD usando componentes locais (evita deslocamento UTC). */
export function formatIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Metadados da semana do registro (domain-model §2.5): week 1..4 do mês,
 * mês 1..12 e ano. Regra determinística: teto(day/7) limitado a 4.
 */
export function computeRecordWeek(date: Date): { weekNumber: number; month: number; year: number } {
  const weekNumber = Math.max(1, Math.min(4, Math.ceil(date.getDate() / 7)));
  return { weekNumber, month: date.getMonth() + 1, year: date.getFullYear() };
}

export interface BuildCleaningRecordPayloadOptions {
  houseId: string;
  members: HouseMember[];
  registeredById: string;
  now?: Date;
}

/**
 * SPEC-015 §3 Cenário 4: monta o payload `CleaningRecord` completo a partir do
 * formulário validado. O objeto fica pronto para ser persistido pela TSK-403.
 */
export function buildCleaningRecordPayload(
  draft: CleaningFormDraft,
  opts: BuildCleaningRecordPayloadOptions
): CleaningRecord {
  const now = opts.now ?? new Date();
  const cleaningDate = dateForWeekday(draft.dayOfWeek, now);
  const { weekNumber, month, year } = computeRecordWeek(cleaningDate);
  const responsible = opts.members.find((m) => m.userId === draft.responsibleMemberId);
  const trimmedNotes = draft.notes.trim();

  return {
    id: `cln-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    houseId: opts.houseId,
    userId: draft.responsibleMemberId,
    userName: responsible?.userName ?? draft.responsibleMemberId,
    registeredById: opts.registeredById,
    dayOfWeek: draft.dayOfWeek,
    cleaningDate: formatIsoDate(cleaningDate),
    weekNumber,
    month,
    year,
    badgeIds: [...draft.badgeIds],
    notes: trimmedNotes ? trimmedNotes : undefined,
    createdAt: now.toISOString()
  };
}