# Plano de Desenvolvimento Faseado do Limpex (Roadmap)

Este roadmap organiza a construção do Limpex em marcos de entrega sucessivos, garantindo que a base técnica, a experiência de usuário e as restrições inegociáveis de negócio sejam validadas a cada etapa.

---

## Visão Geral dos Marcos (Milestones)

```mermaid
gantt
    title Roadmap do Limpex
    dateFormat  YYYY-MM-DD
    section M0: Setup & Harness
    Estrutura .agents e SDD         :done, m0, 2026-09-12, 1d
    section M1: Auth & Limites
    Setup Projeto & Teto 100 Users  :done, m1, 2026-09-12, 1d
    section M2: Casas & Permissões
    Casas, Convite e 1 Casa/Criador :active, m2, 2026-09-13, 3d
    section M3: Badges & Limpeza
    Badges (máx 34) & Registro Semanal:m3, after m2, 4d
    section M4: Histórico & Auditoria
    Histórico Semanal & Logs Imutáveis:m4, after m3, 3d
    section M5: Homologação PWA
    Auditoria Final & Release Ready :m5, after m4, 2d
```

---

## Detalhamento dos Marcos

### Milestone 0: Harness Engineering & Setup SDD (Concluído)
- **Objetivo**: Implementar o centro de inteligência e governança na pasta `.agents/`.
- **Entregas**:
  - `AGENTS.md` com diretrizes comportamentais e regras de ouro.
  - Regras de arquitetura (`01-architecture-sdd.md`), UX mobile (`02-mobile-ux-guidelines.md`) e limites de segurança (`03-security-and-limits.md`).
  - Skills do agente: `spec-driven-dev`, `backlog-manager` e `compliance-audit`.
  - Workflows e templates BDD padronizados.
  - Backlog hierárquico e referências de domínio.
- **Critério de Aceite**: Harness validado, integrado e referenciado no repositório.

---

### Milestone 1: Fundação, Autenticação e Teto Global de 100 Usuários (Concluído)
- **Objetivo**: Inicialização do projeto frontend mobile-first, configuração do banco de dados e garantia intransponível da barreira de 100 usuários.
- **Entregas**:
  - `TSK-101`: Setup do projeto frontend com React PWA, TypeScript e Design Tokens em Vanilla CSS.
  - `TSK-102`: Esquemas de banco de dados e migração SQL das 7 tabelas do Supabase.
  - `TSK-103`: Trigger PostgreSQL `BEFORE INSERT` bloqueando o 101º cadastro com `USERS_CAP_REACHED`.
  - `TSK-104`: Função RPC e hook reativo `useSystemCapacity` para verificação prévia.
  - `TSK-105`: Tela inicial mobile com alternância login/cadastro e banner adaptativo de limite atingido.
  - `TSK-106`: Autenticação completa por Nome + E-mail + Senha (com toggle de visibilidade) e Google OAuth.
  - `TSK-107`: Suíte unificada de testes E2E validando os 7 gates de conformidade e auditoria visual no app.
- **Critério de Aceite**: Tentativa de registrar o 101º usuário é estritamente bloqueada na interface e rejeitada no banco de dados. 100% dos 7 gates aprovados.

---

### Milestone 2: Gestão de Casas, Membros e Convites
- **Objetivo**: Gestão de residências com geração de código de convite e garantia de 1 casa por proprietário.
- **Entregas**:
  - Modelagem e migração de `houses` e `house_members`.
  - Restrição única de 1 casa criada por usuário.
  - Geração de código de convite de 6 caracteres e fluxo de adesão por código.
  - Tela/Aba de Casas (Criar, Vincular e Alternar).
- **Critério de Aceite**: Usuário não consegue criar mais de 1 casa; consegue participar de múltiplas casas via código de convite.

---

### Milestone 3: Sistema de Badges (Máx 34) e Registro de Faxina
- **Objetivo**: Implementar a gestão de tags e a tela central de registro de faxinas com a navegação fixa inferior.
- **Entregas**:
  - Seed automático dos 14 badges do sistema para cada nova casa.
  - Tela de Gestão de Badges com trava em 20 customizados / 34 totais por casa.
  - Regra RBAC: apenas o criador pode criar, editar ou excluir badges.
  - Componente Bottom Navbar fixa de 5 posições com botão central "+ Faxina" em destaque.
  - Modal/Tela de registro de faxina com seleção de responsável, dia, badges e observações.
  - Tela Principal exibindo as faxinas da semana vigente com cards expansíveis (> 2 itens).
- **Critério de Aceite**: Criador adiciona novos badges até o limite de 34; membros registram faxinas; botão central da navbar abre fluxo de registro com 1 toque.

---

### Milestone 4: Histórico de Limpezas e Auditoria de Exclusões
- **Objetivo**: Histórico retroativo organizado por semanas e sistema de auditoria imutável de exclusões.
- **Entregas**:
  - Agrupamento semanal no formato `"Semana X de [Mês] de [Ano]"`.
  - Blocos horizontais dos 7 dias (`dom` a `sab`) com cores diferenciadas nos dias com faxina.
  - Visualização condicional (apenas semanas com faxinas são exibidas).
  - Tabela `exclusion_logs` com gravação automática de logs na exclusão de casas e badges.
- **Critério de Aceite**: Exclusão de qualquer badge ou casa gera log imediato com autor, data/hora e item; cards de histórico expandem consolidado da semana.

---

### Milestone 5: Homologação Mobile, PWA e Polimento UX
- **Objetivo**: Verificação final de acessibilidade, testes E2E e instalação PWA.
- **Entregas**:
  - Configuração do Service Worker e `manifest.json` para instalação mobile na Home Screen.
  - Auditoria completa via skill `compliance-audit`.
  - Validação de safe areas em iOS e Android.
- **Critério de Aceite**: 100% dos testes passando; checklist de release aprovada sem pendências.
