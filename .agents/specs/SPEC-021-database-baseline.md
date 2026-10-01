# SPEC-021: Baseline do Banco de Dados (Supabase Local)

- **Status**: IMPLEMENTED
- **Épico**: [ÉPICO 7 - Refundação Técnica](../backlog/backlog.md)
- **Autor**: Agente AI / Arquiteto
- **Data de Criação**: 2026-10-01
- **Última Atualização**: 2026-10-01
- **Tarefa Relacionada**: `TSK-702`. Cobre também a camada de banco das TSK-207, 208, 209, 307, 409 e TSK-601 a 603; a interface delas fica para depois da TSK-703.
- **Substitui**: as 5 migrações de `supabase/migrations/` (2026-09-12 a 2026-09-15) e as partes de banco das SPEC-002, 003, 008, 009 e 016.

---

## 1. Contexto e Objetivo

As migrações atuais nunca foram aplicadas a um banco real e têm defeitos que impedem o funcionamento:

- **Recursão na RLS:** a política de leitura de `house_members` consulta a própria tabela, o que gera erro de recursão infinita e derruba quase toda leitura.
- **Peças que faltam:**
  - não há como entrar numa casa por código de convite;
  - não há criação do perfil a partir de `auth.users`;
  - não há teto de 34 badges no banco.
- **Teto de 100 no lugar errado:** está em `public.users`, depois que a conta já existe no Auth, o que deixa uma conta órfã.
- **Logs de exclusão gravados pelo cliente:** dá para excluir sem gerar log ou forjar logs.
- **Colunas derivadas** (`day_of_week`, `week_number`, `month`, `year`) incompatíveis com a SPEC-020.

Esta spec define uma **baseline limpa**, aplicada num **Supabase local em Docker**, que já contempla as decisões de produto de [business-rules.md §7](../references/business-rules.md). O app continua usando o mock até a TSK-703.

---

## 2. Regras de Negócio Envolvidas

- [x] Limite de 100 usuários (Restrição nº 2, RN-01 a RN-05)
- [x] Limite de 1 casa por criador (RN-18)
- [x] Limite de 34 badges por casa, sendo até 20 customizados (RN-12)
- [x] Permissão exclusiva do criador (RN-21, RN-30, RN-31)
- [x] Log de auditoria na exclusão de casa, de badge e na saída ou remoção de membro (Restrição nº 5, RN-15, RN-22, RN-30)
- [x] Regras revisadas: RN-08/09 (datas, SPEC-020), RN-14 (exclusão lógica de badge), RN-28 (editar ou excluir faxina), RN-29 (sair da casa)

---

## 3. Decisões de Arquitetura

| # | Decisão | Motivo |
|---|---------|--------|
| D1 | As 5 migrações antigas são **apagadas** e substituídas por uma baseline em 4 arquivos (schema, funções internas, RLS, RPCs). | Nunca foram aplicadas; corrigir em cima seria empilhar remendos. |
| D2 | **Leitura** pelo cliente via RLS. **Escrita somente por funções RPC** (`SECURITY DEFINER`), que retornam códigos de erro explícitos. Os papéis `anon` e `authenticated` não têm `INSERT`/`UPDATE`/`DELETE` em nenhuma tabela. | Cada regra fica em um lugar só. Operações de várias tabelas (faxina + tarefas, exclusão + log) ficam atômicas. |
| D3 | A RLS usa as funções auxiliares `is_house_member()`, `is_house_creator()` e `shares_house_with()` (`SECURITY DEFINER`). | Elimina a recursão infinita. |
| D4 | O **teto de 100** é um trigger `BEFORE INSERT` em `auth.users`, com trava consultiva (*advisory lock*) contra cadastros simultâneos. O perfil em `public.users` é criado por trigger `AFTER INSERT` na mesma tabela. | Cobre cadastro por e-mail e por Google sem conta órfã. |
| D5 | `cleaning_date` é a única data da faxina. "Hoje" no banco é `(now() at time zone 'America/Sao_Paulo')::date`. | A mesma regra da SPEC-020 também no servidor. |
| D6 | Badge excluído recebe `deleted_at`, ou seja, **exclusão lógica**. Ele deixa de contar no teto e some da gestão e do formulário. As faxinas da semana atual perdem o vínculo; as de semanas anteriores o mantêm. | RN-14 revisada. |
| D7 | Os logs (`exclusion_logs`) são gravados **pela própria RPC, na mesma transação** da exclusão. Clientes não podem inserir logs. Triggers bloqueiam `UPDATE`, `DELETE` e `TRUNCATE` para qualquer papel. | Nenhuma exclusão sem log, nenhum log forjado, nenhum log alterado. |
| D8 | A faxina guarda `responsible_name`, uma cópia do nome no momento do registro. | RN-29: o nome continua no histórico depois que o membro sai da casa, sem expor o perfil dele. |
| D9 | Testes do banco em **pgTAP** (`npm run test:db` → `supabase test db`), rodando dentro do Postgres local, com transação desfeita ao final. A TSK-704 fica com os testes de ponta a ponta pela API (cadastro real, sessão, PostgREST). | Testa triggers e RLS com controle total de papel e usuário, sem depender do app. |

