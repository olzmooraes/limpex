-- ==============================================================================
-- LIMPEX - SCHEMA INICIAL DE BANCO DE DADOS (PostgreSQL / Supabase)
-- Migração: 20260912000000_initial_schema.sql
-- ==============================================================================

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TABELA DE USUÁRIOS (public.users)
-- Sincronizada com o Supabase Auth (auth.users)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 3. TABELA DE CASAS (public.houses)
-- Restrição Inegociável: Cada usuário pode criar no máximo 1 casa (UNIQUE em creator_id)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.houses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    invite_code TEXT NOT NULL UNIQUE,
    creator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_house_creator UNIQUE (creator_id)
);

CREATE INDEX IF NOT EXISTS idx_houses_invite_code ON public.houses(invite_code);

-- ==============================================================================
-- 4. TABELA DE MEMBROS DA CASA (public.house_members)
-- Relacionamento N:N - Usuários podem participar de múltiplas casas
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.house_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('CREATOR', 'MEMBER')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_user_per_house UNIQUE (house_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_house_members_user ON public.house_members(user_id);
CREATE INDEX IF NOT EXISTS idx_house_members_house ON public.house_members(house_id);

-- ==============================================================================
-- 5. TABELA DE BADGES / ETIQUETAS (public.badges)
-- Até 34 badges por casa (14 do sistema + até 20 customizados)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_system BOOLEAN NOT NULL DEFAULT false,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_badge_name_per_house UNIQUE (house_id, name)
);

CREATE INDEX IF NOT EXISTS idx_badges_house ON public.badges(house_id);

-- ==============================================================================
-- 6. TABELA DE REGISTROS DE FAXINA (public.cleaning_records)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.cleaning_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT, -- Quem fez a faxina
    registered_by_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT, -- Quem preencheu
    day_of_week TEXT NOT NULL CHECK (day_of_week IN ('dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab')),
    cleaning_date DATE NOT NULL DEFAULT CURRENT_DATE,
    week_number INTEGER NOT NULL CHECK (week_number BETWEEN 1 AND 5),
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_cleaning_records_house_date ON public.cleaning_records(house_id, cleaning_date);
CREATE INDEX IF NOT EXISTS idx_cleaning_records_week ON public.cleaning_records(house_id, year, month, week_number);

-- ==============================================================================
-- 7. TABELA ASSOCIATIVA FAXINA X BADGES (public.cleaning_badges)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.cleaning_badges (
    cleaning_record_id UUID NOT NULL REFERENCES public.cleaning_records(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
    PRIMARY KEY (cleaning_record_id, badge_id)
);

-- ==============================================================================
-- 8. TABELA DE LOGS DE EXCLUSÃO (public.exclusion_logs)
-- Restrição Inegociável 5: Auditoria obrigatória e imutável de exclusões
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.exclusion_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deleted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    user_id UUID NOT NULL,
    user_name TEXT NOT NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('HOUSE', 'BADGE')),
    entity_id UUID NOT NULL,
    entity_name TEXT NOT NULL,
    house_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Regras estritas de imutabilidade: Impedir UPDATE e DELETE em logs de exclusão
CREATE OR REPLACE RULE prevent_update_exclusion_logs AS
    ON UPDATE TO public.exclusion_logs DO INSTEAD NOTHING;

CREATE OR REPLACE RULE prevent_delete_exclusion_logs AS
    ON DELETE TO public.exclusion_logs DO INSTEAD NOTHING;

-- ==============================================================================
-- 9. TRIGGER: INICIALIZAÇÃO AUTOMÁTICA DA CASA
-- Ao criar uma casa: vincula o criador como 'CREATOR' e cria os 14 badges do sistema
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_house()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Vincular criador como membro proprietário
    INSERT INTO public.house_members (house_id, user_id, role)
    VALUES (NEW.id, NEW.creator_id, 'CREATOR');

    -- 2. Inicializar os 14 badges pré-definidos do sistema
    INSERT INTO public.badges (house_id, name, is_system, display_order)
    VALUES 
        (NEW.id, 'Janelas', true, 1),
        (NEW.id, 'Portas', true, 2),
        (NEW.id, 'Quarto 1', true, 3),
        (NEW.id, 'Quarto 2', true, 4),
        (NEW.id, 'Quarto 3', true, 5),
        (NEW.id, 'Banheiro', true, 6),
        (NEW.id, 'Varanda', true, 7),
        (NEW.id, 'Cozinha', true, 8),
        (NEW.id, 'Sala', true, 9),
        (NEW.id, 'Casa completa', true, 10),
        (NEW.id, 'Garagem', true, 11),
        (NEW.id, 'Calçada', true, 12),
        (NEW.id, 'Área gourmet', true, 13),
        (NEW.id, 'Mobília', true, 14);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trigger_after_house_inserted
AFTER INSERT ON public.houses
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_house();

-- ==============================================================================
-- 10. ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.house_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleaning_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleaning_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exclusion_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de Usuário
CREATE POLICY "Usuários podem ver seus próprios perfis" 
ON public.users FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Usuários podem ver perfis de membros da mesma casa"
ON public.users FOR SELECT USING (
    id IN (
        SELECT hm.user_id FROM public.house_members hm
        WHERE hm.house_id IN (
            SELECT my_hm.house_id FROM public.house_members my_hm WHERE my_hm.user_id = auth.uid()
        )
    )
);

-- Políticas de Casas (Membros podem ver casas a que pertencem)
CREATE POLICY "Membros podem ver suas casas"
ON public.houses FOR SELECT USING (
    id IN (SELECT house_id FROM public.house_members WHERE user_id = auth.uid())
);

CREATE POLICY "Usuários podem criar casas"
ON public.houses FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Apenas criador pode excluir sua casa"
ON public.houses FOR DELETE USING (auth.uid() = creator_id);

-- Políticas de Badges
CREATE POLICY "Membros da casa podem ver os badges"
ON public.badges FOR SELECT USING (
    house_id IN (SELECT house_id FROM public.house_members WHERE user_id = auth.uid())
);

CREATE POLICY "Apenas criador da casa pode inserir badges"
ON public.badges FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.houses WHERE id = house_id AND creator_id = auth.uid())
);

CREATE POLICY "Apenas criador da casa pode editar badges"
ON public.badges FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.houses WHERE id = house_id AND creator_id = auth.uid())
);

CREATE POLICY "Apenas criador da casa pode deletar badges"
ON public.badges FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.houses WHERE id = house_id AND creator_id = auth.uid())
);

-- Políticas de Registros de Faxina
CREATE POLICY "Membros da casa podem ver as faxinas"
ON public.cleaning_records FOR SELECT USING (
    house_id IN (SELECT house_id FROM public.house_members WHERE user_id = auth.uid())
);

CREATE POLICY "Membros da casa podem inserir faxinas"
ON public.cleaning_records FOR INSERT WITH CHECK (
    house_id IN (SELECT house_id FROM public.house_members WHERE user_id = auth.uid())
);

-- Políticas de Logs de Exclusão (Apenas leitura para auditoria por membros)
CREATE POLICY "Membros podem visualizar logs da sua casa"
ON public.exclusion_logs FOR SELECT USING (
    house_id IN (SELECT house_id FROM public.house_members WHERE user_id = auth.uid())
);

CREATE POLICY "Qualquer usuário autenticado pode inserir logs de exclusão"
ON public.exclusion_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
