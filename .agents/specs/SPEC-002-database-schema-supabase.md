# SPEC-002: Modelagem e Configuração do Banco Supabase / PostgreSQL

- **Status**: APPROVED
- **Épico**: [[EPIC-1] Fundação, Autenticação e Teto Global de Usuários](file:///c:/projetos/limpex/.agents/backlog/backlog.md)
- **Tarefa**: `TSK-102`
- **Autor**: Arquiteto AI
- **Data de Criação**: 2026-09-12
- **Última Atualização**: 2026-09-12

---

## 1. Contexto e Objetivo
O Limpex depende de um banco de dados relacional robusto para gerenciar identidades de usuários, residências compartilhadas, permissões entre criador e membros, badges de tarefas e registros temporais de faxina. O objetivo desta especificação é definir o modelo relacional completo em PostgreSQL (compatível com Supabase), habilitando integridade referencial estrita, Row Level Security (RLS) e suporte para as 5 restrições inegociáveis de negócio.

---

## 2. Regras de Negócio e Restrições Envolvidas
- **Restrição 2 (Teto Global de 100 Usuários)**: A tabela `public.users` é a base para a verificação de capacidade.
- **Restrição 3 (Limites de Propriedade)**:
  - `houses.creator_id` possui restrição `UNIQUE` para garantir no máximo 1 casa por proprietário.
  - Tabela `badges` associada a `house_id` com teto de até 34 badges por casa.
- **Restrição 4 (Hierarquia de Permissões)**:
  - Políticas RLS e tabela `house_members` com campo `role` ('CREATOR' | 'MEMBER').
- **Restrição 5 (Auditoria Obrigatória de Exclusões)**:
  - Tabela `exclusion_logs` protegida por regras PostgreSQL que proíbem operações de `UPDATE` e `DELETE`.

---

## 3. Cenários de Aceite BDD (Gherkin)

### Cenário 1: Unicidade de Criação de Casas (1 Casa por Usuário)
- **Dado** que um usuário X já possui uma casa registrada na coluna `creator_id`
- **Quando** o sistema tenta inserir uma nova casa com o mesmo `creator_id` = X
- **Então** o banco de dados deve rejeitar a operação com erro de violação de chave única (`unique_creator_id`).

### Cenário 2: Imutabilidade de Registros de Auditoria
- **Dado** que um registro foi inserido na tabela `exclusion_logs`
- **Quando** qualquer usuário ou serviço tentar executar um comando `DELETE` ou `UPDATE` nesse registro
- **Então** a operação deve ser cancelada / ignorada pelas regras do banco, mantendo o histórico de auditoria intacto.

### Cenário 3: Inicialização Automática dos 14 Badges do Sistema
- **Dado** que uma nova casa é inserida na tabela `houses`
- **Quando** a transação de criação da casa é confirmada
- **Então** os 14 badges pré-definidos do sistema (Janelas, Portas, Cozinha, etc.) devem ser gerados e associados àquela nova casa.

### Cenário 4: Isolamento de Dados por Casa (Row Level Security)
- **Dado** que o usuário A pertence exclusivamente à Casa 1
- **Quando** ele consulta registros de faxina
- **Então** ele só deve ter visibilidade dos dados pertencentes à Casa 1, nunca de outras residências.

---

## 4. Contratos de Dados e Schemas Relacionais

### Tabelas Principais:
1. `public.users` (id UUID, name TEXT, email TEXT, avatar_url TEXT, created_at TIMESTAMPTZ)
2. `public.houses` (id UUID, name TEXT, invite_code TEXT UNIQUE, creator_id UUID UNIQUE, created_at, updated_at)
3. `public.house_members` (id UUID, house_id UUID, user_id UUID, role TEXT, joined_at TIMESTAMPTZ)
4. `public.badges` (id UUID, house_id UUID, name TEXT, is_system BOOLEAN, display_order INT, created_at)
5. `public.cleaning_records` (id UUID, house_id UUID, user_id UUID, registered_by_id UUID, day_of_week TEXT, cleaning_date DATE, week_number INT, month INT, year INT, notes TEXT, created_at)
6. `public.cleaning_badges` (cleaning_record_id UUID, badge_id UUID, PRIMARY KEY (cleaning_record_id, badge_id))
7. `public.exclusion_logs` (id UUID, deleted_at TIMESTAMPTZ, user_id UUID, user_name TEXT, entity_type TEXT, entity_id UUID, entity_name TEXT, house_id UUID, metadata JSONB)

---

## 5. Plano de Testes
- **DDL Integrity**: Testar criação limpa do banco executando a migração.
- **Constraints**: Testar inserção duplicada de `creator_id` para validar bloqueio.
- **Imutabilidade**: Testar comando de exclusão em `exclusion_logs` para verificar se a regra anula a remoção.