---

## 4. Modelo de Dados

| Tabela | Colunas principais | Restrições |
|--------|-------------------|------------|
| `users` | `id` (= `auth.users.id`), `name`, `email`, `avatar_url`, `created_at` | `name` com 1 a 80 caracteres; `email` único |
| `houses` | `id`, `name`, `invite_code`, `creator_id`, `created_at`, `updated_at` | `name` com 1 a 40 caracteres; `invite_code` com 6 caracteres de `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, único; `UNIQUE(creator_id)` |
| `house_members` | `house_id`, `user_id`, `role` (`CREATOR`/`MEMBER`), `joined_at` | PK `(house_id, user_id)` |
| `badges` | `id`, `house_id`, `name`, `is_system`, `display_order`, `created_at`, `deleted_at` | `name` com 1 a 40 caracteres; nome único por casa entre os ativos, sem diferenciar maiúsculas; trigger de teto (34 ativos, 20 customizados ativos) |
| `cleaning_records` | `id`, `house_id`, `user_id` (responsável), `responsible_name`, `registered_by_id`, `cleaning_date`, `notes`, `created_at`, `updated_at` | `notes` com até 500 caracteres; trigger impede data futura (Brasília) e data anterior à criação da casa |
| `cleaning_badges` | `cleaning_record_id`, `badge_id` | PK composta; trigger garante badge da mesma casa |
| `exclusion_logs` | `id`, `deleted_at`, `user_id`, `user_name`, `user_email`, `entity_type` (`HOUSE`/`BADGE`/`MEMBER`), `entity_id`, `entity_name`, `house_id`, `metadata`, `created_at` | Sem FKs, para que o log sobreviva à exclusão; imutável |

**Exclusões em cascata:** excluir a casa remove membros, badges, faxinas e vínculos. O log da casa registra as contagens antes da remoção.

### Visibilidade (RLS, somente `SELECT`)
- **`users`:** o próprio perfil, ou perfis de quem divide alguma casa com o usuário.
- **`houses`, `house_members`, `badges` (incluindo excluídos, para o histórico), `cleaning_records` e `cleaning_badges`:** apenas membros da casa.
- **`exclusion_logs`:** o autor do log, ou membros da casa relacionada.
- **Quem não é membro não enxerga nada da casa.** Ao entrar por convite, a casa é resolvida dentro da RPC.

---

## 5. Contrato das Funções (RPC)

Todas exigem usuário autenticado (`NOT_AUTHENTICATED`). Os erros chegam ao cliente com o **código em `message`** e o texto em pt-BR em `details`.

| Função | Quem pode | Erros |
|--------|-----------|-------|
| `get_system_capacity()` → `{total_users, max_users, is_registration_allowed}` | Qualquer um, inclusive `anon` | — |
| `create_house(name)` → casa | Autenticado | `HOUSE_NAME_INVALID`, `HOUSE_LIMIT_REACHED` |
| `join_house(invite_code)` → casa | Autenticado | `INVALID_INVITE_CODE`, `ALREADY_MEMBER` |
| `leave_house(house_id)` | Membro | `HOUSE_NOT_FOUND`, `CREATOR_CANNOT_LEAVE` |
| `remove_member(house_id, user_id)` | Criador | `HOUSE_NOT_FOUND`, `NOT_HOUSE_OWNER`, `CANNOT_REMOVE_CREATOR`, `MEMBER_NOT_FOUND` |
| `regenerate_invite_code(house_id)` → código | Criador | `HOUSE_NOT_FOUND`, `NOT_HOUSE_OWNER` |
| `delete_house(house_id)` | Criador | `HOUSE_NOT_FOUND`, `NOT_HOUSE_OWNER` |
| `create_badge(house_id, name)` → badge | Criador | `NOT_HOUSE_OWNER`, `BADGE_NAME_EMPTY`, `BADGE_NAME_TOO_LONG`, `BADGE_NAME_DUPLICATE`, `BADGE_LIMIT_REACHED`, `BADGE_CUSTOM_LIMIT_REACHED` |
| `rename_badge(badge_id, name)` → badge | Criador | `BADGE_NOT_FOUND`, `NOT_HOUSE_OWNER`, os 3 erros de nome |
| `delete_badge(badge_id)` | Criador | `BADGE_NOT_FOUND`, `NOT_HOUSE_OWNER` |
| `create_cleaning(house_id, responsible_id, cleaning_date, badge_ids[], notes)` → faxina | Membro | `CLEANING_MEMBERSHIP_REQUIRED`, `CLEANING_RESPONSIBLE_NOT_IN_HOUSE`, `CLEANING_DATE_REQUIRED`, `CLEANING_DATE_IN_FUTURE`, `CLEANING_DATE_BEFORE_HOUSE`, `CLEANING_MIN_BADGES`, `CLEANING_BADGE_NOT_IN_HOUSE`, `CLEANING_NOTES_TOO_LONG` |
| `update_cleaning(id, responsible_id, cleaning_date, badge_ids[], notes)` → faxina | Quem registrou ou o responsável, sendo membro | `CLEANING_NOT_FOUND`, `CLEANING_EDIT_FORBIDDEN` e as mesmas validações de `create_cleaning` |
| `delete_cleaning(id)` | Quem registrou ou o responsável, sendo membro | `CLEANING_NOT_FOUND`, `CLEANING_EDIT_FORBIDDEN` |

### Observações
- **Casa alheia:** quem não é membro recebe `HOUSE_NOT_FOUND`, para não revelar a existência da casa.
- **Badges na edição de faxina:** um badge excluído que já estava vinculado pode ser mantido (é histórico), mas não pode ser adicionado.
- **Cadastro acima do teto:** é barrado no trigger. O Auth responde com erro genérico, e o app confirma o motivo via `get_system_capacity()`.

---

## 6. Cenários de Aceite BDD

### Usuários e teto global
1. **Perfil automático**
   - **Dado** um cadastro no Auth com `name` nos metadados
   - **Então** é criado `public.users` com esse nome
   - **E**, sem nome, usa `full_name` (Google) ou a parte do e-mail antes de "@"
2. **Teto de 100**
   - **Dado** 100 contas no Auth
   - **Quando** a 101ª é criada
   - **Então** a inserção falha com `USERS_CAP_REACHED`
   - **E** nenhuma conta ou perfil é criado
3. **Capacidade pública:** `get_system_capacity()` responde para `anon` com 99 usuários (liberado) e com 100 (bloqueado).

### Casas e membros
4. **Criar casa:** `create_house` cria a casa com código válido, vincula o criador como `CREATOR` e cria os 14 badges na ordem da RN-10.
5. **Segunda casa:** **Dado** um criador de casa, **Quando** tenta criar outra, **Então** recebe `HOUSE_LIMIT_REACHED`.
6. **Entrar por convite**
   - Com o código em minúsculas ou com espaços, o usuário entra como `MEMBER`.
   - Repetir dá `ALREADY_MEMBER`.
   - Código inexistente dá `INVALID_INVITE_CODE`.
7. **Isolamento**
   - Quem não é membro lê 0 linhas de `houses`, `house_members`, `badges` e `cleaning_records` da casa.
   - Nenhuma leitura gera erro de recursão.
8. **Sair da casa (RN-29)**
   - O membro sai e o log `MEMBER` é gravado com a ação `LEAVE`.
   - O criador recebe `CREATOR_CANNOT_LEAVE`.
   - Depois de sair, o ex-membro não enxerga mais a casa, e as faxinas dele continuam visíveis aos demais com `responsible_name`.
9. **Remover membro (RN-30)**
   - O criador remove e o log `MEMBER` é gravado com a ação `REMOVE`.
   - Um membro comum tentando remover recebe `NOT_HOUSE_OWNER`.
   - Tentar remover o criador dá `CANNOT_REMOVE_CREATOR`.
10. **Novo código (RN-31):** depois de `regenerate_invite_code`, o código antigo dá `INVALID_INVITE_CODE` e o novo funciona.
11. **Excluir casa**
    - Um membro comum recebe `NOT_HOUSE_OWNER`.
    - O criador exclui: tudo é removido em cascata e o log `HOUSE` registra quantos membros, badges e faxinas foram afetados.
    - Depois disso, o criador pode criar uma nova casa.

### Badges
12. **Tetos:** com 14 badges de sistema, o 21º customizado dá `BADGE_CUSTOM_LIMIT_REACHED`; com 34 ativos, dá `BADGE_LIMIT_REACHED`. A verificação vale também para inserção direta como `service_role`.
13. **Nomes:** "cozinha" duplica "Cozinha" (`BADGE_NAME_DUPLICATE`); nome vazio ou com mais de 40 caracteres é rejeitado; renomear para o mesmo nome é aceito.
14. **Permissão:** um membro comum recebe `NOT_HOUSE_OWNER` ao criar, renomear ou excluir badge.
15. **Exclusão lógica (RN-14)**
    - **Dado** um badge usado numa faxina da semana atual e numa de semana anterior
    - **Quando** o criador o exclui
    - **Então** o vínculo da semana atual é removido e o da semana anterior é mantido
    - **E** o badge some da lista de ativos e libera vaga no teto
    - **E** o log `BADGE` registra os vínculos removidos e os preservados
16. **Faxina sem tarefas:** se a faxina da semana atual só tinha esse badge, ela continua existindo, com 0 tarefas.

### Faxinas
17. **Criar:** um membro registra em nome de outro membro; `responsible_name` é preenchido; os badges ficam vinculados de forma atômica.
18. **Validações:** data futura, data anterior à casa, responsável de fora, badge de outra casa ou excluído, nenhum badge e notas com 501 caracteres são todos rejeitados com o código correspondente, e nada é gravado.
19. **Fora da casa:** quem não é membro recebe `CLEANING_MEMBERSHIP_REQUIRED`.
20. **Editar e excluir (RN-28)**
    - Quem registrou e o responsável podem.
    - Outro membro recebe `CLEANING_EDIT_FORBIDDEN`.
    - A exclusão não gera log.
21. **Defesa em profundidade:** inserir faxina com data futura diretamente (como `service_role`) também falha.

### Logs e permissões
22. **Imutabilidade:** `UPDATE`, `DELETE` e `TRUNCATE` em `exclusion_logs` falham, inclusive para `service_role`.
23. **Sem escrita direta:** `authenticated` não consegue `INSERT`, `UPDATE` ou `DELETE` em nenhuma tabela; só as RPCs escrevem.

---

## 7. Ambiente Local

### `supabase/config.toml`
- `site_url = http://localhost:3000`
- senha mínima de 6 caracteres, sem exigências de força
- sem confirmação de e-mail
- desligados: realtime, storage, edge functions, analytics e seed

