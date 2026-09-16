import { dbService } from '../services/supabase';
import { Badge, CleaningRecord, HouseMember } from '../types';
import {
  WEEKDAY_ORDER,
  WEEKDAY_LABELS,
  CLEANING_NOTES_MAX_LENGTH,
  CleaningFormDraft,
  deriveCleaningFormState,
  getTodayDayOfWeek,
  computeRecordWeek,
  validateCleaningRegistration,
  buildCleaningRecordPayload,
  dateForWeekday,
  formatIsoDate
} from '../services/cleaningRegistration';

/**
 * Teste Automatizado de Domínio: Registro de Faxina (TSK-402 / SPEC-015)
 * Valida os Cenários 1 a 8 da SPEC-015 sobre a camada de domínio:
 *  - Cenário 1: responsável pré-selecionado com o usuário autenticado (RN-09).
 *  - Cenário 2: dia da semana pré-selecionado com o dia atual (RN-09).
 *  - Cenário 3: seleção múltipla de badges da casa ativa (RN-19/isolação).
 *  - Cenário 4: registro válido gera payload CleaningRecord coerente.
 *  - Cenário 5: rejeição sem badges (CLEANING_MIN_BADGES).
 *  - Cenário 6: rejeição sem responsável (CLEANING_RESPONSIBLE_REQUIRED).
 *  - Cenário 7: rejeição de observações longas (CLEANING_NOTES_TOO_LONG).
 *  - Cenário 8: bloco de validação de dia inválido e badge de outra casa.
 */
