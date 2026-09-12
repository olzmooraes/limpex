# Limpex — Gerenciador de Faxinas Mobile-First

O **Limpex** é um aplicativo mobile-first para gerenciamento de faxinas e tarefas domésticas compartilhadas entre membros de uma residência, com controle de histórico semanal, limites inteligentes e gestão ergonômica de tarefas.

---

## Estrutura de Desenvolvimento Assistido por IA (.agents)

Este projeto adota a metodologia **Spec-Driven Development (SDD)** com um **Harness de IA** totalmente configurado na pasta [`.agents/`](file:///c:/projetos/limpex/.agents/AGENTS.md):

- **[AGENTS.md](file:///c:/projetos/limpex/.agents/AGENTS.md)**: Guia mestre, princípios inegociáveis e papel do agente.
- **[Rules](file:///c:/projetos/limpex/.agents/rules/)**: Regras de arquitetura SDD, usabilidade mobile-first e segurança de limites.
- **[Skills](file:///c:/projetos/limpex/.agents/skills/)**: Habilidades operacionais especializadas (`spec-driven-dev`, `backlog-manager`, `compliance-audit`).
- **[Workflows](file:///c:/projetos/limpex/.agents/workflows/)**: Fluxos de ciclo de vida de features, resolução de bugs e checklists de release.
- **[Templates](file:///c:/projetos/limpex/.agents/templates/)**: Modelos BDD para especificações técnicas e tarefas de desenvolvimento.
- **[References](file:///c:/projetos/limpex/.agents/references/)**: Regras de negócio compiladas, modelo de dados e tokens visuais.
- **[Backlog](file:///c:/projetos/limpex/.agents/backlog/backlog.md)** & **[Plano de Desenvolvimento](file:///c:/projetos/limpex/.agents/backlog/development_plan.md)**: Rastreamento completo dos 6 épicos e marcos de entrega.

---

## 5 Restrições Inegociáveis do Limpex

1. **Padrão Mobile-First**: Interface otimizada para toque com Bottom Navbar fixa de 5 posições.
2. **Limite Global de 100 Usuários**: Bloqueio total de novos cadastros ao atingir 100 usuários no banco de dados.
3. **Limites de Propriedade**: Máximo de 1 casa criada por usuário; máximo de 34 badges por casa (14 do sistema + até 20 customizados).
4. **Hierarquia de Permissões**: Gestão de badges e exclusão da casa restritas exclusivamente ao criador da residência.
5. **Auditoria de Exclusão**: Registro obrigatório de logs imutáveis na exclusão de casas ou badges.
