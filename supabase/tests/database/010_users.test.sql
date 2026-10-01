-- SPEC-021 Cenários 1 a 3: perfil automático e teto global de 100 usuários
begin;
select plan(13);

-- Cenário 1: perfil criado a partir do cadastro no Auth
select tests.create_user('ana@limpex.test', 'Ana Souza') as ana \gset
select tests.create_user('carlos@limpex.test', null, '{"full_name": "Carlos Google", "avatar_url": "https://foto"}') as carlos \gset
select tests.create_user('bia.lima@limpex.test') as bia \gset

select is((select name from public.users where id = :'ana'), 'Ana Souza', 'Cenário 1: nome vem dos metadados do cadastro');
select is((select email from public.users where id = :'ana'), 'ana@limpex.test', 'Cenário 1: e-mail copiado para o perfil');
select is((select name from public.users where id = :'carlos'), 'Carlos Google', 'Cenário 1: sem name, usa full_name (Google)');
select is((select avatar_url from public.users where id = :'carlos'), 'https://foto', 'Cenário 1: avatar do Google copiado');
select is((select name from public.users where id = :'bia'), 'bia.lima', 'Cenário 1: sem nome, usa o e-mail antes do @');

-- Cenário 3 (parte 1): com 99 contas o cadastro está liberado
select tests.create_user('carga' || g || '@limpex.test', 'Carga ' || g)
  from generate_series(1, 99 - (select count(*) from auth.users)::integer) g;

select tests.authenticate_as_anon();
select is(public.get_system_capacity() ->> 'is_registration_allowed', 'true', 'Cenário 3: com 99 contas, anon vê cadastro liberado');
select tests.clear_authentication();

-- Cenário 2: a 100ª entra, a 101ª é barrada sem deixar conta nem perfil
select tests.create_user('centesima@limpex.test', 'Centésima');
select is((select count(*)::integer from auth.users), 100, 'Cenário 2: 100 contas cadastradas');

select tests.authenticate_as_anon();
select is(public.get_system_capacity(), '{"total_users": 100, "max_users": 100, "is_registration_allowed": false}'::jsonb,
          'Cenário 3: com 100 contas, anon vê cadastro bloqueado');
select tests.clear_authentication();

select throws_ok($$ select tests.create_user('excedente@limpex.test', 'Excedente') $$,
                 'P0001', 'USERS_CAP_REACHED', 'Cenário 2: a 101ª conta é barrada no Auth');
select is((select count(*)::integer from auth.users), 100, 'Cenário 2: nenhuma conta extra criada');
select is((select count(*)::integer from public.users where email = 'excedente@limpex.test'), 0,
          'Cenário 2: nenhum perfil extra criado');

-- Visitante não lê perfis; usuário autenticado sem casa só vê o próprio
select tests.authenticate_as_anon();
select throws_ok($$ select count(*) from public.users $$, '42501', null, 'anon não lê a tabela de usuários');
select tests.clear_authentication();

select tests.authenticate_as(:'ana');
select is((select count(*)::integer from public.users), 1, 'usuário sem casa só vê o próprio perfil');
select tests.clear_authentication();

select * from finish();
rollback;
