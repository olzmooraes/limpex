-- ==============================================================================
-- Auxiliares de teste (SPEC-021 §8). Este arquivo roda primeiro e NÃO desfaz a
-- transação: cria o schema `tests` no banco local para os demais arquivos.
-- Nunca é aplicado em produção (não é migração).
-- ==============================================================================
create extension if not exists pgtap with schema extensions;

create schema if not exists tests;
grant usage on schema tests to anon, authenticated, service_role;

-- Cria uma conta no Auth (dispara o teto de 100 e a criação do perfil).
-- p_metadata substitui os metadados (ex.: {"full_name": ...} como no Google).
create or replace function tests.create_user(
    p_email text,
    p_name text default null,
    p_metadata jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_id uuid := gen_random_uuid();
begin
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                            raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
    values (v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            p_email, '',
            coalesce(p_metadata,
                     case when p_name is null then '{}'::jsonb else jsonb_build_object('name', p_name) end),
            '{}'::jsonb, now(), now());
    return v_id;
end;
$$;

-- Passa a agir como service_role (ignora RLS; usado para testar os triggers).
create or replace function tests.authenticate_as_service_role()
returns void
language plpgsql
as $$
begin
    perform set_config('request.jwt.claims', '{"role": "service_role"}', true);
    execute 'set local role service_role';
end;
$$;

-- Passa a agir como o usuário (papel authenticated + JWT com `sub`).
create or replace function tests.authenticate_as(p_user_id uuid)
returns void
language plpgsql
as $$
begin
    perform set_config('request.jwt.claims',
        jsonb_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
end;
$$;

-- Passa a agir como visitante não autenticado.
create or replace function tests.authenticate_as_anon()
returns void
language plpgsql
as $$
begin
    perform set_config('request.jwt.claims', '{"role": "anon"}', true);
    execute 'set local role anon';
end;
$$;

-- Volta ao superusuário (postgres), sem usuário autenticado.
create or replace function tests.clear_authentication()
returns void
language plpgsql
as $$
begin
    perform set_config('request.jwt.claims', '', true);
    execute 'reset role';
end;
$$;

-- Atalho: cria usuário + casa e devolve o id da casa (como o próprio criador).
create or replace function tests.create_house_as(p_user_id uuid, p_name text)
returns uuid
language plpgsql
as $$
declare
    v_house_id uuid;
begin
    perform tests.authenticate_as(p_user_id);
    select id into v_house_id from public.create_house(p_name);
    perform tests.clear_authentication();
    return v_house_id;
end;
$$;

grant execute on all functions in schema tests to anon, authenticated, service_role;

select plan(1);
select pass('auxiliares de teste instalados');
select * from finish();
