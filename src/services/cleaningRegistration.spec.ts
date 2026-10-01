import { describe, it, expect } from 'vitest';
import type { Badge, House, HouseMember } from '../types';
import {
  buildCleaningRecordPayload,
  cleaningDateBoundsFor,
  CleaningFormDraft,
  deriveCleaningFormState,
  deriveWeekdayChips,
  describeCleaningDate,
  validateCleaningRegistration
} from './cleaningRegistration';

// SPEC-020 — data da faxina (RN-09 revisada), Cenários 9 a 12

const TODAY = '2026-10-01'; // quinta-feira
const bounds = { today: TODAY, minDate: '2026-09-01' };

const house: House = {
  id: 'h1',
  name: 'Casa',
  inviteCode: 'ABC234',
  creatorId: 'u1',
  createdAt: '2026-09-01T15:00:00.000Z',
  updatedAt: '2026-09-01T15:00:00.000Z'
};
const members: HouseMember[] = [
  { id: 'm1', houseId: 'h1', userId: 'u1', userName: 'Ana Souza', userEmail: '', role: 'CREATOR', joinedAt: '' },
  { id: 'm2', houseId: 'h1', userId: 'u2', userName: 'Bruno Lima', userEmail: '', role: 'MEMBER', joinedAt: '' }
];
const badges: Badge[] = [{ id: 'b1', houseId: 'h1', name: 'Cozinha', isSystem: true, createdAt: '' }];

const draft = (overrides: Partial<CleaningFormDraft> = {}): CleaningFormDraft => ({
  responsibleMemberId: 'u1',
  cleaningDate: TODAY,
  badgeIds: ['b1'],
  notes: '',
  ...overrides
});

describe('deriveCleaningFormState — SPEC-015 Cenários 1 e 2', () => {
  it('pré-seleciona o usuário logado e a data de hoje', () => {
    expect(deriveCleaningFormState(members, 'u2', TODAY)).toEqual({
      responsibleMemberId: 'u2',
      cleaningDate: TODAY,
      badgeIds: [],
      notes: ''
    });
  });

  it('usuário que não é membro → cai para o primeiro membro da casa', () => {
    expect(deriveCleaningFormState(members, 'u-fora', TODAY).responsibleMemberId).toBe('u1');
  });

  it('casa sem membros → responsável vazio', () => {
    expect(deriveCleaningFormState([], 'u1', TODAY).responsibleMemberId).toBe('');
  });
});

describe('validateCleaningRegistration — SPEC-015 Cenários 5 a 8', () => {
  it('Cenário 5: rejeita registro sem badges', () => {
    expect(validateCleaningRegistration(draft({ badgeIds: [] }), members, badges, bounds)).toMatchObject({
      valid: false,
      errorCode: 'CLEANING_MIN_BADGES'
    });
  });

  it.each([
    ['vazio', ''],
    ['fora da casa', 'u-fora']
  ])('Cenário 6: rejeita responsável %s', (_case, responsibleMemberId) => {
    expect(validateCleaningRegistration(draft({ responsibleMemberId }), members, badges, bounds)).toMatchObject({
      valid: false,
      errorCode: 'CLEANING_RESPONSIBLE_REQUIRED'
    });
  });

  it('Cenário 7: rejeita observações acima de 500 caracteres e aceita exatamente 500', () => {
    expect(validateCleaningRegistration(draft({ notes: 'x'.repeat(501) }), members, badges, bounds)).toMatchObject({
      valid: false,
      errorCode: 'CLEANING_NOTES_TOO_LONG'
    });
    expect(validateCleaningRegistration(draft({ notes: 'x'.repeat(500) }), members, badges, bounds)).toEqual({
      valid: true
    });
  });

  it('Cenário 8: rejeita badge de outra casa (RN-19)', () => {
    expect(
      validateCleaningRegistration(draft({ badgeIds: ['b1', 'b-outra-casa'] }), members, badges, bounds)
    ).toMatchObject({ valid: false, errorCode: 'CLEANING_BADGE_NOT_IN_HOUSE' });
  });
});

