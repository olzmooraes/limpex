-- SPEC-021 Cenários 12 a 16: tetos, nomes, permissões e exclusão lógica de badges
begin;
select plan(27);

select tests.create_user('dona.badges@limpex.test', 'Dona Badges') as owner \gset
select tests.create_user('membro.badges@limpex.test', 'Membro Badges') as member \gset
select tests.create_house_as(:'owner', 'Casa dos Badges') as house \gset

-- Casa criada há 30 dias, para permitir faxinas em semanas anteriores
update public.houses set created_at = now() - interval '30 days' where id = :'house';
select public.business_today() as today,
       public.week_start(public.business_today()) - 3 as last_week_day \gset
select invite_code as code from public.houses where id = :'house' \gset

select tests.authenticate_as(:'member');
select public.join_house(:'code');
select tests.clear_authentication();

-- Cenário 13: validação de nomes
select tests.authenticate_as(:'owner');
select throws_ok(format('select public.create_badge(%L, %L)', :'house', 'cozinha'), 'P0001', 'BADGE_NAME_DUPLICATE',
                 'Cenário 13: "cozinha" duplica "Cozinha"');
select throws_ok(format('select public.create_badge(%L, %L)', :'house', '   '), 'P0001', 'BADGE_NAME_EMPTY',
                 'Cenário 13: nome vazio');
select throws_ok(format('select public.create_badge(%L, %L)', :'house', repeat('x', 41)), 'P0001', 'BADGE_NAME_TOO_LONG',
                 'Cenário 13: nome com 41 caracteres');
select id as laundry from public.create_badge(:'house', ' Lavanderia ') \gset
select is((select name from public.badges where id = :'laundry'), 'Lavanderia', 'Cenário 13: badge customizado criado sem espaços');
select is((select display_order from public.badges where id = :'laundry'), 15, 'Cenário 13: entra depois dos 14 do sistema');
select lives_ok(format('select public.rename_badge(%L, %L)', :'laundry', 'Lavanderia'), 'Cenário 13: renomear para o mesmo nome é aceito');
select throws_ok(format('select public.rename_badge(%L, %L)', :'laundry', 'SALA'), 'P0001', 'BADGE_NAME_DUPLICATE',
                 'Cenário 13: renomear para nome existente (sem diferenciar maiúsculas)');
select tests.clear_authentication();

-- Cenário 14: membro comum não gerencia badges
select tests.authenticate_as(:'member');
select throws_ok(format('select public.create_badge(%L, %L)', :'house', 'Quintal'), 'P0001', 'NOT_HOUSE_OWNER', 'Cenário 14: membro não cria');
select throws_ok(format('select public.rename_badge(%L, %L)', :'laundry', 'Área de serviço'), 'P0001', 'NOT_HOUSE_OWNER', 'Cenário 14: membro não renomeia');
select throws_ok(format('select public.delete_badge(%L)', :'laundry'), 'P0001', 'NOT_HOUSE_OWNER', 'Cenário 14: membro não exclui');
select tests.clear_authentication();

-- Cenário 12: tetos de 20 customizados e 34 ativos
select tests.authenticate_as(:'owner');
select public.create_badge(:'house', 'Extra ' || g) from generate_series(1, 19) g;
select tests.clear_authentication();
select is((select count(*)::integer from public.badges where house_id = :'house' and deleted_at is null), 34,
          'Cenário 12: 14 do sistema + 20 customizados = 34 ativos');

select tests.authenticate_as(:'owner');
select throws_ok(format('select public.create_badge(%L, %L)', :'house', 'Extra 20'), 'P0001', 'BADGE_CUSTOM_LIMIT_REACHED',
                 'Cenário 12: 21º customizado é recusado');
select tests.clear_authentication();

select tests.authenticate_as_service_role();
select throws_ok(format('insert into public.badges (house_id, name, is_system, display_order) values (%L, %L, false, 99)', :'house', 'Direto'),
                 'P0001', 'BADGE_CUSTOM_LIMIT_REACHED', 'Cenário 12: teto vale também para escrita direta (service_role)');
select throws_ok(format('insert into public.badges (house_id, name, is_system, display_order) values (%L, %L, true, 99)', :'house', 'Sistema 15'),
                 'P0001', 'BADGE_LIMIT_REACHED', 'Cenário 12: com 34 ativos, nem badge de sistema entra');
select tests.clear_authentication();

-- Cenários 15 e 16: exclusão lógica preserva o histórico
select id as sala from public.badges where house_id = :'house' and name = 'Sala' \gset

select tests.authenticate_as(:'member');
select id as current_both from public.create_cleaning(:'house', :'member', :'today', array[:'laundry'::uuid, :'sala'::uuid]) \gset
select id as current_only from public.create_cleaning(:'house', :'member', :'today', array[:'laundry'::uuid]) \gset
select id as past_both from public.create_cleaning(:'house', :'member', :'last_week_day', array[:'laundry'::uuid, :'sala'::uuid]) \gset
select tests.clear_authentication();

select tests.authenticate_as(:'owner');
select lives_ok(format('select public.delete_badge(%L)', :'laundry'), 'Cenário 15: criador exclui o badge');
select tests.clear_authentication();

select ok((select deleted_at is not null from public.badges where id = :'laundry'), 'Cenário 15: badge marcado como excluído, não apagado');
select is((select array_agg(badge_id) from public.cleaning_badges where cleaning_record_id = :'current_both'),
          array[:'sala'::uuid], 'Cenário 15: faxina da semana atual perde só o vínculo excluído');
select is((select count(*)::integer from public.cleaning_badges where cleaning_record_id = :'past_both' and badge_id = :'laundry'), 1,
          'Cenário 15: faxina da semana anterior mantém o vínculo (histórico)');
select is((select count(*)::integer from public.badges where house_id = :'house' and deleted_at is null), 33,
          'Cenário 15: badge excluído deixa de contar no teto');
select is(
    (select metadata from public.exclusion_logs where entity_type = 'BADGE' and entity_id = :'laundry'),
    '{"is_system": false, "current_week_links_removed": 2, "history_links_preserved": 1}'::jsonb,
    'Cenário 15: log BADGE registra vínculos removidos e preservados');
select is((select user_id from public.exclusion_logs where entity_type = 'BADGE' and entity_id = :'laundry'), :'owner'::uuid,
          'Cenário 15: autor do log é o criador');

select ok(exists (select 1 from public.cleaning_records where id = :'current_only'), 'Cenário 16: faxina que só tinha o badge continua existindo');
select is((select count(*)::integer from public.cleaning_badges where cleaning_record_id = :'current_only'), 0,
          'Cenário 16: ...com 0 tarefas');

select tests.authenticate_as(:'member');
select is((select name from public.badges where id = :'laundry'), 'Lavanderia', 'Cenário 15: membro ainda lê o nome do badge excluído (histórico)');
select throws_ok(format('select public.create_cleaning(%L, %L, %L, array[%L]::uuid[])', :'house', :'member', :'today', :'laundry'),
                 'P0001', 'CLEANING_BADGE_NOT_IN_HOUSE', 'Cenário 15: badge excluído não pode ser usado em nova faxina');
select tests.clear_authentication();

select tests.authenticate_as(:'owner');
select throws_ok(format('select public.rename_badge(%L, %L)', :'laundry', 'Outro'), 'P0001', 'BADGE_NOT_FOUND',
                 'Cenário 15: badge excluído não pode ser renomeado');
select lives_ok(format('select public.create_badge(%L, %L)', :'house', 'Extra 20'), 'Cenário 15: a vaga liberada permite novo customizado');
select tests.clear_authentication();

select * from finish();
rollback;
