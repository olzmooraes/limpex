-- SPEC-021 Cenários 4 a 11: casas, convites, isolamento, saída e remoção de membros
begin;
select plan(38);

select tests.create_user('dona@limpex.test', 'Dona Casa') as owner \gset
select tests.create_user('membro@limpex.test', 'Membro Um') as member \gset
select tests.create_user('membro2@limpex.test', 'Membro Dois') as member2 \gset
select tests.create_user('fora@limpex.test', 'Pessoa Fora') as outsider \gset
select tests.create_user('estranho@limpex.test', 'Estranho') as stranger \gset
select public.business_today() as today \gset

-- Cenário 4: criar casa
select tests.authenticate_as(:'owner');
select id as house, invite_code as code from public.create_house('  Ap 402  ') \gset
select tests.clear_authentication();

select is((select name from public.houses where id = :'house'), 'Ap 402', 'Cenário 4: nome gravado sem espaços nas pontas');
select matches(:'code'::text, '^[A-HJ-NP-Z2-9]{6}$', 'Cenário 4: código com 6 caracteres sem ambíguos');
select is((select role from public.house_members where house_id = :'house' and user_id = :'owner'), 'CREATOR',
          'Cenário 4: criador vinculado como CREATOR');
select is(
    (select array_agg(name order by display_order) from public.badges where house_id = :'house'),
    array['Janelas', 'Portas', 'Quarto 1', 'Quarto 2', 'Quarto 3', 'Banheiro', 'Varanda',
          'Cozinha', 'Sala', 'Casa completa', 'Garagem', 'Calçada', 'Área gourmet', 'Mobília'],
    'Cenário 4: 14 badges do sistema na ordem da RN-10');
select ok((select bool_and(is_system) from public.badges where house_id = :'house'), 'Cenário 4: todos marcados como sistema');

-- Cenário 5: segunda casa e nome inválido
select tests.authenticate_as(:'owner');
select throws_ok($$ select public.create_house('Outra casa') $$, 'P0001', 'HOUSE_LIMIT_REACHED', 'Cenário 5: segunda casa é recusada');
select throws_ok($$ select public.create_house('   ') $$, 'P0001', 'HOUSE_NAME_INVALID', 'Cenário 5: nome vazio é recusado');
select tests.clear_authentication();

-- Cenário 6: entrar por convite
select tests.authenticate_as(:'member');
select is((select id from public.join_house(lower(' ' || :'code' || ' '))), :'house'::uuid,
          'Cenário 6: entra com o código em minúsculas e com espaços');
select throws_ok(format('select public.join_house(%L)', :'code'), 'P0001', 'ALREADY_MEMBER', 'Cenário 6: entrar de novo é recusado');
select throws_ok($$ select public.join_house('ABC') $$, 'P0001', 'INVALID_INVITE_CODE', 'Cenário 6: código inexistente é recusado');
select id as first_badge from public.badges where house_id = :'house' order by display_order limit 1 \gset
select id as cleaning from public.create_cleaning(:'house', :'member', :'today', array[:'first_badge'::uuid]) \gset
select tests.clear_authentication();

select is((select role from public.house_members where house_id = :'house' and user_id = :'member'), 'MEMBER',
          'Cenário 6: vinculado como MEMBER');

-- Cenário 7: isolamento sem recursão de RLS
select tests.authenticate_as(:'outsider');
select is((select count(*)::integer from public.houses), 0, 'Cenário 7: não membro não vê a casa');
select is((select count(*)::integer from public.house_members), 0, 'Cenário 7: não membro não vê os membros');
select is((select count(*)::integer from public.badges), 0, 'Cenário 7: não membro não vê os badges');
select is((select count(*)::integer from public.cleaning_records), 0, 'Cenário 7: não membro não vê as faxinas');
select is((select count(*)::integer from public.cleaning_badges), 0, 'Cenário 7: não membro não vê os vínculos');
select tests.clear_authentication();

select tests.authenticate_as(:'member');
select is((select count(*)::integer from public.houses), 1, 'Cenário 7: membro lê a casa sem erro de recursão');
select is((select count(*)::integer from public.users), 2, 'Cenário 7: membro vê os perfis de quem divide a casa');

-- Cenário 8: o membro sai; o criador não pode sair
select lives_ok(format('select public.leave_house(%L)', :'house'), 'Cenário 8: membro sai da casa');
select is((select count(*)::integer from public.houses), 0, 'Cenário 8: ex-membro não vê mais a casa');
select tests.clear_authentication();