### Scripts npm
| Script | Comando |
|--------|---------|
| `db:start` | `supabase start` |
| `db:stop` | `supabase stop` |
| `db:reset` | `supabase db reset` (reaplica a baseline) |
| `test:db` | `supabase test db` |

### Portas
- API: `54321`
- Postgres: `54322`
- Studio (painel visual): `http://localhost:54323`
- Mailpit (e-mails de teste, como o de recuperação de senha): `http://localhost:54324`

---

## 8. Plano de Testes

### pgTAP em `supabase/tests/database/`
| Arquivo | Conteúdo |
|---------|----------|
| `000_setup.test.sql` | Auxiliares de teste: criar usuário no Auth e agir como um usuário |
| `010_users.test.sql` | Cenários 1 a 3 |
| `020_houses.test.sql` | Cenários 4 a 11 |
| `030_badges.test.sql` | Cenários 12 a 16 |
| `040_cleanings.test.sql` | Cenários 17 a 21 |
| `050_security.test.sql` | Cenários 22 e 23 |

### Critério de pronto
- `npm run db:reset` aplica a baseline sem erros.
- `npm run test:db` passa 100%.
- `npm test`, `npm run typecheck` e `npm run build` continuam verdes, porque o app ainda usa o mock.

---

## 9. Fora de Escopo
- Conectar o app ao Supabase, gerar tipos TypeScript, seed de desenvolvimento e remover o mock (TSK-703).
- Testes de ponta a ponta pela API (TSK-704).
- Google OAuth (TSK-705).
- Projeto em nuvem e deploy (TSK-706).
- Limite de tentativas de código de convite (força bruta sobre ~1 bilhão de combinações): registrado como risco, a tratar se houver exposição pública.
