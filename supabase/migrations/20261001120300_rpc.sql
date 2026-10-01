-- ==============================================================================
-- LIMPEX — Baseline do banco (SPEC-021 / TSK-702) — 4/4: RPCs de escrita
--
-- Única porta de escrita do cliente. Cada função valida as regras de negócio e
-- falha com public.app_error(código, mensagem); como roda numa transação,
-- uma falha desfaz tudo (nenhuma gravação parcial).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- Guardas compartilhadas
-- ------------------------------------------------------------------------------
create function public.require_user()
returns uuid
language plpgsql
set search_path = ''
as $$
declare
    v_user uuid := (select auth.uid());
begin
    if v_user is null then
        perform public.app_error('NOT_AUTHENTICATED', 'Faça login para continuar.');
    end if;
    return v_user;
end;
$$;

-- Casa da qual o usuário é membro; quem não é membro recebe HOUSE_NOT_FOUND,
-- para não revelar a existência da casa.
create function public.require_house_member(p_house_id uuid)
returns public.houses
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_house public.houses;
begin
    perform public.require_user();
    select h.* into v_house
      from public.houses h
     where h.id = p_house_id and public.is_house_member(h.id);
    if not found then
        perform public.app_error('HOUSE_NOT_FOUND', 'Casa não encontrada.');
    end if;
    return v_house;
end;
$$;

-- RN-21 / RN-30 / RN-31: ações exclusivas do criador.
create function public.require_house_owner(p_house_id uuid)
returns public.houses
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_house public.houses := public.require_house_member(p_house_id);
begin
    if v_house.creator_id <> (select auth.uid()) then
        perform public.app_error('NOT_HOUSE_OWNER', 'Apenas o criador da casa pode realizar esta ação.');
    end if;
    return v_house;
end;
$$;

-- ------------------------------------------------------------------------------
-- Restrição nº 2: capacidade pública para a tela de login (anon).
-- ------------------------------------------------------------------------------
create function public.get_system_capacity()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
    select jsonb_build_object(
        'total_users', s.total,
        'max_users', public.max_users(),
        'is_registration_allowed', s.total < public.max_users()
    )
    from (select count(*)::integer as total from auth.users) s
$$;

-- ------------------------------------------------------------------------------
-- Casas e membros (RN-16 a RN-22, RN-29 a RN-31)
-- ------------------------------------------------------------------------------
create function public.create_house(p_name text)
returns public.houses
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user uuid := public.require_user();
    v_name text := btrim(coalesce(p_name, ''));
    v_house public.houses;
begin
    if char_length(v_name) not between 1 and 40 then
        perform public.app_error('HOUSE_NAME_INVALID', 'O nome da casa deve ter de 1 a 40 caracteres.');
    end if;
    if exists (select 1 from public.houses where creator_id = v_user) then
        perform public.app_error('HOUSE_LIMIT_REACHED', 'Você já é criador de uma casa. Cada usuário pode criar no máximo 1 casa.');
    end if;

    begin
        insert into public.houses (name, invite_code, creator_id)
        values (v_name, public.generate_invite_code(), v_user)
        returning * into v_house;
    exception when unique_violation then
        -- Duas criações simultâneas do mesmo usuário
        perform public.app_error('HOUSE_LIMIT_REACHED', 'Você já é criador de uma casa. Cada usuário pode criar no máximo 1 casa.');
    end;

    insert into public.house_members (house_id, user_id, role)
    values (v_house.id, v_user, 'CREATOR');

    -- RN-10: os 14 badges do sistema, nesta ordem
    insert into public.badges (house_id, name, is_system, display_order)
    select v_house.id, s.name, true, s.position::integer
      from unnest(array[
          'Janelas', 'Portas', 'Quarto 1', 'Quarto 2', 'Quarto 3', 'Banheiro', 'Varanda',
          'Cozinha', 'Sala', 'Casa completa', 'Garagem', 'Calçada', 'Área gourmet', 'Mobília'
      ]) with ordinality as s(name, position);

    return v_house;
end;
$$;

create function public.join_house(p_invite_code text)
returns public.houses
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user uuid := public.require_user();
    v_code text := upper(regexp_replace(coalesce(p_invite_code, ''), '\s', '', 'g'));
    v_house public.houses;
begin
    select * into v_house from public.houses where invite_code = v_code;
    if not found then
        perform public.app_error('INVALID_INVITE_CODE', 'Código de convite inválido ou casa inexistente.');
    end if;
    if exists (select 1 from public.house_members where house_id = v_house.id and user_id = v_user) then
        perform public.app_error('ALREADY_MEMBER', 'Você já é membro desta casa.');
    end if;

    insert into public.house_members (house_id, user_id, role)
    values (v_house.id, v_user, 'MEMBER');
    return v_house;
