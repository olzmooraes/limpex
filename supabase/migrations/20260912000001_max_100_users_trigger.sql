-- ==============================================================================
-- LIMPEX - RESTRIÇÃO MANDATÓRIA 2: TETO GLOBAL DE 100 USUÁRIOS
-- Migração: 20260912000001_max_100_users_trigger.sql
-- ==============================================================================

-- 1. FUNÇÃO PL/pgSQL DO GATILHO DE BLOQUEIO NO 101º USUÁRIO
-- Executada BEFORE INSERT para barrar a inserção antes que qualquer dado seja gravado
CREATE OR REPLACE FUNCTION public.check_max_users_limit()
RETURNS TRIGGER AS $$
DECLARE
    current_user_count INTEGER;
    max_allowed CONSTANT INTEGER := 100;
BEGIN
    -- Bloquear concorrentemente para evitar race conditions em cadastros simultâneos
    LOCK TABLE public.users IN EXCLUSIVE MODE;

    SELECT COUNT(*) INTO current_user_count FROM public.users;

    IF current_user_count >= max_allowed THEN
        RAISE EXCEPTION 'USERS_CAP_REACHED: O limite máximo de 100 usuários cadastrados no Limpex foi atingido. Novos cadastros estão temporariamente suspensos.'
            USING ERRCODE = 'P0001';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. TRIGGER BEFORE INSERT EM public.users
DROP TRIGGER IF EXISTS trigger_check_max_users_limit ON public.users;

CREATE TRIGGER trigger_check_max_users_limit
BEFORE INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.check_max_users_limit();

-- ==============================================================================
-- 3. FUNÇÃO RPC PÚBLICA PARA CONSULTA DE CAPACIDADE (ANON & AUTH)
-- Retorna a contagem atual e flag booleana sem expor dados privados de outros usuários
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_system_capacity()
RETURNS JSONB AS $$
DECLARE
    user_count INTEGER;
    max_cap CONSTANT INTEGER := 100;
BEGIN
    SELECT COUNT(*) INTO user_count FROM public.users;

    RETURN jsonb_build_object(
        'total_users', user_count,
        'max_users', max_cap,
        'is_registration_allowed', (user_count < max_cap)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Liberar execução da função para usuários não autenticados (tela de login) e autenticados
GRANT EXECUTE ON FUNCTION public.get_system_capacity() TO anon, authenticated;
