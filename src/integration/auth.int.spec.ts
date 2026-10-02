import { describe, it, expect, afterAll, afterEach } from 'vitest';
import { requireSupabase } from '../lib/supabase';
import {
  getProfile,
  getSystemCapacity,
  requestPasswordReset,
  signIn,
  signOut,
  signUp,
  updatePassword
} from '../data/auth';
import { createUser, deleteUsers, followAuthLink, uniqueEmail, waitForAuthLink } from './helpers';

// SPEC-022 Cenários 5 a 10 — autenticação real contra o Supabase local

const supabase = requireSupabase();
const createdUserIds: string[] = [];

const currentUserId = async (): Promise<string | undefined> =>
  (await supabase.auth.getSession()).data.session?.user.id;

afterEach(async () => {
  await supabase.auth.signOut();
});

afterAll(async () => {
  await deleteUsers(createdUserIds);
});

describe('cadastro', () => {
  it('Cenário 5: cria a conta, já entra logado e o perfil usa o nome informado', async () => {
    const email = uniqueEmail('cadastro');
    await signUp('  Joana Prado  ', email, 'senha-123');

    const userId = await currentUserId();
    expect(userId).toBeDefined();
    createdUserIds.push(userId!);
    expect(await getProfile(userId!)).toMatchObject({ name: 'Joana Prado', email });
  });

  it('Cenário 6: e-mail já cadastrado', async () => {
    const email = uniqueEmail('repetido');
    createdUserIds.push(await createUser(email, 'senha-123', 'Já Existe'));

    await expect(signUp('Outra Pessoa', email, 'senha-456')).rejects.toMatchObject({
      code: 'EMAIL_ALREADY_EXISTS',
      message: 'Este e-mail já está cadastrado.'
    });
  });

  it('senha curta é recusada antes de chamar o servidor', async () => {
    await expect(signUp('Curta', uniqueEmail('curta'), '12345')).rejects.toMatchObject({ code: 'WEAK_PASSWORD' });
  });
});

describe('login e sessão', () => {
  it('Cenários 8 e 9: senha errada, login, sessão e logout', async () => {
    const email = uniqueEmail('login');
    const userId = await createUser(email, 'senha-certa', 'Login Teste');
    createdUserIds.push(userId);

    await expect(signIn(email, 'senha-errada')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
      message: 'E-mail ou senha incorretos.'
    });
    expect(await currentUserId()).toBeUndefined();

    await signIn(email, 'senha-certa');
    expect(await currentUserId()).toBe(userId);

    await signOut();
    expect(await currentUserId()).toBeUndefined();
  });

  it('não existe login sem senha', async () => {
    const email = uniqueEmail('sem-senha');
    createdUserIds.push(await createUser(email, 'senha-123', 'Sem Senha'));
    await expect(signIn(email, '')).rejects.toBeDefined();
    expect(await currentUserId()).toBeUndefined();
  });
});

describe('recuperação de senha', () => {
  it('Cenário 10: e-mail chega, o link abre sessão de recuperação e a nova senha funciona', async () => {
    const email = uniqueEmail('recupera');
    createdUserIds.push(await createUser(email, 'senha-antiga', 'Recupera Senha'));

    await requestPasswordReset(email, 'http://localhost:3000');
    const tokens = await followAuthLink(await waitForAuthLink(email));
    expect(tokens.type).toBe('recovery');

    const { error } = await supabase.auth.setSession({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken
    });
    expect(error).toBeNull();
    await updatePassword('senha-nova-123');
    await signOut();

    await expect(signIn(email, 'senha-antiga')).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    await signIn(email, 'senha-nova-123');
    expect(await currentUserId()).toBeDefined();
  });
});

describe('teto de 100 usuários', () => {
  const fillerIds: string[] = [];

  afterAll(async () => {
    await deleteUsers(fillerIds);
  });

  it('Cenário 7: com 100 contas, o cadastro é recusado com USERS_CAP_REACHED', async () => {
    const before = await getSystemCapacity();
    for (let i = before.totalUsers; i < before.maxUsers; i++) {
      fillerIds.push(await createUser(uniqueEmail(`carga${i}`), 'senha-123', `Carga ${i}`));
    }
    expect(await getSystemCapacity()).toMatchObject({ totalUsers: 100, isRegistrationAllowed: false });

    await expect(signUp('Excedente', uniqueEmail('excedente'), 'senha-123')).rejects.toMatchObject({
      code: 'USERS_CAP_REACHED'
    });
    expect((await getSystemCapacity()).totalUsers).toBe(100);
  }, 120_000);
});
