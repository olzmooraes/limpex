-- ==============================================================================
-- LIMPEX — Baseline do banco (SPEC-021 / TSK-702) — 3/4: RLS e privilégios
--
-- Leitura pelo cliente via RLS; escrita somente pelas RPCs (4/4). Os papéis
-- anon e authenticated não têm INSERT/UPDATE/DELETE em nenhuma tabela.
-- ==============================================================================

alter table public.users enable row level security;
alter table public.houses enable row level security;
alter table public.house_members enable row level security;
alter table public.badges enable row level security;
alter table public.cleaning_records enable row level security;
alter table public.cleaning_badges enable row level security;
alter table public.exclusion_logs enable row level security;

-- Sem escrita direta; anon não lê nada (a tela de login usa get_system_capacity).
revoke all on all tables in schema public from anon, authenticated;
grant select on all tables in schema public to authenticated;

-- Perfis: o próprio ou de quem divide alguma casa com o usuário.
create policy users_select on public.users
    for select to authenticated
    using (id = (select auth.uid()) or public.shares_house_with(id));

-- Casa e tudo dentro dela: apenas membros (RN-19 / RN-20).
create policy houses_select on public.houses
    for select to authenticated
    using (public.is_house_member(id));

create policy house_members_select on public.house_members
    for select to authenticated
    using (public.is_house_member(house_id));

-- Inclui badges excluídos, para o histórico mostrar o nome (RN-14 revisada).
create policy badges_select on public.badges
    for select to authenticated
    using (public.is_house_member(house_id));

create policy cleaning_records_select on public.cleaning_records
    for select to authenticated
    using (public.is_house_member(house_id));

create policy cleaning_badges_select on public.cleaning_badges
    for select to authenticated
    using (
        exists (
            select 1 from public.cleaning_records r
            where r.id = cleaning_record_id and public.is_house_member(r.house_id)
        )
    );

-- Logs: o autor ou membros da casa relacionada.
create policy exclusion_logs_select on public.exclusion_logs
    for select to authenticated
    using (
        user_id = (select auth.uid())
        or (house_id is not null and public.is_house_member(house_id))
    );
