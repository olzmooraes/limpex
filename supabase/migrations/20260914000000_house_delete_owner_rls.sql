-- ==============================================================================
-- LIMPEX - EXCLUSÃO DE CASA RESTRITA EXCLUSIVAMENTE AO PROPRIETÁRIO (TSK-205)
-- Migração: 20260914000000_house_delete_owner_rls.sql
--
-- Reforça, de forma defensiva e idempotente, a política RLS de DELETE em
-- public.houses: apenas o criador (auth.uid() = creator_id) pode excluir a casa.
-- Complementa a política já criada em 20260912000000_initial_schema.sql,
-- garantindo que a Restrição Obrigatória nº 4 (RN-21) permaneça vigente mesmo
-- após eventuais reaplicações de migrações.
-- ==============================================================================

-- 1. DELETE em public.houses apenas para o criador (Restrição 4 / RN-21)
DROP POLICY IF EXISTS "Apenas criador pode excluir sua casa" ON public.houses;
CREATE POLICY "Apenas criador pode excluir sua casa"
ON public.houses FOR DELETE USING (auth.uid() = creator_id);

-- 2. Defesa em profundidade: vínculos de casa (house_members) e badges da casa
--    acompanham a casa via ON DELETE CASCADE já definido nas tabelas; a exclusão
--    de casas por roles não autenticados continua bloqueada pela política acima
--    e pelo RLS habilitado.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'houses'
          AND policyname = 'Apenas criador pode excluir sua casa'
          AND cmd = 'DELETE'
    ) THEN
        RAISE EXCEPTION 'Política RLS de exclusão de casas não foi criada corretamente';
    END IF;
END $$;