select tests.authenticate_as(:'owner');
select throws_ok(format('select public.leave_house(%L)', :'house'), 'P0001', 'CREATOR_CANNOT_LEAVE', 'Cenário 8: criador não pode sair');
select is((select responsible_name from public.cleaning_records where id = :'cleaning'), 'Membro Um',
          'Cenário 8: faxina do ex-membro continua visível com o nome');
select tests.clear_authentication();

select is((select user_id from public.exclusion_logs where entity_type = 'MEMBER' and metadata ->> 'action' = 'LEAVE'),
          :'member'::uuid, 'Cenário 8: log MEMBER/LEAVE com o próprio membro como autor');

-- Cenário 9: remoção de membro
select tests.authenticate_as(:'member');
select public.join_house(:'code');
select tests.clear_authentication();
select tests.authenticate_as(:'member2');
select public.join_house(:'code');
select throws_ok(format('select public.remove_member(%L, %L)', :'house', :'member'), 'P0001', 'NOT_HOUSE_OWNER',
                 'Cenário 9: membro comum não remove ninguém');
select tests.clear_authentication();

select tests.authenticate_as(:'owner');
select lives_ok(format('select public.remove_member(%L, %L)', :'house', :'member'), 'Cenário 9: criador remove o membro');
select throws_ok(format('select public.remove_member(%L, %L)', :'house', :'owner'), 'P0001', 'CANNOT_REMOVE_CREATOR',
                 'Cenário 9: criador não pode ser removido');
select throws_ok(format('select public.remove_member(%L, %L)', :'house', :'stranger'), 'P0001', 'MEMBER_NOT_FOUND',
                 'Cenário 9: remover quem não é membro');
select tests.clear_authentication();

select is(
    (select row(user_id, entity_id, entity_name)::text from public.exclusion_logs
      where entity_type = 'MEMBER' and metadata ->> 'action' = 'REMOVE'),
    row(:'owner'::uuid, :'member'::uuid, 'Membro Um')::text,
    'Cenário 9: log MEMBER/REMOVE com o criador como autor e o membro removido');

-- Cenário 10: novo código de convite
select tests.authenticate_as(:'member2');
select throws_ok(format('select public.regenerate_invite_code(%L)', :'house'), 'P0001', 'NOT_HOUSE_OWNER',
                 'Cenário 10: membro comum não gera novo código');
select tests.clear_authentication();

select tests.authenticate_as(:'owner');
select public.regenerate_invite_code(:'house') as new_code \gset
select tests.clear_authentication();

select isnt(:'new_code'::text, :'code'::text, 'Cenário 10: o código mudou');
select tests.authenticate_as(:'outsider');
select throws_ok(format('select public.join_house(%L)', :'code'), 'P0001', 'INVALID_INVITE_CODE', 'Cenário 10: código antigo não funciona');
select lives_ok(format('select public.join_house(%L)', :'new_code'), 'Cenário 10: código novo funciona');
select tests.clear_authentication();

-- Cenário 11: exclusão da casa
select tests.authenticate_as(:'member2');
select throws_ok(format('select public.delete_house(%L)', :'house'), 'P0001', 'NOT_HOUSE_OWNER', 'Cenário 11: membro comum não exclui a casa');
select tests.clear_authentication();
select tests.authenticate_as(:'stranger');
select throws_ok(format('select public.delete_house(%L)', :'house'), 'P0001', 'HOUSE_NOT_FOUND', 'Cenário 11: quem não é membro nem enxerga a casa');
select tests.clear_authentication();

select tests.authenticate_as(:'owner');
select lives_ok(format('select public.delete_house(%L)', :'house'), 'Cenário 11: criador exclui a casa');
select lives_ok($$ select public.create_house('Casa nova') $$, 'Cenário 11: depois de excluir, o criador pode criar outra');
select tests.clear_authentication();

select is((select count(*)::integer from public.badges where house_id = :'house')
        + (select count(*)::integer from public.house_members where house_id = :'house')
        + (select count(*)::integer from public.cleaning_records where house_id = :'house'), 0,
          'Cenário 11: badges, membros e faxinas removidos em cascata');
select is(
    (select metadata - 'invite_code' from public.exclusion_logs where entity_type = 'HOUSE' and entity_id = :'house'),
    '{"affected_member_count": 3, "affected_badge_count": 14, "affected_cleaning_count": 1}'::jsonb,
    'Cenário 11: log HOUSE registra membros, badges e faxinas afetados');

select * from finish();
rollback;
