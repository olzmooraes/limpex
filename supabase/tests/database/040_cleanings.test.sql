-- SPEC-021 Cenários 17 a 21: registro, validações, edição e exclusão de faxinas
begin;
select plan(29);

select tests.create_user('dona.faxina@limpex.test', 'Dona Faxina') as owner \gset
select tests.create_user('membro.faxina@limpex.test', 'Membro Um') as member \gset
select tests.create_user('membro2.faxina@limpex.test', 'Membro Dois') as member2 \gset
select tests.create_user('fora.faxina@limpex.test', 'Pessoa Fora') as outsider \gset
select tests.create_house_as(:'owner', 'Casa das Faxinas') as house \gset
select tests.create_house_as(:'outsider', 'Casa do Vizinho') as other_house \gset

-- Casa criada há 30 dias, para permitir datas passadas
update public.houses set created_at = now() - interval '30 days' where id = :'house';
select public.business_today() as today,
       public.business_today() + 1 as tomorrow,
       public.week_start(public.business_today()) - 3 as last_week_day,
       (now() - interval '31 days')::date as before_house \gset
select invite_code as code from public.houses where id = :'house' \gset
select id as b1 from public.badges where house_id = :'house' and display_order = 1 \gset
select id as b2 from public.badges where house_id = :'house' and display_order = 2 \gset
select id as b3 from public.badges where house_id = :'house' and display_order = 3 \gset
select id as foreign_badge from public.badges where house_id = :'other_house' and display_order = 1 \gset

select tests.authenticate_as(:'member');
select public.join_house(:'code');
select tests.clear_authentication();
select tests.authenticate_as(:'member2');
select public.join_house(:'code');
select tests.clear_authentication();

-- Cenário 17: membro registra em nome de outro membro
select tests.authenticate_as(:'member');
select id as c1 from public.create_cleaning(:'house', :'owner', :'today', array[:'b1'::uuid, :'b2'::uuid, :'b1'::uuid], '  ok  ') \gset
select tests.clear_authentication();

select is((select responsible_name from public.cleaning_records where id = :'c1'), 'Dona Faxina', 'Cenário 17: nome do responsável copiado');
select is((select registered_by_id from public.cleaning_records where id = :'c1'), :'member'::uuid, 'Cenário 17: quem registrou é o usuário autenticado');
select is((select notes from public.cleaning_records where id = :'c1'), 'ok', 'Cenário 17: observações sem espaços nas pontas');
select is((select count(*)::integer from public.cleaning_badges where cleaning_record_id = :'c1'), 2, 'Cenário 17: badges repetidos viram um vínculo só');

-- Cenário 18: validações sem gravação parcial
select tests.authenticate_as(:'member');
select throws_ok(format('select public.create_cleaning(%L, %L, %L, array[%L]::uuid[])', :'house', :'member', :'tomorrow', :'b1'),
                 'P0001', 'CLEANING_DATE_IN_FUTURE', 'Cenário 18: data futura');
select throws_ok(format('select public.create_cleaning(%L, %L, %L, array[%L]::uuid[])', :'house', :'member', :'before_house', :'b1'),
                 'P0001', 'CLEANING_DATE_BEFORE_HOUSE', 'Cenário 18: data anterior à criação da casa');
select throws_ok(format('select public.create_cleaning(%L, %L, %L, array[%L]::uuid[])', :'house', :'outsider', :'today', :'b1'),
                 'P0001', 'CLEANING_RESPONSIBLE_NOT_IN_HOUSE', 'Cenário 18: responsável de fora da casa');
select throws_ok(format('select public.create_cleaning(%L, %L, %L, array[%L, %L]::uuid[])', :'house', :'member', :'today', :'b1', :'foreign_badge'),
                 'P0001', 'CLEANING_BADGE_NOT_IN_HOUSE', 'Cenário 18: badge de outra casa');
select throws_ok(format('select public.create_cleaning(%L, %L, %L, array[]::uuid[])', :'house', :'member', :'today'),
                 'P0001', 'CLEANING_MIN_BADGES', 'Cenário 18: nenhum badge');
select throws_ok(format('select public.create_cleaning(%L, %L, %L, array[%L]::uuid[], %L)', :'house', :'member', :'today', :'b1', repeat('x', 501)),
                 'P0001', 'CLEANING_NOTES_TOO_LONG', 'Cenário 18: observações com 501 caracteres');
select lives_ok(format('select public.create_cleaning(%L, %L, %L, array[%L]::uuid[], %L)', :'house', :'member', :'today', :'b1', repeat('x', 500)),
                'Cenário 18: observações com exatamente 500 caracteres');
select tests.clear_authentication();

select is((select count(*)::integer from public.cleaning_records where house_id = :'house'), 2,
          'Cenário 18: nenhuma faxina inválida foi gravada');

