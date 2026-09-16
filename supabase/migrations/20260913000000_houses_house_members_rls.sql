-- ==============================================================================
-- LIMPEX - MODELAGEM houses / house_members (Complemento do Épico 2)
-- Migração: 20260913000000_houses_house_members_rls.sql
-- TSK-201: Restrição de 1 casa por criador, RLS e triggers de updated_at
-- Observação: as tabelas foram criadas na migração 20260912000000_initial_schema.sql.
-- Esta migração é ADITIVA e idempotente: reforça a constraint, adiciona RLS
-- ausente em house_members e o trigger de updated_at em houses.
-- ==============================================================================

-- ==============================================================================
-- 1. GARANTIA DA RESTRIÇÃO: 1 CASA POR CRIADOR (RN-18 / Restrição 3)
-- Reforça, de forma defensiva, a constraint UNIQUE no creator_id de houses.
-- ==============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'unique_house_creator'
          AND conrelid = 'public.houses'::regclass
    ) THEN
        ALTER TABLE public.houses
            ADD CONSTRAINT unique_house_creator UNIQUE (creator_id);
    END IF;
END $$;

-- ==============================================================================
-- 2. TRIGGER DE ATUALIZAÇÃO AUTOMÁTICA DO updated_at (public.houses)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_house_updated_at ON public.houses;
CREATE TRIGGER trigger_house_updated_at
BEFORE UPDATE ON public.houses
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ==============================================================================
-- 3. ROW LEVEL SECURITY — POLÍTICAS DE houses e house_members (Restrição 4)
-- house_members: apenas LEITURA para membros da casa.
-- Inserção/alteração/exclusão de vínculos NÃO são expostas via políticas:
-- o vínculo do criador é criado pelo trigger SECURITY DEFINER handle_new_house
-- e a entrada via convite será operada por RPC SECURITY DEFINER (TSK-202),
-- preservando validação do código de convite fora da superfície RLS.
-- ==============================================================================

-- 3.1. houses: política de UPDATE (apenas o criador gerencia a casa)
DROP POLICY IF EXISTS "Apenas criador pode editar sua casa" ON public.houses;
CREATE POLICY "Apenas criador pode editar sua casa"
ON public.houses FOR UPDATE USING (auth.uid() = creator_id);

-- 3.2. house_members: leitura isolada por casa (Cenário 4 da SPEC-008)
DROP POLICY IF EXISTS "Membros podem ver os membros das suas casas" ON public.house_members;
CREATE POLICY "Membros podem ver os membros das suas casas"
ON public.house_members FOR SELECT USING (
    house_id IN (SELECT house_id FROM public.house_members WHERE user_id = auth.uid())
);

-- 3.3. Defesa em profundidade: revogar operações indiscriminadas em house_members
REVOKE INSERT, UPDATE, DELETE ON public.house_members FROM anon, authenticated;