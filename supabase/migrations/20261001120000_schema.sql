-- ==============================================================================
-- LIMPEX — Baseline do banco (SPEC-021 / TSK-702) — 1/4: tabelas e restrições
--
-- Datas de negócio usam o horário de Brasília (America/Sao_Paulo). A faxina
-- guarda apenas a data civil; dia da semana e semana são derivados (SPEC-020).
-- ==============================================================================

-- Perfil público do usuário, criado por trigger a partir de auth.users.
create table public.users (
    id uuid primary key references auth.users (id) on delete cascade,
    name text not null check (char_length(btrim(name)) between 1 and 80),
    email text not null unique,
    avatar_url text,
    created_at timestamptz not null default now()
);

-- RN-16 a RN-18: cada usuário cria no máximo 1 casa.
create table public.houses (
    id uuid primary key default gen_random_uuid(),
    name text not null check (char_length(btrim(name)) between 1 and 40),
    -- 6 caracteres sem ambíguos (sem 0, O, 1, I)
    invite_code text not null unique check (invite_code ~ '^[A-HJ-NP-Z2-9]{6}$'),
    creator_id uuid not null references public.users (id) on delete restrict,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint houses_one_per_creator unique (creator_id)
);

-- RN-19: um usuário participa de várias casas.
create table public.house_members (
    house_id uuid not null references public.houses (id) on delete cascade,
    user_id uuid not null references public.users (id) on delete cascade,
    role text not null check (role in ('CREATOR', 'MEMBER')),
    joined_at timestamptz not null default now(),
    primary key (house_id, user_id)
);

create index house_members_user_id_idx on public.house_members (user_id);

-- RN-10 a RN-14: até 34 badges ativos por casa (20 customizados).
-- Exclusão lógica via deleted_at: o histórico continua mostrando o nome.
create table public.badges (
    id uuid primary key default gen_random_uuid(),
    house_id uuid not null references public.houses (id) on delete cascade,
    name text not null check (char_length(btrim(name)) between 1 and 40),
    is_system boolean not null default false,
    display_order integer not null,
    created_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index badges_house_id_idx on public.badges (house_id);

-- Nome único por casa entre os badges ativos, sem diferenciar maiúsculas.
create unique index badges_active_name_per_house_idx
    on public.badges (house_id, lower(btrim(name)))
    where deleted_at is null;

-- RN-09 / RN-28: registro de faxina. responsible_name preserva o nome de quem
-- saiu da casa (RN-29).
create table public.cleaning_records (
    id uuid primary key default gen_random_uuid(),
    house_id uuid not null references public.houses (id) on delete cascade,
    user_id uuid not null references public.users (id) on delete restrict,
    responsible_name text not null,
    registered_by_id uuid not null references public.users (id) on delete restrict,
    cleaning_date date not null,
    notes text check (notes is null or char_length(notes) <= 500),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index cleaning_records_house_date_idx on public.cleaning_records (house_id, cleaning_date);

create table public.cleaning_badges (
    cleaning_record_id uuid not null references public.cleaning_records (id) on delete cascade,
    badge_id uuid not null references public.badges (id) on delete cascade,
    primary key (cleaning_record_id, badge_id)
);

create index cleaning_badges_badge_id_idx on public.cleaning_badges (badge_id);

-- Restrição nº 5: log imutável de exclusões (casa, badge, saída/remoção de
-- membro). Sem chaves estrangeiras, para sobreviver à exclusão do que registra.
create table public.exclusion_logs (
    id uuid primary key default gen_random_uuid(),
    deleted_at timestamptz not null default now(),
    user_id uuid not null,
    user_name text not null,
    user_email text,
    entity_type text not null check (entity_type in ('HOUSE', 'BADGE', 'MEMBER')),
    entity_id uuid not null,
    entity_name text not null,
    house_id uuid,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index exclusion_logs_house_id_idx on public.exclusion_logs (house_id);
