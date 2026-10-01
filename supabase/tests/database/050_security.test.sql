-- SPEC-021 Cenários 22 e 23: logs imutáveis e nenhuma escrita direta pelo cliente
begin;
select plan(21);

-- Cenário 22: logs imutáveis para qualquer papel
insert into public.exclusion_logs (user_id, user_name, entity_type, entity_id, entity_name)
values (gen_random_uuid(), 'Auditor', 'BADGE', gen_random_uuid(), 'Badge de teste')
returning id as log_id \gset

select throws_ok(format('update public.exclusion_logs set user_name = %L where id = %L', 'Forjado', :'log_id'),
                 'P0001', 'EXCLUSION_LOG_IMMUTABLE', 'Cenário 22: nem o superusuário altera um log');
select throws_ok(format('delete from public.exclusion_logs where id = %L', :'log_id'),
                 'P0001', 'EXCLUSION_LOG_IMMUTABLE', 'Cenário 22: nem o superusuário apaga um log');
select throws_ok('truncate public.exclusion_logs', 'P0001', 'EXCLUSION_LOG_IMMUTABLE', 'Cenário 22: TRUNCATE bloqueado');

select tests.authenticate_as_service_role();
select throws_ok(format('update public.exclusion_logs set user_name = %L where id = %L', 'Forjado', :'log_id'),
                 'P0001', 'EXCLUSION_LOG_IMMUTABLE', 'Cenário 22: service_role não altera log');
select throws_ok(format('delete from public.exclusion_logs where id = %L', :'log_id'),
                 'P0001', 'EXCLUSION_LOG_IMMUTABLE', 'Cenário 22: service_role não apaga log');
select tests.clear_authentication();

-- Cenário 23: escrita somente pelas RPCs
select tests.create_user('seguranca@limpex.test', 'Segurança') as user_id \gset
select tests.create_house_as(:'user_id', 'Casa Segura') as house \gset

select tests.authenticate_as(:'user_id');
select throws_ok(format('insert into public.houses (name, invite_code, creator_id) values (%L, %L, %L)', 'Direta', 'ABCDEF', :'user_id'),
                 '42501', null, 'Cenário 23: sem INSERT direto em houses');
select throws_ok(format('insert into public.house_members (house_id, user_id, role) values (%L, %L, %L)', :'house', :'user_id', 'MEMBER'),
                 '42501', null, 'Cenário 23: sem INSERT direto em house_members');
select throws_ok(format('update public.badges set name = %L where house_id = %L', 'Hack', :'house'),
                 '42501', null, 'Cenário 23: sem UPDATE direto em badges');
select throws_ok('delete from public.cleaning_records', '42501', null, 'Cenário 23: sem DELETE direto em cleaning_records');
select throws_ok(format('update public.users set name = %L where id = %L', 'Hack', :'user_id'),
                 '42501', null, 'Cenário 23: sem UPDATE direto em users');
select throws_ok(format('insert into public.exclusion_logs (user_id, user_name, entity_type, entity_id, entity_name) values (%L, %L, %L, %L, %L)',
                        :'user_id', 'Forjado', 'HOUSE', :'house', 'Falso'),
                 '42501', null, 'Cenário 23: cliente não forja log');
select throws_ok(format('select public.write_exclusion_log(%L, %L, %L, %L, %L)', 'HOUSE', :'house', 'Falso', :'house', '{}'),
                 '42501', null, 'Cenário 23: cliente não chama a função interna de log');
select throws_ok('select public.generate_invite_code()', '42501', null, 'Cenário 23: funções internas não ficam expostas');
select tests.clear_authentication();

select tests.authenticate_as_anon();
select throws_ok($$ select public.create_house('Anônima') $$, '42501', null, 'Cenário 23: visitante não chama RPC de escrita');
select throws_ok('select count(*) from public.houses', '42501', null, 'Cenário 23: visitante não lê tabelas');
select tests.clear_authentication();

-- Verificações sistêmicas (protegem contra desvios em migrações futuras)
select ok(
    (select bool_and(c.relrowsecurity) from pg_class c
      where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'),
    'RLS ligada em todas as tabelas de public');
select is(
    (select count(*)::integer from information_schema.role_table_grants
      where table_schema = 'public' and grantee in ('anon', 'authenticated')
        and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')),
    0, 'anon e authenticated não têm privilégio de escrita em nenhuma tabela');
select is(
    (select count(*)::integer from information_schema.role_table_grants
      where table_schema = 'public' and grantee = 'anon'),
    0, 'anon não tem privilégio algum nas tabelas');
select is(
    (select array_agg(p.proname::text order by p.proname) from pg_proc p
      where p.pronamespace = 'public'::regnamespace and has_function_privilege('anon', p.oid, 'EXECUTE')),
    array['get_system_capacity'],
    'anon só executa get_system_capacity');
select is(
    (select array_agg(p.proname::text order by p.proname) from pg_proc p
      where p.pronamespace = 'public'::regnamespace and has_function_privilege('authenticated', p.oid, 'EXECUTE')),
    array['create_badge', 'create_cleaning', 'create_house', 'delete_badge', 'delete_cleaning', 'delete_house',
          'get_system_capacity', 'is_house_creator', 'is_house_member', 'join_house', 'leave_house',
          'regenerate_invite_code', 'remove_member', 'rename_badge', 'shares_house_with', 'update_cleaning'],
    'authenticated executa só as RPCs e os auxiliares de RLS');
select is(
    (select count(*)::integer from pg_proc p
      where p.pronamespace = 'public'::regnamespace and p.prosecdef
        and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) as cfg where cfg like 'search_path=%')),
    0, 'toda função SECURITY DEFINER fixa o search_path');

select * from finish();
rollback;