end;
$$;

-- RN-29: o membro sai; o criador não pode sair (só excluir a casa).
create function public.leave_house(p_house_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user uuid := public.require_user();
    v_house public.houses := public.require_house_member(p_house_id);
begin
    if v_house.creator_id = v_user then
        perform public.app_error('CREATOR_CANNOT_LEAVE', 'O criador não pode sair da própria casa. Para encerrá-la, exclua a casa.');
    end if;

    delete from public.house_members where house_id = p_house_id and user_id = v_user;

    perform public.write_exclusion_log(
        'MEMBER', v_user, (select name from public.users where id = v_user), p_house_id,
        jsonb_build_object('action', 'LEAVE', 'house_name', v_house.name)
    );
end;
$$;

-- RN-30: o criador remove um membro.
create function public.remove_member(p_house_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_house public.houses := public.require_house_owner(p_house_id);
    v_name text;
begin
    if p_user_id = v_house.creator_id then
        perform public.app_error('CANNOT_REMOVE_CREATOR', 'O criador não pode ser removido da casa.');
    end if;

    delete from public.house_members where house_id = p_house_id and user_id = p_user_id;
    if not found then
        perform public.app_error('MEMBER_NOT_FOUND', 'Este usuário não é membro da casa.');
    end if;

    select name into v_name from public.users where id = p_user_id;
    perform public.write_exclusion_log(
        'MEMBER', p_user_id, coalesce(v_name, 'Desconhecido'), p_house_id,
        jsonb_build_object('action', 'REMOVE', 'house_name', v_house.name)
    );
end;
$$;

-- RN-31: novo código de convite; o anterior deixa de funcionar.
create function public.regenerate_invite_code(p_house_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_house public.houses := public.require_house_owner(p_house_id);
    v_code text;
begin
    update public.houses
       set invite_code = public.generate_invite_code()
     where id = v_house.id
    returning invite_code into v_code;
    return v_code;
end;
$$;

-- RN-21 / RN-22: só o criador exclui; o log registra o que foi afetado.
create function public.delete_house(p_house_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_house public.houses := public.require_house_owner(p_house_id);
begin
    perform public.write_exclusion_log(
        'HOUSE', v_house.id, v_house.name, v_house.id,
        jsonb_build_object(
            'invite_code', v_house.invite_code,
            'affected_member_count', (select count(*) from public.house_members where house_id = v_house.id),
            'affected_badge_count', (select count(*) from public.badges where house_id = v_house.id),
            'affected_cleaning_count', (select count(*) from public.cleaning_records where house_id = v_house.id)
        )
    );
    delete from public.houses where id = v_house.id;
end;
$$;

-- ------------------------------------------------------------------------------
-- Badges (RN-11 a RN-15). Tetos de 34/20 no trigger enforce_badge_limits.
-- ------------------------------------------------------------------------------
create function public.validate_badge_name(p_house_id uuid, p_name text, p_ignore_badge_id uuid)
returns text
language plpgsql
set search_path = ''
as $$
declare
    v_name text := btrim(coalesce(p_name, ''));
begin
    if v_name = '' then
        perform public.app_error('BADGE_NAME_EMPTY', 'Informe um nome para o badge.');
    end if;
    if char_length(v_name) > 40 then
        perform public.app_error('BADGE_NAME_TOO_LONG', 'O nome do badge deve ter no máximo 40 caracteres.');
    end if;
    if exists (
        select 1 from public.badges
         where house_id = p_house_id
           and deleted_at is null
           and lower(btrim(name)) = lower(v_name)
           and id is distinct from p_ignore_badge_id
    ) then
        perform public.app_error('BADGE_NAME_DUPLICATE', 'Já existe um badge com este nome nesta casa.');
    end if;
    return v_name;
end;
$$;

-- Badge ativo visível para o usuário; caso contrário BADGE_NOT_FOUND.
create function public.require_active_badge(p_badge_id uuid)
returns public.badges
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_badge public.badges;
begin
    perform public.require_user();
    select * into v_badge
      from public.badges
     where id = p_badge_id and deleted_at is null and public.is_house_member(house_id);
    if not found then
        perform public.app_error('BADGE_NOT_FOUND', 'Badge não encontrado.');
    end if;
    return v_badge;
end;
$$;

create function public.create_badge(p_house_id uuid, p_name text)
returns public.badges
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_house public.houses := public.require_house_owner(p_house_id);
    v_name text := public.validate_badge_name(p_house_id, p_name, null);
    v_badge public.badges;
begin
    insert into public.badges (house_id, name, is_system, display_order)
    values (
        v_house.id, v_name, false,
        coalesce((select max(display_order) from public.badges where house_id = v_house.id), 0) + 1
    )
    returning * into v_badge;
    return v_badge;
end;
$$;

create function public.rename_badge(p_badge_id uuid, p_name text)
returns public.badges
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_badge public.badges := public.require_active_badge(p_badge_id);
    v_name text;
begin
    perform public.require_house_owner(v_badge.house_id);
    v_name := public.validate_badge_name(v_badge.house_id, p_name, v_badge.id);

    update public.badges set name = v_name where id = v_badge.id returning * into v_badge;
    return v_badge;
end;
$$;

-- RN-14 revisada: exclusão lógica. Faxinas da semana atual perdem o vínculo;
-- as de semanas anteriores o mantêm (histórico com o nome do badge).
create function public.delete_badge(p_badge_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_badge public.badges := public.require_active_badge(p_badge_id);
    v_removed integer;
    v_preserved integer;
begin
    perform public.require_house_owner(v_badge.house_id);

    with removed as (
        delete from public.cleaning_badges cb
         using public.cleaning_records r
         where cb.cleaning_record_id = r.id
           and cb.badge_id = v_badge.id
           and r.cleaning_date >= public.week_start(public.business_today())
        returning 1
    )
    select count(*) into v_removed from removed;

    select count(*) into v_preserved from public.cleaning_badges where badge_id = v_badge.id;

    update public.badges set deleted_at = now() where id = v_badge.id;

    perform public.write_exclusion_log(
        'BADGE', v_badge.id, v_badge.name, v_badge.house_id,
        jsonb_build_object(
            'is_system', v_badge.is_system,
            'current_week_links_removed', v_removed,
            'history_links_preserved', v_preserved
        )
    );
end;
$$;

-- ------------------------------------------------------------------------------
-- Faxinas (RN-09, RN-20, RN-28). Regras de data no trigger enforce_cleaning_date.
-- ------------------------------------------------------------------------------

-- Validações comuns a criar e editar.
-- p_check_responsible: na edição, manter um responsável que saiu da casa é
-- permitido (histórico); só a troca exige um membro atual.
-- p_current_badge_ids: vínculos que a faxina já tem (na edição podem incluir
-- badges excluídos, que são histórico e podem ser mantidos).
create function public.validate_cleaning_input(
    p_house_id uuid,
    p_responsible_id uuid,
    p_check_responsible boolean,
    p_cleaning_date date,
    p_badge_ids uuid[],
    p_notes text,
    p_current_badge_ids uuid[]
)
returns void
language plpgsql
set search_path = ''
as $$
begin
    if p_check_responsible and not exists (
        select 1 from public.house_members where house_id = p_house_id and user_id = p_responsible_id
    ) then
        perform public.app_error('CLEANING_RESPONSIBLE_NOT_IN_HOUSE', 'O responsável selecionado não é membro da casa.');
    end if;
    if p_cleaning_date is null then
        perform public.app_error('CLEANING_DATE_REQUIRED', 'Selecione a data em que a faxina foi realizada.');
    end if;
    if coalesce(cardinality(p_badge_ids), 0) = 0 then
        perform public.app_error('CLEANING_MIN_BADGES', 'Selecione ao menos 1 tarefa (badge) realizada na faxina.');
    end if;
    if exists (
        select 1 from unnest(p_badge_ids) as selected(badge_id)
         where not (selected.badge_id = any (coalesce(p_current_badge_ids, '{}')))
           and not exists (
               select 1 from public.badges b
                where b.id = selected.badge_id and b.house_id = p_house_id and b.deleted_at is null
           )
    ) then
        perform public.app_error('CLEANING_BADGE_NOT_IN_HOUSE', 'Um dos badges selecionados não pertence à casa ou foi excluído.');
    end if;
    if char_length(btrim(coalesce(p_notes, ''))) > 500 then
        perform public.app_error('CLEANING_NOTES_TOO_LONG', 'As observações devem ter no máximo 500 caracteres.');
    end if;
end;
$$;

create function public.create_cleaning(
    p_house_id uuid,
    p_responsible_id uuid,
    p_cleaning_date date,
    p_badge_ids uuid[],
    p_notes text default null
)
returns public.cleaning_records
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user uuid := public.require_user();
    v_badge_ids uuid[] := array(select distinct unnest(coalesce(p_badge_ids, '{}')));
    v_record public.cleaning_records;
begin
    if not public.is_house_member(p_house_id) then
        perform public.app_error('CLEANING_MEMBERSHIP_REQUIRED', 'Você precisa ser membro da casa para registrar faxinas.');
    end if;
    perform public.validate_cleaning_input(
        p_house_id, p_responsible_id, true, p_cleaning_date, v_badge_ids, p_notes, null
    );

    insert into public.cleaning_records
        (house_id, user_id, responsible_name, registered_by_id, cleaning_date, notes)
    values (
        p_house_id, p_responsible_id,
        (select name from public.users where id = p_responsible_id),
        v_user, p_cleaning_date, nullif(btrim(coalesce(p_notes, '')), '')
    )
    returning * into v_record;

    insert into public.cleaning_badges (cleaning_record_id, badge_id)
    select v_record.id, badge_id from unnest(v_badge_ids) as badge_id;

    return v_record;
end;
$$;

-- RN-28: quem registrou ou o responsável, desde que ainda membro, pode editar
-- ou excluir. Quem não é membro recebe CLEANING_NOT_FOUND.
create function public.require_editable_cleaning(p_cleaning_id uuid)
returns public.cleaning_records
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user uuid := public.require_user();
    v_record public.cleaning_records;
begin
    select * into v_record
      from public.cleaning_records
     where id = p_cleaning_id and public.is_house_member(house_id);
    if not found then
        perform public.app_error('CLEANING_NOT_FOUND', 'Faxina não encontrada.');
    end if;
    if v_user not in (v_record.registered_by_id, v_record.user_id) then
        perform public.app_error('CLEANING_EDIT_FORBIDDEN', 'Só quem registrou a faxina ou o responsável por ela pode alterá-la.');
    end if;
    return v_record;
end;
$$;

create function public.update_cleaning(
    p_cleaning_id uuid,
    p_responsible_id uuid,
    p_cleaning_date date,
    p_badge_ids uuid[],
    p_notes text default null
)
returns public.cleaning_records
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_record public.cleaning_records := public.require_editable_cleaning(p_cleaning_id);
    v_badge_ids uuid[] := array(select distinct unnest(coalesce(p_badge_ids, '{}')));
    v_current uuid[] := array(
        select badge_id from public.cleaning_badges where cleaning_record_id = p_cleaning_id
    );
    v_responsible_changed boolean := p_responsible_id is distinct from v_record.user_id;
    v_responsible_name text := v_record.responsible_name;
begin
    perform public.validate_cleaning_input(
        v_record.house_id, p_responsible_id, v_responsible_changed,
        p_cleaning_date, v_badge_ids, p_notes, v_current
    );
    if v_responsible_changed then
        select name into v_responsible_name from public.users where id = p_responsible_id;
    end if;

    update public.cleaning_records
       set user_id = p_responsible_id,
           responsible_name = v_responsible_name,
           cleaning_date = p_cleaning_date,
           notes = nullif(btrim(coalesce(p_notes, '')), '')
     where id = p_cleaning_id
    returning * into v_record;

    delete from public.cleaning_badges
     where cleaning_record_id = p_cleaning_id and not (badge_id = any (v_badge_ids));

    insert into public.cleaning_badges (cleaning_record_id, badge_id)
    select p_cleaning_id, badge_id
      from unnest(v_badge_ids) as badge_id
     where not (badge_id = any (v_current));

    return v_record;
end;
$$;

create function public.delete_cleaning(p_cleaning_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_record public.cleaning_records := public.require_editable_cleaning(p_cleaning_id);
begin
    delete from public.cleaning_records where id = v_record.id;
end;
$$;

-- ------------------------------------------------------------------------------
-- Privilégios de execução: só o necessário fica exposto via PostgREST.
-- ------------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.get_system_capacity() to anon, authenticated;

-- Usadas pelas políticas de RLS (executadas com o papel de quem consulta)
grant execute on function
    public.is_house_member(uuid),
    public.is_house_creator(uuid),
    public.shares_house_with(uuid)
to authenticated;

grant execute on function
    public.create_house(text),
    public.join_house(text),
    public.leave_house(uuid),
    public.remove_member(uuid, uuid),
    public.regenerate_invite_code(uuid),
    public.delete_house(uuid),
    public.create_badge(uuid, text),
    public.rename_badge(uuid, text),
    public.delete_badge(uuid),
    public.create_cleaning(uuid, uuid, date, uuid[], text),
    public.update_cleaning(uuid, uuid, date, uuid[], text),
    public.delete_cleaning(uuid)
to authenticated;
