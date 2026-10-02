import { describe, it, expect } from 'vitest';
import {
  buildCleaningCardView,
  deriveWeekContext,
  formatRecordCount,
  getInitials,
  resolveBadgeNames,
  visibleBadgeNames
} from './cleaningWeekView';
import type { Badge, CleaningRecord } from '../types';

// SPEC-017 / SPEC-020 — tela Início: semana vigente e cards
// (a consulta da semana no banco é coberta por src/integration/data.int.spec.ts)

const NOW = new Date('2026-10-01T13:00:00Z'); // quinta 01/10/2026, 10:00 em Brasília

const record = (badgeIds: string[], cleaningDate = '2026-09-28'): CleaningRecord => ({
  id: 'r1',
  houseId: 'h1',
  userId: 'u1',
  userName: 'Ana de Souza',
  registeredById: 'u1',
  cleaningDate,
  badgeIds,
  createdAt: '2026-10-01T13:00:00.000Z'
});

const badge = (id: string, name: string, deletedAt?: string): Badge => ({
  id,
  houseId: 'h1',
  name,
  isSystem: true,
  createdAt: 'c',
  deletedAt
});

describe('semana vigente', () => {
  it('semana 27/09 a 03/10 com título de setembro', () => {
    expect(deriveWeekContext(NOW)).toMatchObject({
      today: '2026-10-01',
      start: '2026-09-27',
      end: '2026-10-03',
      label: 'Semana 5 de Setembro de 2026'
    });
  });

  it('contador do resumo', () => {
    expect(formatRecordCount(0)).toBe('0 registradas');
    expect(formatRecordCount(1)).toBe('1 registrada');
    expect(formatRecordCount(3)).toBe('3 registradas');
  });
});

describe('card de faxina', () => {
  it('dia da semana e data derivados de cleaningDate', () => {
    const card = buildCleaningCardView(record([]), []);
    expect(card.weekdayLabel).toBe('Segunda-feira');
    expect(card.dateLabel).toBe('28/09');
  });

  it.each([
    ['Ana de Souza', 'AS'],
    ['Mariana', 'M'],
    ['Luiz Otávio dos Santos', 'LS'],
    ['  ', '?']
  ])('iniciais de "%s" → %s', (name, initials) => {
    expect(getInitials(name)).toBe(initials);
  });

  it('badge excluído continua nomeando a tarefa; referência inexistente é ignorada', () => {
    const badges = [badge('b1', 'Cozinha'), badge('b2', 'Lavanderia', '2026-09-30T10:00:00Z')];
    expect(resolveBadgeNames(record(['b1', 'b2', 'b-sumiu']), badges)).toEqual(['Cozinha', 'Lavanderia']);
  });

  it('mais de 2 tarefas: expansível, com as 2 primeiras visíveis ao recolher', () => {
    const badges = ['A', 'B', 'C', 'D'].map((name) => badge(name, name));
    const card = buildCleaningCardView(record(['A', 'B', 'C', 'D']), badges);
    expect(card).toMatchObject({ isExpandable: true, overflowCount: 2 });
    expect(visibleBadgeNames(card, false)).toEqual(['A', 'B']);
    expect(visibleBadgeNames(card, true)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('faxina sem tarefas (RN-14 revisada) não é expansível', () => {
    expect(buildCleaningCardView(record([]), [])).toMatchObject({ badgeNames: [], isExpandable: false, overflowCount: 0 });
  });
});
