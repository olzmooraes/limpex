-- ==============================================================================
-- LIMPEX - PERSISTÊNCIA DOS REGISTROS DE FAXINA (TSK-403 / SPEC-016)
-- Migração: 20260915000000_cleaning_persistence_rls.sql
--
-- Consolida a camada de persistência de cleaning_records / cleaning_badges:
--   1. Alinha o CHECK de cleaning_records.week_number para 1..4 (domain-model).
--   2. Políticas RLS de SELECT/INSERT em cleaning_records (membros da casa — RN-20).
--   3. Políticas RLS de SELECT/INSERT em cleaning_badges (membros da casa).
--   4. Trigger de integridade: badge de cleaning_badges deve pertencer à mesma
--      casa do registro associado (isolamento RN-19 em nível de banco).
--   5. Trigger de integridade: registered_by_id deve ser membro da casa (RN-20).
-- Idempotente (DROP IF EXISTS / CREATE OR REPLACE), no padrão das migrações
-- TSK-205 / TSK-305.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Teto da semana (week_number) coerente com o domain-model: 1..4
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.cleaning_records'::regclass
          AND conname = 'cleaning_records_week_number_check'
    ) THEN
        ALTER TABLE public.cleaning_records
            DROP CONSTRAINT cleaning_records_week_number_check;
    END IF;
END $$;

ALTER TABLE public.cleaning_records
    ADD CONSTRAINT cleaning_records_week_number_check
    CHECK (week_number BETWEEN 1 AND 4) NOT VALID;

ALTER TABLE public.cleaning_records
    VALIDATE CONSTRAINT cleaning_records_week_number_check;

-- ------------------------------------------------------------------------------
-- 2. RLS — public.cleaning_records (RN-20 / Restrição nº 4)
--    SELECT/INSERT restritos aos membros vinculados à casa. Registros de faxina
--    são append-only: nenhuma política de UPDATE/DELETE é concedida.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Membros da casa podem ver as faxinas" ON public.cleaning_records;
CREATE POLICY "Membros da casa podem ver as faxinas"
ON public.cleaning_records FOR SELECT USING (
    house_id IN (SELECT house_id FROM public.house_members WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Membros da casa podem inserir faxinas" ON public.cleaning_records;
CREATE POLICY "Membros da casa podem inserir faxinas"
ON public.cleaning_records FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND house_id IN (SELECT house_id FROM public.house_members WHERE user_id = auth.uid())
);

-- ------------------------------------------------------------------------------
-- 3. RLS — public.cleaning_badges (associação N:N)
--    Visibilidade e inserção restritas aos membros da casa do registro associado.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Membros da casa podem ver os badges dos registros" ON public.cleaning_badges;
CREATE POLICY "Membros da casa podem ver os badges dos registros"
ON public.cleaning_badges FOR SELECT USING (
    cleaning_record_id IN (
        SELECT cr.id FROM public.cleaning_records cr
        JOIN public.house_members hm ON hm.house_id = cr.house_id
        WHERE hm.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Membros da casa podem associar badges aos registros" ON public.cleaning_badges;
CREATE POLICY "Membros da casa podem associar badges aos registros"
ON public.cleaning_badges FOR INSERT WITH CHECK (
    cleaning_record_id IN (
        SELECT cr.id FROM public.cleaning_records cr
        JOIN public.house_members hm ON hm.house_id = cr.house_id
        WHERE hm.user_id = auth.uid()
    )
);

-- ------------------------------------------------------------------------------
-- 4. Trigger de integridade: cleaning_badges (isolamento RN-19)
--    Rejeita associações nas quais o badge pertence a uma casa diferente do
--    registro, impedindo vazamento de dados entre casas no nível do banco.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_cleaning_badge_integrity()
RETURNS TRIGGER AS $$
DECLARE
    v_record_house UUID;
    v_badge_house UUID;
BEGIN
    SELECT cr.house_id INTO v_record_house
    FROM public.cleaning_records cr WHERE cr.id = NEW.cleaning_record_id;

    SELECT b.house_id INTO v_badge_house
    FROM public.badges b WHERE b.id = NEW.badge_id;

    IF v_record_house IS NULL THEN
        RAISE EXCEPTION 'CLEANING_RECORD_NOT_FOUND: registro de faxina inexistente.';
    END IF;

    IF v_badge_house IS NULL THEN
        RAISE EXCEPTION 'CLEANING_BADGE_NOT_FOUND: badge inexistente.';
    END IF;

    IF v_record_house IS DISTINCT FROM v_badge_house THEN
        RAISE EXCEPTION 'CLEANING_BADGE_NOT_IN_HOUSE: o badge pertence a outra casa (RN-19).';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cleaning_badge_integrity ON public.cleaning_badges;
CREATE TRIGGER trigger_cleaning_badge_integrity
BEFORE INSERT OR UPDATE OF cleaning_record_id, badge_id ON public.cleaning_badges
FOR EACH ROW
EXECUTE FUNCTION public.handle_cleaning_badge_integrity();

-- ------------------------------------------------------------------------------
-- 5. Trigger de integridade: cleaning_records (RN-20 / Restrição nº 4)
--    Defesa em profundidade além da RLS: o solicitante (registered_by_id) deve
--    estar vinculado à casa.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_cleaning_record_integrity()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.house_members hm
        WHERE hm.house_id = NEW.house_id AND hm.user_id = NEW.registered_by_id
    ) THEN
        RAISE EXCEPTION 'CLEANING_MEMBERSHIP_REQUIRED: o solicitante não é membro da casa (RN-20).';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cleaning_record_integrity ON public.cleaning_records;
CREATE TRIGGER trigger_cleaning_record_integrity
BEFORE INSERT OR UPDATE OF house_id, registered_by_id ON public.cleaning_records
FOR EACH ROW
EXECUTE FUNCTION public.handle_cleaning_record_integrity();

-- ------------------------------------------------------------------------------
-- Verificação defensiva: políticas criadas
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'cleaning_badges'
          AND cmd IN ('SELECT', 'INSERT')
    ) THEN
        RAISE EXCEPTION 'Políticas RLS de cleaning_badges não foram criadas corretamente';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'cleaning_records'
          AND cmd IN ('SELECT', 'INSERT')
    ) THEN
        RAISE EXCEPTION 'Políticas RLS de cleaning_records não foram criadas corretamente';
    END IF;
END $$;