export async function runCleaningRegistrationSimulationTest(): Promise<{
  passed: boolean;
  totalTested: number;
  message: string;
  details: Record<string, any>;
}> {
  const USER_CREATOR = 'usr-tsk402-creator';
  const USER_MEMBER = 'usr-tsk402-member';
  const LOCAL_STORAGE_KEY_HOUSES = 'limpex_mock_houses';
  const LOCAL_STORAGE_KEY_HOUSE_MEMBERS = 'limpex_mock_house_members';
  const LOCAL_STORAGE_KEY_BADGES = 'limpex_mock_badges';

  // 1. Ambiente isolado
  localStorage.setItem(LOCAL_STORAGE_KEY_HOUSES, JSON.stringify([]));
  localStorage.setItem(LOCAL_STORAGE_KEY_HOUSE_MEMBERS, JSON.stringify([]));
  localStorage.setItem(LOCAL_STORAGE_KEY_BADGES, JSON.stringify([]));

  // 2. Criar casa (criador) e vincular um segundo membro via código de convite
  const createHouse = await dbService.createHouse(
    'Casa Faxina Test',
    USER_CREATOR,
    'Criador Teste',
    'criador@teste.com'
  );
  if (!createHouse.success || !createHouse.house) {
    return { passed: false, totalTested: 1, message: `Falha ao criar a casa: ${createHouse.error}`, details: { createHouse } };
  }
  const house = createHouse.house;

  const joinRes = await dbService.joinHouseByInviteCode(
    house.inviteCode,
    USER_MEMBER,
    'Membro Teste',
    'membro@teste.com'
  );
  if (!joinRes.success) {
    return { passed: false, totalTested: 2, message: `Falha ao vincular membro: ${joinRes.error}`, details: { joinRes } };
  }

  const members: HouseMember[] = await dbService.getHouseMembers(house.id);
  if (members.length !== 2) {
    return { passed: false, totalTested: 3, message: 'A casa deveria ter 2 membros vinculados', details: { members } };
  }

  const badges: Badge[] = await dbService.getHouseBadges(house.id);
  if (badges.length === 0) {
    return { passed: false, totalTested: 4, message: 'A casa deveria ter badges seedados (TSK-301)', details: { badges } };
  }

  // --- Cenário 8a: getTodayDayOfWeek mapeia domingo(0) a sábado(6) -------------
  const anchorSunday = new Date(2026, 0, 4); // 4 de jan/2026 é domingo
  if (anchorSunday.getDay() !== 0) {
    return { passed: false, totalTested: 5, message: 'Datas de referência incorretas no teste', details: { anchorSunday } };
  }
  for (let i = 0; i < WEEKDAY_ORDER.length; i++) {
    const date = new Date(2026, 0, 4 + i);
    const expected = WEEKDAY_ORDER[i];
    const actual = getTodayDayOfWeek(date);
    if (actual !== expected) {
      return {
        passed: false,
        totalTested: 5 + i,
        message: `getTodayDayOfWeek deveria retornar '${expected}' para a data ${date.toDateString()} (obteve '${actual}')`,
        details: { expected, actual }
      };
    }
  }
  let tested = 5 + WEEKDAY_ORDER.length;

  // --- Cenário 1: responsável pré-selecionado com o usuário autenticado --------
  const now = new Date(2026, 0, 8); // quinta-feira
  const draft1 = deriveCleaningFormState(members, USER_CREATOR, now);
  tested += 1;
  if (draft1.responsibleMemberId !== USER_CREATOR) {
    return {
      passed: false,
      totalTested: tested,
      message: 'Cenário 1: responsável deveria ser pré-selecionado com o usuário autenticado',
      details: { draft: draft1 }
    };
  }

  // --- Cenário 2: dia pré-selecionado com o dia atual --------------------------
  tested += 1;
  if (draft1.dayOfWeek !== 'qui') {
    return {
      passed: false,
      totalTested: tested,
      message: `Cenário 2: dia deveria ser 'qui' (quinta-feira) para esta data (obteve '${draft1.dayOfWeek}')`,
      details: { draft: draft1, now: now.toDateString() }
    };
  }

  // Responsável vira o membro quando o usuário logado não é da casa
  tested += 1;
  const draft1b = deriveCleaningFormState(members, 'usr-externo', now);
  if (draft1b.responsibleMemberId !== members[0].userId) {
    return {
      passed: false,
      totalTested: tested,
      message: 'Cenário 1b: responsável deveria cair para o primeiro membro disponível',
      details: { draft: draft1b }
    };
  }

  // --- Cenário 5: rejeição sem badges selecionados ------------------------------
  const draftNoBadges: CleaningFormDraft = { responsibleMemberId: USER_CREATOR, dayOfWeek: 'qui', badgeIds: [], notes: '' };
  tested += 1;
  const vNoBadges = validateCleaningRegistration(draftNoBadges, members, badges);
  if (vNoBadges.valid || vNoBadges.errorCode !== 'CLEANING_MIN_BADGES') {
    return {
      passed: false,
      totalTested: tested,
      message: 'Cenário 5: registro sem badges deveria ser rejeitado com CLEANING_MIN_BADGES',
      details: { vNoBadges }
    };
  }

  // --- Cenário 6: responsável ausente -------------------------------------------
  tested += 1;
  const vNoResponsible = validateCleaningRegistration(
    { responsibleMemberId: '', dayOfWeek: 'qui', badgeIds: [badges[0].id], notes: '' },
    members,
    badges
  );
  if (vNoResponsible.valid || vNoResponsible.errorCode !== 'CLEANING_RESPONSIBLE_REQUIRED') {
    return {
      passed: false,
      totalTested: tested,
      message: 'Cenário 6: responsável vazio deveria ser rejeitado com CLEANING_RESPONSIBLE_REQUIRED',
      details: { vNoResponsible }
    };
  }

  tested += 1;
  const vForeignResponsible = validateCleaningRegistration(
    { responsibleMemberId: 'usr-fora', dayOfWeek: 'qui', badgeIds: [badges[0].id], notes: '' },
    members,
    badges
  );
  if (vForeignResponsible.valid || vForeignResponsible.errorCode !== 'CLEANING_RESPONSIBLE_REQUIRED') {
    return {
      passed: false,
      totalTested: tested,
      message: 'Cenário 6b: responsável fora da casa deveria ser rejeitado',
      details: { vForeignResponsible }
    };
  }

  // --- Cenário 8b: dia inválido ---------------------------------------------------
  tested += 1;
  const vBadDay = validateCleaningRegistration(
    { responsibleMemberId: USER_CREATOR, dayOfWeek: 'foo' as any, badgeIds: [badges[0].id], notes: '' },
    members,
    badges
  );
  if (vBadDay.valid || vBadDay.errorCode !== 'CLEANING_DAY_REQUIRED') {
    return {
      passed: false,
      totalTested: tested,
      message: 'Cenário 8b: dia inválido deveria ser rejeitado com CLEANING_DAY_REQUIRED',
      details: { vBadDay }
    };
  }

  // --- Cenário 8c: badge de outra casa é rejeitado (RN-19/isolação) --------------
  tested += 1;
  const foreignBadgeId = 'bdg-fora-da-casa-xyz';
  const vForeignBadge = validateCleaningRegistration(
    { responsibleMemberId: USER_CREATOR, dayOfWeek: 'qui', badgeIds: [badges[0].id, foreignBadgeId], notes: '' },
    members,
    badges
  );
  if (vForeignBadge.valid || vForeignBadge.errorCode !== 'CLEANING_BADGE_NOT_IN_HOUSE') {
    return {
      passed: false,
      totalTested: tested,
      message: 'Cenário 8c: badge de outra casa deveria ser rejeitado com CLEANING_BADGE_NOT_IN_HOUSE',
      details: { vForeignBadge }
    };
  }

  // --- Cenário 7: observações muito longas ----------------------------------------
  tested += 1;
  const longNotes = 'x'.repeat(CLEANING_NOTES_MAX_LENGTH + 1);
  const vLongNotes = validateCleaningRegistration(
    { responsibleMemberId: USER_CREATOR, dayOfWeek: 'qui', badgeIds: [badges[0].id], notes: longNotes },
    members,
    badges
  );
  if (vLongNotes.valid || vLongNotes.errorCode !== 'CLEANING_NOTES_TOO_LONG') {
    return {
      passed: false,
      totalTested: tested,
      message: `Cenário 7: observações com ${CLEANING_NOTES_MAX_LENGTH + 1} caracteres deveriam ser rejeitadas`,
      details: { len: longNotes.length }
    };
  }

  // --- Cenário 4: registro válido gera payload CleaningRecord coerente ----------
  tested += 1;
  const draftValid: CleaningFormDraft = {
    responsibleMemberId: USER_MEMBER,
    dayOfWeek: 'sex',
    badgeIds: [badges[0].id, badges[1].id],
    notes: '  Usou desinfetante especial no piso  '
  };
  const vValid = validateCleaningRegistration(draftValid, members, badges);
  if (!vValid.valid) {
    return { passed: false, totalTested: tested, message: `Cenário 4: registro válido deveria passar — ${vValid.message}`, details: { vValid } };
  }

  const payload: CleaningRecord = buildCleaningRecordPayload(draftValid, {
    houseId: house.id,
    members,
    registeredById: USER_CREATOR,
    now
  });

  const checks: Array<[boolean, string]> = [
    [payload.houseId === house.id, 'houseId deve ser o da casa ativa'],
    [payload.userId === USER_MEMBER, 'userId deve ser o responsável selecionado'],
    [payload.userName === 'Membro Teste', 'userName deve ser resolvido do membro'],
    [payload.registeredById === USER_CREATOR, 'registeredById deve ser o usuário logado'],
    [payload.dayOfWeek === 'sex', 'dayOfWeek deve refletir o dia selecionado'],
    [payload.cleaningDate === formatIsoDate(dateForWeekday('sex', now)), 'cleaningDate deve ser o dia real da semana corrente'],
    [payload.month === 1 && payload.year === 2026, 'mês/ano devem ser derivados da data real'],
    [payload.weekNumber >= 1 && payload.weekNumber <= 4, 'weekNumber deve estar entre 1 e 4'],
    [payload.badgeIds.length === 2 && payload.badgeIds.includes(badges[0].id) && payload.badgeIds.includes(badges[1].id), 'badgeIds deve refletir a seleção múltipla'],
    [payload.notes === 'Usou desinfetante especial no piso', 'notas devem ser trim()'],
    [Boolean(payload.id) && Boolean(payload.createdAt), 'id/createdAt devem ser gerados']
  ];

  for (const [ok, describe] of checks) {
    tested += 1;
    if (!ok) {
      return { passed: false, totalTested: tested, message: `Cenário 4: ${describe}`, details: { payload } };
    }
  }

  // Observações vazias → notes indefinido
  tested += 1;
  const payloadNoNotes = buildCleaningRecordPayload(
    { ...draftValid, notes: '   ' },
    { houseId: house.id, members, registeredById: USER_CREATOR, now }
  );
  if (payloadNoNotes.notes !== undefined) {
    return { passed: false, totalTested: tested, message: 'Cenário 4b: notas vazias deveriam gerar notes undefined', details: { payloadNoNotes } };
  }

  // --- Cenário 4c: computeRecordWeek com clamp em 4 ------------------------------
  tested += 1;
  const weekLate = computeRecordWeek(new Date(2026, 8, 30));
  if (weekLate.weekNumber !== 4 || weekLate.month !== 9 || weekLate.year !== 2026) {
    return { passed: false, totalTested: tested, message: 'Semana tardia deveria ser clamped para 4', details: { weekLate } };
  }

  tested += 1;
  const weekEarly = computeRecordWeek(new Date(2026, 8, 1));
  if (weekEarly.weekNumber !== 1) {
    return { passed: false, totalTested: tested, message: 'Dia 1 deveria pertencer à semana 1', details: { weekEarly } };
  }

  // --- Sanidade: WEEKDAY_LABELS preenchidos para todos os dias -------------------
  tested += 1;
  const missingLabel = WEEKDAY_ORDER.find((d) => !WEEKDAY_LABELS[d]);
  if (missingLabel) {
    return { passed: false, totalTested: tested, message: `Faltando rótulo legível para o dia '${missingLabel}'`, details: { WEEKDAY_LABELS } };
  }

  return {
    passed: true,
    totalTested: tested,
    message:
      `SUCESSO: Registro de Faxina (TSK-402 / SPEC-015) — ${tested} verificações: responsável pré-selecionado ` +
      `(RN-09), dia atual pré-selecionado com getTodayDayOfWeek, validação ` +
      `(CLEANING_MIN_BADGES, CLEANING_RESPONSIBLE_REQUIRED, CLEANING_DAY_REQUIRED, ` +
      `CLEANING_BADGE_NOT_IN_HOUSE com isolamento RN-19, CLEANING_NOTES_TOO_LONG), ` +
      `payload CleaningRecord coerente (houseId/userId/userName/registeredById/dia/data/metadados de ` +
      `semana/badges/notas) e computeRecordWeek com clamp 1..4.`,
    details: {
      casa: house.name,
      membros: members.map((m) => ({ id: m.userId, name: m.userName })),
      badgesDisponiveis: badges.length,
      payload: {
        dayOfWeek: payload.dayOfWeek,
        cleaningDate: payload.cleaningDate,
        weekNumber: payload.weekNumber,
        month: payload.month,
        year: payload.year,
        user: payload.userName
      },
      validacoes: {
        minBadges: true,
        responsibleRequired: true,
        dayRequired: true,
        badgeNotInHouse: true,
        notesTooLong: true
      }
    }
  };
}

export async function runCleaningRegistrationIntegrationTest(): Promise<{
  passed: boolean;
  totalTested: number;
  message: string;
  details: Record<string, any>;
}> {
  // Integração com dbService: membros e badges reais da casa ativa fluem para a camada
  return runCleaningRegistrationSimulationTest();
}