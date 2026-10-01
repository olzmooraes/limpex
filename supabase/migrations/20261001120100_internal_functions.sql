-- ==============================================================================
-- LIMPEX — Baseline do banco (SPEC-021 / TSK-702) — 2/4: funções internas e triggers
--
-- Todas as funções fixam search_path = '' e qualificam os nomes, para que um
-- objeto homônimo em outro schema não altere o comportamento.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- Erros de negócio: código em `message`, texto em pt-BR em `detail`.
-- O cliente recebe ambos (PostgREST: message / details).
-- ------------------------------------------------------------------------------
create function public.app_error(p_code text, p_detail text)
returns void
language plpgsql
set search_path = ''
as $$
begin
    raise exception using errcode = 'P0001', message = p_code, detail = p_detail;
end;
$$;

-- ------------------------------------------------------------------------------
-- Constantes e datas de negócio (SPEC-020: horário de Brasília)
-- ------------------------------------------------------------------------------
create function public.max_users()
returns integer
language sql
immutable
set search_path = ''
as $$ select 100 $$;

create function public.business_today()
returns date
language sql
stable
set search_path = ''
as $$ select (now() at time zone 'America/Sao_Paulo')::date $$;

-- Domingo da semana que contém a data (semana de domingo a sábado).
create function public.week_start(p_date date)
returns date
language sql
immutable
set search_path = ''
as $$ select p_date - extract(dow from p_date)::integer $$;

-- ------------------------------------------------------------------------------
-- Auxiliares de permissão usados pela RLS. SECURITY DEFINER evita a recursão
-- de políticas (a política de house_members não consulta house_members sob RLS).
-- ------------------------------------------------------------------------------
create function public.is_house_member(p_house_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1 from public.house_members m
        where m.house_id = p_house_id and m.user_id = (select auth.uid())
    )
$$;

create function public.is_house_creator(p_house_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1 from public.houses h
        where h.id = p_house_id and h.creator_id = (select auth.uid())
    )
$$;

create function public.shares_house_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.house_members mine
        join public.house_members theirs on theirs.house_id = mine.house_id
        where mine.user_id = (select auth.uid()) and theirs.user_id = p_user_id
    )
$$;

-- ------------------------------------------------------------------------------
-- Código de convite: 6 caracteres de um alfabeto de 32 símbolos sem ambíguos.
-- 256 é múltiplo de 32, então `byte % 32` é uniforme.
-- ------------------------------------------------------------------------------
create function public.generate_invite_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
    v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    v_bytes bytea;
    v_code text;
begin
    loop
        v_bytes := extensions.gen_random_bytes(6);
        v_code := '';
        for i in 0..5 loop
            v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, i) % 32) + 1, 1);
        end loop;
        exit when not exists (select 1 from public.houses where invite_code = v_code);
    end loop;
    return v_code;
end;
$$;

-- ------------------------------------------------------------------------------
-- Restrição nº 2: teto de 100 contas, aplicado no próprio Auth (e-mail e Google).
-- A trava consultiva serializa cadastros simultâneos perto do limite.
-- ------------------------------------------------------------------------------
create function public.enforce_max_users()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    perform pg_advisory_xact_lock(hashtext('limpex:max_users'));
    if (select count(*) from auth.users) >= public.max_users() then
        perform public.app_error(
            'USERS_CAP_REACHED',
            'O Limpex atingiu o limite de 100 usuários cadastrados. Novos cadastros estão suspensos.'
        );
    end if;
    return new;
end;
$$;

create trigger enforce_max_users
    before insert on auth.users
    for each row execute function public.enforce_max_users();

-- Perfil público: nome dos metadados do cadastro, do Google (full_name) ou do e-mail.
create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.users (id, name, email, avatar_url)
    values (
        new.id,
        left(
            coalesce(
                nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
                nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
                split_part(new.email, '@', 1)
            ),
            80
        ),
        new.email,
        new.raw_user_meta_data ->> 'avatar_url'
    );
    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_auth_user();

-- ------------------------------------------------------------------------------
-- RN-12: até 34 badges ativos por casa, dos quais até 20 customizados.
-- Vale para qualquer caminho de escrita, inclusive service_role.
-- ------------------------------------------------------------------------------
create function public.enforce_badge_limits()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
    v_active integer;
    v_custom integer;
