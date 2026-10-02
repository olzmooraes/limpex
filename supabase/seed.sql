-- ==============================================================================
-- LIMPEX — Seed de DESENVOLVIMENTO (SPEC-022 Cenário 4)
-- Roda apenas no banco local, em `supabase db reset`. Nunca aplicado na nuvem
-- (`supabase db push` não executa seeds).
--
-- Contas de teste (senha de desenvolvimento: limpex123):
--   luiz@exemplo.com    — criador da casa "Ap 402 - Família"
--   carlos@exemplo.com  — membro
--   mariana@exemplo.com — membro
-- ==============================================================================

-- 1. Contas no Auth (os triggers criam os perfis em public.users)
insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
)
select
    '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
    extensions.crypt('limpex123', extensions.gen_salt('bf')), now(),
    '{"provider": "email", "providers": ["email"]}', jsonb_build_object('name', u.name), now(), now(),
    '', '', '', ''
from (values
    ('11111111-1111-4111-8111-111111111111'::uuid, 'luiz@exemplo.com', 'Luiz Otávio'),
    ('22222222-2222-4222-8222-222222222222'::uuid, 'carlos@exemplo.com', 'Carlos Oliveira'),
    ('33333333-3333-4333-8333-333333333333'::uuid, 'mariana@exemplo.com', 'Mariana Silva')
) as u(id, email, name);

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select u.id::text, u.id,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
from auth.users u
where u.email in ('luiz@exemplo.com', 'carlos@exemplo.com', 'mariana@exemplo.com');

-- 2. Casa, membros e faxinas, criados pelas próprias RPCs (mesmas regras do app)
do $$
declare
    v_luiz constant uuid := '11111111-1111-4111-8111-111111111111';
    v_carlos constant uuid := '22222222-2222-4222-8222-222222222222';
    v_mariana constant uuid := '33333333-3333-4333-8333-333333333333';
    v_house public.houses;
    v_today date := public.business_today();
    v_week_start date := public.week_start(public.business_today());
begin
    -- Cada bloco age como um usuário: auth.uid() lê o `sub` do JWT
    perform set_config('request.jwt.claims', jsonb_build_object('sub', v_luiz)::text, true);
    v_house := public.create_house('Ap 402 - Família');

    -- Casa "criada" há 30 dias, para permitir faxinas em semanas anteriores
    update public.houses set created_at = now() - interval '30 days' where id = v_house.id;

    perform set_config('request.jwt.claims', jsonb_build_object('sub', v_carlos)::text, true);
    perform public.join_house(v_house.invite_code);
    perform public.create_cleaning(
        v_house.id, v_carlos, v_week_start,
        array(select id from public.badges where house_id = v_house.id and name in ('Cozinha', 'Sala'))
    );

    perform set_config('request.jwt.claims', jsonb_build_object('sub', v_mariana)::text, true);
    perform public.join_house(v_house.invite_code);
    perform public.create_cleaning(
        v_house.id, v_mariana, v_today,
        array(select id from public.badges where house_id = v_house.id and name in ('Banheiro', 'Quarto 1', 'Varanda')),
        'Faltou desinfetante, comprar mais.'
    );

    perform set_config('request.jwt.claims', jsonb_build_object('sub', v_luiz)::text, true);
    perform public.create_cleaning(
        v_house.id, v_luiz, v_week_start - 2,
        array(select id from public.badges where house_id = v_house.id and name = 'Garagem')
    );

    perform set_config('request.jwt.claims', '', true);
end;
$$;
