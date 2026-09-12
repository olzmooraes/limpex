# Backlog de Desenvolvimento do Limpex

Este backlog contém todos os épicos, estórias de usuário e tarefas técnicas necessárias para o desenvolvimento do Limpex, estruturados para o fluxo **Spec-Driven Development**.

---

## Legenda de Status
- `TODO`: Tarefa planejada e aguardando início.
- `SPEC_DRAFTING`: Especificação técnica em elaboração.
- `SPEC_APPROVED`: Especificação aprovada.
- `IN_PROGRESS`: Desenvolvimento ativo (TDD / Código).
- `REVIEW`: Revisão de código e auditoria de regras.
- `DONE`: Concluído com testes passando e verificado.

---

## ÉPICO 1: Fundação, Autenticação e Teto Global de Usuários
*Objetivo: Estabelecer o ambiente base, scaffold do projeto, autenticação segura e a regra inegociável de bloqueio no 100º usuário.*

| ID | Tarefa | Status | Prioridade | Dependência | Spec Relacionada |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `TSK-101` | Scaffold do projeto frontend mobile-first (Next.js / React PWA, TypeScript, CSS Tokens) | `DONE` | P0 | Nenhuma | [SPEC-001](file:///c:/projetos/limpex/.agents/specs/SPEC-001-scaffold-frontend.md) |
| `TSK-102` | Configuração do banco Supabase/PostgreSQL e esquemas iniciais de tabelas | `DONE` | P0 | Nenhuma | [SPEC-002](file:///c:/projetos/limpex/.agents/specs/SPEC-002-database-schema-supabase.md) |
| `TSK-103` | Implementação do gatilho/trigger no banco para bloquear cadastros acima de 100 usuários | `DONE` | P0 | TSK-102 | [SPEC-003](file:///c:/projetos/limpex/.agents/specs/SPEC-003-max-100-users-limit.md) |
| `TSK-104` | Endpoint/serviço de consulta de capacidade (`total_users < 100`) para verificação prévia | `DONE` | P0 | TSK-103 | [SPEC-004](file:///c:/projetos/limpex/.agents/specs/SPEC-004-capacity-check-service.md) |
| `TSK-105` | Tela de Login / Cadastro com alternância fluida e aviso visual de limite atingido | `DONE` | P0 | TSK-104 | [SPEC-005](file:///c:/projetos/limpex/.agents/specs/SPEC-005-auth-screen.md) |
| `TSK-106` | Integração do Google OAuth e Registro manual por Nome + E-mail + Senha | `DONE` | P1 | TSK-105 | [SPEC-006](file:///c:/projetos/limpex/.agents/specs/SPEC-006-auth-integration.md) |
| `TSK-107` | Testes automatizados da barreira de 100 usuários (tentativa do 101º usuário) | `DONE` | P0 | TSK-103, TSK-106 | [SPEC-007](file:///c:/projetos/limpex/.agents/specs/SPEC-007-e2e-100-users-cap-test.md) |

---

## ÉPICO 2: Gestão de Casas, Membros e Permissões
*Objetivo: Permitir criação de casa (máx 1 por criador), entrada via código de convite e controle de acesso.*

| ID | Tarefa | Status | Prioridade | Dependência | Spec Relacionada |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `TSK-201` | Modelagem e migração de `houses` e `house_members` com restrição de 1 casa por criador | `TODO` | P0 | TSK-102 | [SPEC-003](file:///c:/projetos/limpex/.agents/specs/) |
| `TSK-202` | Geração de código de convite único e amigável (6 caracteres) com botão de compartilhamento | `TODO` | P1 | TSK-201 | [SPEC-003](file:///c:/projetos/limpex/.agents/specs/) |
| `TSK-203` | Tela/Aba de Casas: Criar nova casa e Entrar em casa existente via código | `TODO` | P1 | TSK-202 | [SPEC-003](file:///c:/projetos/limpex/.agents/specs/) |
| `TSK-204` | Suporte a múltiplas casas: seletor de casa ativa no topo do aplicativo | `TODO` | P1 | TSK-203 | [SPEC-003](file:///c:/projetos/limpex/.agents/specs/) |
| `TSK-205` | Exclusão de casa restrita exclusivamente ao proprietário | `TODO` | P0 | TSK-201 | [SPEC-003](file:///c:/projetos/limpex/.agents/specs/) |
| `TSK-206` | Testes de restrição: bloquear criação de 2ª casa pelo mesmo usuário | `TODO` | P0 | TSK-201 | [SPEC-003](file:///c:/projetos/limpex/.agents/specs/) |

---

## ÉPICO 3: Gestão de Badges de Tarefas e Limitações
*Objetivo: Sistema de tags/badges de faxina com 14 pré-definidos, suporte a customizados e teto estrito de 34 badges.*

| ID | Tarefa | Status | Prioridade | Dependência | Spec Relacionada |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `TSK-301` | Modelagem e seed dos 14 badges pré-definidos do sistema na criação de cada casa | `TODO` | P0 | TSK-201 | [SPEC-004](file:///c:/projetos/limpex/.agents/specs/) |
| `TSK-302` | Tela de Gestão de Badges (Item 2 da Bottom Navbar) | `TODO` | P1 | TSK-301 | [SPEC-004](file:///c:/projetos/limpex/.agents/specs/) |
| `TSK-303` | Criação de novos badges customizados com trava em 20 customizados / 34 totais | `TODO` | P0 | TSK-302 | [SPEC-004](file:///c:/projetos/limpex/.agents/specs/) |
| `TSK-304` | Edição de badges (renomear item) permitida apenas para o criador da casa | `TODO` | P1 | TSK-302 | [SPEC-004](file:///c:/projetos/limpex/.agents/specs/) |
| `TSK-305` | Exclusão de badges permitida apenas para o criador da casa | `TODO` | P0 | TSK-302 | [SPEC-004](file:///c:/projetos/limpex/.agents/specs/) |
| `TSK-306` | Testes automatizados do teto de 34 badges e permissões de criador vs membro | `TODO` | P0 | TSK-303, TSK-305 | [SPEC-004](file:///c:/projetos/limpex/.agents/specs/) |

---

## ÉPICO 4: Registro de Faxina e Tela Principal Semanal
*Objetivo: Registro fluido de atividades realizadas e visualização dinâmica das faxinas da semana corrente.*

| ID | Tarefa | Status | Prioridade | Dependência | Spec Relacionada |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `TSK-401` | Componente Bottom Navigation Bar de 5 posições com botão central "+ Faxina" elevado | `TODO` | P0 | TSK-101 | [SPEC-005](file:///c:/projetos/limpex/.agents/specs/) |
| `TSK-402` | Tela/Modal de Registro de Faxina (Item Central): responsável, dia da semana, badges, notas | `TODO` | P0 | TSK-301, TSK-401 | [SPEC-005](file:///c:/projetos/limpex/.agents/specs/) |
| `TSK-403` | Backend e persistência de registros de faxina (`cleaning_records` e `cleaning_badges`) | `TODO` | P0 | TSK-402 | [SPEC-005](file:///c:/projetos/limpex/.agents/specs/) |
| `TSK-404` | Tela Principal (Item 1 da Navbar): Cards de faxinas realizadas na semana vigente | `TODO` | P0 | TSK-403 | [SPEC-005](file:///c:/projetos/limpex/.agents/specs/) |
| `TSK-405` | Implementação do card expansível para mais de 2 tarefas com micro-animação | `TODO` | P1 | TSK-404 | [SPEC-005](file:///c:/projetos/limpex/.agents/specs/) |
| `TSK-406` | Ícone indicativo visual para registros que contenham observações/ressalvas | `TODO` | P1 | TSK-404 | [SPEC-005](file:///c:/projetos/limpex/.agents/specs/) |
| `TSK-407` | Lógica determinística de reset semanal temporal da visualização principal | `TODO` | P0 | TSK-404 | [SPEC-005](file:///c:/projetos/limpex/.agents/specs/) |

---

## ÉPICO 5: Tela de Histórico de Limpezas
*Objetivo: Histórico semanal agrupado, visualização em linha dos 7 dias e cards expansíveis consolidados.*

| ID | Tarefa | Status | Prioridade | Dependência | Spec Relacionada |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `TSK-501` | Query e agrupamento de faxinas por semana (`Semana X de Mês de Ano`) | `TODO` | P0 | TSK-403 | [SPEC-006](file:///c:/projetos/limpex/.agents/specs/) |
| `TSK-502` | Filtro condicional: exibir exclusivamente as semanas com ao menos 1 registro | `TODO` | P1 | TSK-501 | [SPEC-006](file:///c:/projetos/limpex/.agents/specs/) |
| `TSK-503` | Componente de blocos dos 7 dias (`dom` a `sab`) em linha única com destaque visual nos dias ativos | `TODO` | P0 | TSK-501 | [SPEC-006](file:///c:/projetos/limpex/.agents/specs/) |
| `TSK-504` | Expansão do card para exibir o consolidado geral das faxinas daquela semana | `TODO` | P1 | TSK-503 | [SPEC-006](file:///c:/projetos/limpex/.agents/specs/) |
| `TSK-505` | Testes visuais e funcionais de rolagem e responsividade mobile no histórico | `TODO` | P1 | TSK-504 | [SPEC-006](file:///c:/projetos/limpex/.agents/specs/) |

---

## ÉPICO 6: Sistema de Auditoria e Logs de Exclusão
*Objetivo: Garantir conformidade com a 5ª restrição obrigatória, registrando toda exclusão de casa ou badge.*

| ID | Tarefa | Status | Prioridade | Dependência | Spec Relacionada |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `TSK-601` | Tabela `exclusion_logs` no banco com regras de imutabilidade (sem update/delete) | `TODO` | P0 | TSK-102 | [SPEC-007](file:///c:/projetos/limpex/.agents/specs/) |
| `TSK-602` | Trigger/Serviço para gravação automática de log na exclusão de qualquer badge | `TODO` | P0 | TSK-305, TSK-601 | [SPEC-007](file:///c:/projetos/limpex/.agents/specs/) |
| `TSK-603` | Trigger/Serviço para gravação automática de log na exclusão de qualquer casa | `TODO` | P0 | TSK-205, TSK-601 | [SPEC-007](file:///c:/projetos/limpex/.agents/specs/) |
| `TSK-604` | Testes automatizados garantindo persistência e fidelidade dos logs de auditoria | `TODO` | P0 | TSK-602, TSK-603 | [SPEC-007](file:///c:/projetos/limpex/.agents/specs/) |
