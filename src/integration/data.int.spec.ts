import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { signIn, signOut } from '../data/auth';
import { createHouse, deleteHouse, getHouseMembers, getMyHouses, joinHouse } from '../data/houses';
import { activeBadges, createBadge, deleteBadge, getBadges, renameBadge } from '../data/badges';
import { createCleaning, getCleanings } from '../data/cleanings';
import { deriveWeekContext } from '../services/cleaningWeekView';
import { addDays } from '../domain/week';
import { admin, createUser, deleteUsers, uniqueEmail } from './helpers';

// SPEC-022 Cenários 12 a 16 — camada de dados do app contra o Supabase local,
// com usuários reais em sessões separadas (um de cada vez no mesmo cliente).

const PASSWORD = 'senha-teste-123';
const owner = { email: uniqueEmail('dona'), name: 'Dona Integração', id: '' };
const member = { email: uniqueEmail('membro'), name: 'Membro Integração', id: '' };
const outsider = { email: uniqueEmail('fora'), name: 'Pessoa de Fora', id: '' };

const as = async (user: { email: string }) => {
  await signOut();
  await signIn(user.email, PASSWORD);
};

const week = deriveWeekContext(new Date());
let houseId = '';
let inviteCode = '';

beforeAll(async () => {
  for (const user of [owner, member, outsider]) {
    user.id = await createUser(user.email, PASSWORD, user.name);
  }
});

afterAll(async () => {
  if (houseId) {
    await as(owner);
    await deleteHouse(houseId).catch(() => undefined);
  }
  await signOut();
  await deleteUsers([owner.id, member.id, outsider.id]);
});

describe('casas e membros (Cenário 12)', () => {
  it('criador cria a casa e não consegue criar outra', async () => {
    await as(owner);
    const house = await createHouse('Casa da Integração');
    houseId = house.id;
    inviteCode = house.inviteCode;

    expect((await getMyHouses()).map((h) => h.id)).toEqual([houseId]);
    await expect(createHouse('Segunda')).rejects.toMatchObject({
      code: 'HOUSE_LIMIT_REACHED',
      message: 'Você já é criador de uma casa. Cada usuário pode criar no máximo 1 casa.'
    });

    // Permite faxinas em semanas anteriores (casa "criada" há 30 dias)
    const { error } = await admin
      .from('houses')
      .update({ created_at: new Date(Date.now() - 30 * 86_400_000).toISOString() })
      .eq('id', houseId);
    expect(error).toBeNull();
  });

  it('membro entra pelo código (minúsculas) e vê os membros com nome e papel', async () => {
    await as(member);
    expect((await joinHouse(inviteCode.toLowerCase())).id).toBe(houseId);
    await expect(joinHouse(inviteCode)).rejects.toMatchObject({ code: 'ALREADY_MEMBER' });

    const members = await getHouseMembers(houseId);
    expect(members.map((m) => [m.userName, m.role])).toEqual([
      [owner.name, 'CREATOR'],
      [member.name, 'MEMBER']
    ]);
  });

  it('membro não exclui a casa', async () => {
    await as(member);
    await expect(deleteHouse(houseId)).rejects.toMatchObject({ code: 'NOT_HOUSE_OWNER' });
  });
});

describe('badges (Cenário 13)', () => {
  it('casa nasce com 14 badges; criador cria, renomeia e exclui; membro não gerencia', async () => {
    await as(owner);
    expect(await getBadges(houseId)).toHaveLength(14);

    const laundry = await createBadge(houseId, 'Lavanderia');
    expect((await renameBadge(laundry.id, 'Área de serviço')).name).toBe('Área de serviço');
    await expect(createBadge(houseId, 'cozinha')).rejects.toMatchObject({ code: 'BADGE_NAME_DUPLICATE' });

    await as(member);
    await expect(createBadge(houseId, 'Quintal')).rejects.toMatchObject({ code: 'NOT_HOUSE_OWNER' });

    await as(owner);
    await deleteBadge(laundry.id);
    const badges = await getBadges(houseId);
    expect(badges.find((b) => b.id === laundry.id)?.deletedAt).toBeDefined();
    expect(activeBadges(badges)).toHaveLength(14);
  });
});

describe('faxinas compartilhadas (Cenários 14 e 15)', () => {
  it('o membro registra; o criador vê a faxina com o nome do responsável e as tarefas', async () => {
    await as(member);
    const badges = await getBadges(houseId);
    const kitchen = badges.find((b) => b.name === 'Cozinha')!;
    const room = badges.find((b) => b.name === 'Sala')!;

    await createCleaning({
      houseId,
      responsibleId: member.id,
      cleaningDate: week.today,
      badgeIds: [kitchen.id, room.id],
      notes: 'Tudo certo'
    });
    // Semana anterior: não pode aparecer na consulta da semana atual
    await createCleaning({ houseId, responsibleId: member.id, cleaningDate: addDays(week.start, -3), badgeIds: [kitchen.id] });

    await as(owner);
    const cleanings = await getCleanings(houseId, { from: week.start, to: week.end });
    expect(cleanings).toHaveLength(1);
    expect(cleanings[0]).toMatchObject({
      userName: member.name,
      cleaningDate: week.today,
      notes: 'Tudo certo'
    });
    expect([...cleanings[0].badgeIds].sort()).toEqual([kitchen.id, room.id].sort());
  });

  it('data futura é recusada com mensagem em português', async () => {
    await as(member);
    const [anyBadge] = await getBadges(houseId);
    await expect(
      createCleaning({ houseId, responsibleId: member.id, cleaningDate: addDays(week.today, 1), badgeIds: [anyBadge.id] })
    ).rejects.toMatchObject({
      code: 'CLEANING_DATE_IN_FUTURE',
      message: 'Não é possível registrar uma faxina em uma data futura.'
    });
  });

  it('faxina cuja única tarefa foi excluída nesta semana aparece sem tarefas', async () => {
    await as(owner);
    const temporary = await createBadge(houseId, 'Temporária');

    await as(member);
    const record = await createCleaning({ houseId, responsibleId: member.id, cleaningDate: week.today, badgeIds: [temporary.id] });

    await as(owner);
    await deleteBadge(temporary.id);
    const cleanings = await getCleanings(houseId, { from: week.start, to: week.end });
    expect(cleanings.find((c) => c.id === record.id)?.badgeIds).toEqual([]);
  });
});

describe('isolamento (Cenário 16)', () => {
  it('quem não é membro não enxerga nada da casa', async () => {
    await as(outsider);
    expect(await getMyHouses()).toEqual([]);
    expect(await getBadges(houseId)).toEqual([]);
    expect(await getHouseMembers(houseId)).toEqual([]);
    expect(await getCleanings(houseId, { from: addDays(week.start, -30), to: week.end })).toEqual([]);
    await expect(createCleaning({ houseId, responsibleId: outsider.id, cleaningDate: week.today, badgeIds: [] })).rejects.toMatchObject({
      code: 'CLEANING_MEMBERSHIP_REQUIRED'
    });
  });
});
