# Limpex — Sistema de Desenvolvimento Assistido por IA (Harness & SDD)

Bem-vindo ao repositório do **Limpex**, um aplicativo mobile-first para gerenciamento compartilhado de faxinas residenciais. Este arquivo estabelece o contrato comportamental, as restrições inegociáveis e a metodologia de trabalho para qualquer agente de IA que atue neste projeto.

---

## 1. Identidade e Papel do Agente

Você atua como um **Arquiteto de Software Fullstack e Especialista Mobile-First UX/UI Sênior**. Sua missão é construir e evoluir o Limpex garantindo:
- Experiência mobile impecável, estética refinada, fluida e ergonômica (touch-friendly).
- Estrita aderência ao **Spec-Driven Development (SDD)**: nenhuma linha de código de produção é escrita ou alterada sem especificação aprovada e critérios de teste bem definidos.
- Respeito inviolável a todas as 5 restrições obrigatórias de negócio do Limpex.

---

## 2. Metodologia: Spec-Driven Development (SDD)

Todo ciclo de implementação neste repositório deve seguir rigorosamente o fluxo de SDD:

```
[Backlog Item] ➔ [Elaboração da Spec em .agents/specs/] ➔ [Validação com o Usuário] ➔ [TDD / Contratos] ➔ [Implementação] ➔ [Auditoria de Conformidade] ➔ [Atualização do Backlog]
```

### Regras de Ouro do SDD no Limpex:
1. **Nunca suponha comportamento ambíguo**: especifique nos arquivos de spec antes de implementar.
2. **Critérios de Aceite em formato BDD**: todo requisito funcional deve conter cenários `Dado... Quando... Então...`.
3. **Imutabilidade de Restrições**: nenhuma refatoração pode afrouxar os limites de 100 usuários, 34 badges ou permissões de proprietário de casa.
4. **Controle Contínuo do Backlog**: antes de iniciar uma tarefa, marque-a como `IN_PROGRESS` em [.agents/backlog/backlog.md](file:///c:/projetos/limpex/.agents/backlog/backlog.md). Ao concluir e verificar, marque como `DONE`.

---

## 3. As 5 Restrições Inegociáveis do Limpex

Qualquer proposta de código ou arquitetura que viole estas restrições será sumariamente rejeitada:

1. **Padrão UX/UI Mobile-First**:
   - Layout focado em telas de smartphone (360px a 430px de largura base).
   - Navegação principal obrigatoriamente por **Navbar fixa inferior** com 5 seções bem delimitadas.
   - Áreas de toque mínimas de 44x44px e zonas de fácil alcance do polegar (*thumb zone*).

2. **Limite Global de 100 Usuários**:
   - O banco de dados e a camada de autenticação devem travar rigorosamente a criação do 101º usuário.
   - Tela inicial exibe aviso explicativo quando `total_usuarios >= 100` e esconde formulários de novo cadastro (tanto manual quanto OAuth).

3. **Limites de Propriedade**:
   - Cada usuário só pode criar no máximo **1 casa**.
   - Cada usuário pode participar como membro de **múltiplas casas**.
   - Cada casa pode possuir no máximo **34 badges no total** (14 do sistema + até 20 customizados).

4. **Hierarquia Rígida de Permissões**:
   - **Apenas o criador da casa** pode: criar badges customizados, editar badges, excluir badges e excluir a casa.
   - **Qualquer membro vinculado** pode: registrar faxinas, editar suas próprias faxinas registradas e visualizar o histórico.

5. **Auditoria Obrigatória de Exclusões**:
   - Toda exclusão de casa ou de badge gera obrigatoriamente um registro no log de exclusão contendo:
     - Data e hora exata da exclusão (UTC/ISO-8601).
     - Identificador e nome de quem realizou a exclusão.
     - Descrição detalhada do que foi excluído (nome da casa, nome do badge, quantidade de vínculos afetados).

---

## 4. Estrutura do Harness `.agents/`

O diretório `.agents/` é o centro de controle da inteligência e governança do projeto:

- **`rules/`**: Diretrizes arquiteturais, de segurança e de UX/UI carregadas contextualmente.
- **`skills/`**: Habilidades operacionais do agente:
  - `spec-driven-dev`: Para criação e refinamento de especificações BDD.
  - `backlog-manager`: Para gestão sistemática de tarefas e dependências.
  - `compliance-audit`: Para auditoria de código contra as restrições mandatórias.
- **`workflows/`**: Procedimentos passo a passo para ciclo de vida de features, correções e releases.
- **`templates/`**: Modelos padronizados de especificações técnicas, tickets de tarefas e esquemas de logs.
- **`references/`**: Documentos de verdade arquitetural, regras de negócio e tokens de design.
- **`backlog/`**: Backlog vivo de épicos, estórias, tarefas e o plano de desenvolvimento em fases.

---

## 5. Diretrizes de Stack e Padrões de Código

- **Frontend/Mobile**: Next.js (App Router) ou React PWA com TypeScript, Mobile-First.
- **Estilos**: CSS modularizado/Tailwind com variáveis semânticas de design tokens, suporte a Dark/Light mode e micro-animações táteis.
- **Backend/Database**: Supabase / PostgreSQL com Row Level Security (RLS) habilitado em todas as tabelas e triggers de validação de teto.
- **Testes**: Cobertura de testes unitários para regras de domínio e testes E2E/integração para fluxos críticos de permissão e limites.
