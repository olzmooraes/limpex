# Limpex — Gerenciador de Faxinas Mobile-First

O **Limpex** é um aplicativo mobile-first para gerenciamento de faxinas e tarefas domésticas compartilhadas entre membros de uma residência, com controle de histórico semanal, limites inteligentes e gestão ergonômica de tarefas.

---

## Como rodar

Requisitos: Node.js 20+.

```bash
npm install
npm run dev        # servidor de desenvolvimento em http://localhost:3000
npm test           # testes (Vitest)
npm run typecheck  # checagem de tipos
npm run build      # build de produção em dist/
```

### Banco de dados local (Supabase)

Requisitos: Docker Desktop em execução.

```bash
npm run db:start   # sobe o Supabase local (1ª vez baixa as imagens)
npm run db:reset   # recria o banco aplicando as migrações de supabase/migrations
npm run test:db    # testes do banco (pgTAP)
npm run db:stop    # desliga os contêineres
```

Com o banco no ar:
- Studio (painel visual): http://localhost:54323
- E-mails de teste (ex.: recuperação de senha): http://localhost:54324

> **Estado atual:** o banco já existe ([SPEC-021](.agents/specs/SPEC-021-database-baseline.md)), mas o app ainda usa um mock no `localStorage` do navegador. A conexão do app ao banco é a próxima etapa ([Épico 7](.agents/backlog/backlog.md)).

---

## Estrutura de Desenvolvimento Assistido por IA (.agents)

Este projeto adota a metodologia **Spec-Driven Development (SDD)** com um **Harness de IA** totalmente configurado na pasta [`.agents/`](.agents/AGENTS.md):

- **[AGENTS.md](.agents/AGENTS.md)**: Guia mestre, princípios inegociáveis e papel do agente.
- **[Rules](.agents/rules/)**: Regras de arquitetura SDD, usabilidade mobile-first e segurança de limites.
- **[Skills](.agents/skills/)**: Habilidades operacionais especializadas (`spec-driven-dev`, `backlog-manager`, `compliance-audit`).
- **[Workflows](.agents/workflows/)**: Fluxos de ciclo de vida de features, resolução de bugs e checklists de release.
- **[Templates](.agents/templates/)**: Modelos BDD para especificações técnicas e tarefas de desenvolvimento.
- **[References](.agents/references/)**: Regras de negócio compiladas, modelo de dados e tokens visuais.
- **[Backlog](.agents/backlog/backlog.md)** & **[Plano de Desenvolvimento](.agents/backlog/development_plan.md)**: Rastreamento completo dos 6 épicos e marcos de entrega.

---

## 5 Restrições Inegociáveis do Limpex

1. **Padrão Mobile-First**: Interface otimizada para toque com Bottom Navbar fixa de 5 posições.
2. **Limite Global de 100 Usuários**: Bloqueio total de novos cadastros ao atingir 100 usuários no banco de dados.
3. **Limites de Propriedade**: Máximo de 1 casa criada por usuário; máximo de 34 badges por casa (14 do sistema + até 20 customizados).
4. **Hierarquia de Permissões**: Gestão de badges e exclusão da casa restritas exclusivamente ao criador da residência.
5. **Auditoria de Exclusão**: Registro obrigatório de logs imutáveis na exclusão de casas ou badges.