describe('deriveWeekdayChips — Cenário 9', () => {
  const chips = deriveWeekdayChips(TODAY);

  it('mostra os 7 dias da semana atual com o dia do mês', () => {
    expect(chips.map((c) => `${c.day} ${c.dayOfMonth}`)).toEqual([
      'dom 27', 'seg 28', 'ter 29', 'qua 30', 'qui 01', 'sex 02', 'sab 03'
    ]);
  });

  it('marca hoje e desabilita os dias futuros', () => {
    expect(chips.filter((c) => c.isToday).map((c) => c.date)).toEqual(['2026-10-01']);
    expect(chips.filter((c) => c.isFuture).map((c) => c.day)).toEqual(['sex', 'sab']);
  });

  it('o chip de segunda corresponde a 28/09/2026', () => {
    expect(chips.find((c) => c.day === 'seg')?.date).toBe('2026-09-28');
  });

  it('dias anteriores à criação da casa também ficam indisponíveis', () => {
    const fromTuesday = deriveWeekdayChips(TODAY, '2026-09-29');
    expect(fromTuesday.filter((c) => c.isBeforeHouse).map((c) => c.day)).toEqual(['dom', 'seg']);
    expect(chips.some((c) => c.isBeforeHouse)).toBe(false);
  });
});

describe('validateCleaningRegistration — datas', () => {
  it('aceita hoje e a data mínima (criação da casa)', () => {
    expect(validateCleaningRegistration(draft(), members, badges, bounds)).toEqual({ valid: true });
    expect(validateCleaningRegistration(draft({ cleaningDate: '2026-09-01' }), members, badges, bounds)).toEqual({
      valid: true
    });
  });

  it('Cenário 10: rejeita data futura', () => {
    const result = validateCleaningRegistration(draft({ cleaningDate: '2026-10-02' }), members, badges, bounds);
    expect(result).toMatchObject({ valid: false, errorCode: 'CLEANING_DATE_IN_FUTURE' });
  });

  it('Cenário 12: rejeita data anterior à criação da casa', () => {
    const result = validateCleaningRegistration(draft({ cleaningDate: '2026-08-31' }), members, badges, bounds);
    expect(result).toMatchObject({ valid: false, errorCode: 'CLEANING_DATE_BEFORE_HOUSE' });
  });

  it.each(['', '2026-13-01', '01/10/2026'])('rejeita data vazia ou inválida (%j)', (cleaningDate) => {
    const result = validateCleaningRegistration(draft({ cleaningDate }), members, badges, bounds);
    expect(result).toMatchObject({ valid: false, errorCode: 'CLEANING_DATE_REQUIRED' });
  });
});

describe('cleaningDateBoundsFor', () => {
  it('vai da criação da casa (em Brasília) até hoje', () => {
    const lateHouse = { ...house, createdAt: '2026-09-01T02:00:00.000Z' }; // 31/08 23:00 em Brasília
    expect(cleaningDateBoundsFor(lateHouse, TODAY)).toEqual({ today: TODAY, minDate: '2026-08-31' });
  });

  it('casa criada "depois" de hoje (relógio atrasado) → mínimo é hoje', () => {
    const futureHouse = { ...house, createdAt: '2026-10-05T12:00:00.000Z' };
    expect(cleaningDateBoundsFor(futureHouse, TODAY)).toEqual({ today: TODAY, minDate: TODAY });
  });
});

describe('buildCleaningRecordPayload', () => {
  it('grava apenas a data civil, sem campos derivados', () => {
    const payload = buildCleaningRecordPayload(draft({ cleaningDate: '2026-09-28', notes: '  ok  ' }), {
      houseId: 'h1',
      members,
      registeredById: 'u2',
      now: new Date('2026-10-01T13:00:00Z')
    });
    expect(payload).toMatchObject({
      houseId: 'h1',
      userId: 'u1',
      userName: 'Ana Souza',
      registeredById: 'u2',
      cleaningDate: '2026-09-28',
      badgeIds: ['b1'],
      notes: 'ok',
      createdAt: '2026-10-01T13:00:00.000Z'
    });
    for (const removed of ['dayOfWeek', 'weekNumber', 'month', 'year']) {
      expect(payload).not.toHaveProperty(removed);
    }
  });

  it('observações vazias viram undefined e cada payload tem id único', () => {
    const opts = { houseId: 'h1', members, registeredById: 'u1' };
    const a = buildCleaningRecordPayload(draft({ notes: '   ' }), opts);
    const b = buildCleaningRecordPayload(draft(), opts);
    expect(a.notes).toBeUndefined();
    expect(a.id).not.toBe(b.id);
  });
});

describe('describeCleaningDate — Cenário 11', () => {
  it('data de semana anterior: rótulo longo, semana e aviso', () => {
    expect(describeCleaningDate('2026-09-10', TODAY)).toEqual({
      longLabel: 'Quinta-feira, 10/09/2026',
      weekLabel: 'Semana 2 de Setembro de 2026',
      isCurrentWeek: false
    });
  });

  it('data da semana atual, mesmo em outro mês', () => {
    expect(describeCleaningDate('2026-09-28', TODAY)).toMatchObject({
      weekLabel: 'Semana 5 de Setembro de 2026',
      isCurrentWeek: true
    });
  });
});