begin
    if new.deleted_at is not null then
        return new;
    end if;
    if tg_op = 'UPDATE' and old.deleted_at is null then
        return new; -- badge já ativo: renomear não muda a contagem
    end if;

    -- Serializa a contagem por casa
    perform 1 from public.houses where id = new.house_id for update;

    select count(*), count(*) filter (where not is_system)
      into v_active, v_custom
      from public.badges
     where house_id = new.house_id and deleted_at is null and id <> new.id;

    if not new.is_system and v_custom >= 20 then
        perform public.app_error('BADGE_CUSTOM_LIMIT_REACHED', 'Limite de 20 badges customizados atingido.');
    end if;
    if v_active >= 34 then
        perform public.app_error('BADGE_LIMIT_REACHED', 'Teto de 34 badges por casa atingido.');
    end if;
    return new;
end;
$$;

create trigger enforce_badge_limits
    before insert or update of deleted_at on public.badges
    for each row execute function public.enforce_badge_limits();

-- ------------------------------------------------------------------------------
-- RN-09 revisada: data da faxina nunca futura (Brasília) e nunca anterior à
-- criação da casa. Vale para qualquer caminho de escrita.
-- ------------------------------------------------------------------------------
create function public.enforce_cleaning_date()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
    v_house_created date;
begin
    if new.cleaning_date > public.business_today() then
        perform public.app_error('CLEANING_DATE_IN_FUTURE', 'Não é possível registrar uma faxina em uma data futura.');
    end if;

    select (created_at at time zone 'America/Sao_Paulo')::date
      into v_house_created
      from public.houses where id = new.house_id;

    if new.cleaning_date < v_house_created then
        perform public.app_error('CLEANING_DATE_BEFORE_HOUSE', 'A data da faxina não pode ser anterior à criação da casa.');
    end if;
    return new;
end;
$$;

create trigger enforce_cleaning_date
    before insert or update of cleaning_date, house_id on public.cleaning_records
    for each row execute function public.enforce_cleaning_date();

-- RN-19: o badge vinculado precisa ser da mesma casa e estar ativo. Vínculos
-- antigos com badges excluídos continuam existindo (histórico), mas nenhum
-- vínculo novo pode apontar para um badge excluído.
create function public.enforce_cleaning_badge()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if not exists (
        select 1
        from public.badges b
        join public.cleaning_records r on r.house_id = b.house_id
        where b.id = new.badge_id
          and r.id = new.cleaning_record_id
          and b.deleted_at is null
    ) then
        perform public.app_error('CLEANING_BADGE_NOT_IN_HOUSE', 'Um dos badges selecionados não pertence à casa ou foi excluído.');
    end if;
    return new;
end;
$$;

create trigger enforce_cleaning_badge
    before insert or update on public.cleaning_badges
    for each row execute function public.enforce_cleaning_badge();

-- ------------------------------------------------------------------------------
-- updated_at automático
-- ------------------------------------------------------------------------------
create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

create trigger touch_houses_updated_at
    before update on public.houses
    for each row execute function public.touch_updated_at();

create trigger touch_cleaning_records_updated_at
    before update on public.cleaning_records
    for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------------------------
-- Restrição nº 5: logs imutáveis para qualquer papel, inclusive service_role.
-- ------------------------------------------------------------------------------
create function public.forbid_exclusion_log_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    perform public.app_error('EXCLUSION_LOG_IMMUTABLE', 'Logs de exclusão não podem ser alterados nem apagados.');
    return null;
end;
$$;

create trigger exclusion_logs_immutable
    before update or delete on public.exclusion_logs
    for each row execute function public.forbid_exclusion_log_changes();

create trigger exclusion_logs_no_truncate
    before truncate on public.exclusion_logs
    for each statement execute function public.forbid_exclusion_log_changes();

-- Gravação de log usada pelas RPCs, na mesma transação da exclusão.
-- Autor = usuário autenticado que executou a ação.
create function public.write_exclusion_log(
    p_entity_type text,
    p_entity_id uuid,
    p_entity_name text,
    p_house_id uuid,
    p_metadata jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_actor public.users;
begin
    select * into v_actor from public.users where id = (select auth.uid());
    insert into public.exclusion_logs
        (user_id, user_name, user_email, entity_type, entity_id, entity_name, house_id, metadata)
    values
        ((select auth.uid()), coalesce(v_actor.name, 'Desconhecido'), v_actor.email,
         p_entity_type, p_entity_id, p_entity_name, p_house_id, coalesce(p_metadata, '{}'::jsonb));
end;
$$;