-- Cenário 19: quem não é membro não registra
select tests.authenticate_as(:'outsider');
select throws_ok(format('select public.create_cleaning(%L, %L, %L, array[%L]::uuid[])', :'house', :'outsider', :'today', :'b1'),
                 'P0001', 'CLEANING_MEMBERSHIP_REQUIRED', 'Cenário 19: não membro não registra faxina');
select throws_ok(format('select public.update_cleaning(%L, %L, %L, array[%L]::uuid[])', :'c1', :'outsider', :'today', :'b1'),
                 'P0001', 'CLEANING_NOT_FOUND', 'Cenário 19: não membro nem enxerga a faxina');
select tests.clear_authentication();

-- Cenário 20: só quem registrou ou o responsável editam e excluem
select tests.authenticate_as(:'member2');
select throws_ok(format('select public.update_cleaning(%L, %L, %L, array[%L]::uuid[])', :'c1', :'owner', :'today', :'b1'),
                 'P0001', 'CLEANING_EDIT_FORBIDDEN', 'Cenário 20: outro membro não edita');
select throws_ok(format('select public.delete_cleaning(%L)', :'c1'), 'P0001', 'CLEANING_EDIT_FORBIDDEN', 'Cenário 20: outro membro não exclui');
select tests.clear_authentication();

select tests.authenticate_as(:'owner');
select lives_ok(format('select public.update_cleaning(%L, %L, %L, array[%L, %L]::uuid[], %L)', :'c1', :'owner', :'last_week_day', :'b2', :'b3', 'Atualizada'),
                'Cenário 20: o responsável edita data, tarefas e observações');
select throws_ok(format('select public.update_cleaning(%L, %L, %L, array[%L]::uuid[])', :'c1', :'owner', :'tomorrow', :'b2'),
                 'P0001', 'CLEANING_DATE_IN_FUTURE', 'Cenário 20: edição também não aceita data futura');
select tests.clear_authentication();

select is((select cleaning_date::text from public.cleaning_records where id = :'c1'), :'last_week_day', 'Cenário 20: nova data gravada');
select is((select array_agg(badge_id order by badge_id) from public.cleaning_badges where cleaning_record_id = :'c1'),
          (select array_agg(id order by id) from unnest(array[:'b2'::uuid, :'b3'::uuid]) as id),
          'Cenário 20: tarefas substituídas');

select tests.authenticate_as(:'member');
select lives_ok(format('select public.update_cleaning(%L, %L, %L, array[%L]::uuid[], null)', :'c1', :'member2', :'last_week_day', :'b2'),
                'Cenário 20: quem registrou troca o responsável');
select tests.clear_authentication();
select is((select responsible_name from public.cleaning_records where id = :'c1'), 'Membro Dois', 'Cenário 20: nome do novo responsável');
select is((select notes from public.cleaning_records where id = :'c1'), null, 'Cenário 20: observações removidas');

-- Responsável sai da casa: a faxina continua editável por quem registrou
select tests.authenticate_as(:'member2');
select public.leave_house(:'house');
select tests.clear_authentication();

select tests.authenticate_as(:'member');
select lives_ok(format('select public.update_cleaning(%L, %L, %L, array[%L]::uuid[], %L)', :'c1', :'member2', :'last_week_day', :'b2', 'Mantida'),
                'Cenário 20: manter o responsável que saiu é permitido');
select throws_ok(format('select public.update_cleaning(%L, %L, %L, array[%L]::uuid[])', :'c1', :'outsider', :'last_week_day', :'b2'),
                 'P0001', 'CLEANING_RESPONSIBLE_NOT_IN_HOUSE', 'Cenário 20: trocar só para membro atual');
select tests.clear_authentication();

select count(*) as logs_before from public.exclusion_logs \gset
select tests.authenticate_as(:'member');
select lives_ok(format('select public.delete_cleaning(%L)', :'c1'), 'Cenário 20: quem registrou exclui a faxina');
select tests.clear_authentication();
select ok(not exists (select 1 from public.cleaning_records where id = :'c1'), 'Cenário 20: faxina removida');
select is((select count(*) from public.exclusion_logs), :'logs_before'::bigint, 'Cenário 20: exclusão de faxina não gera log');

-- Cenário 21: regras de data valem para escrita direta (service_role)
select tests.authenticate_as_service_role();
select throws_ok(format(
    'insert into public.cleaning_records (house_id, user_id, responsible_name, registered_by_id, cleaning_date) values (%L, %L, %L, %L, %L)',
    :'house', :'owner', 'Dona Faxina', :'owner', :'tomorrow'),
    'P0001', 'CLEANING_DATE_IN_FUTURE', 'Cenário 21: data futura barrada também na escrita direta');
select tests.clear_authentication();

select * from finish();
rollback;
