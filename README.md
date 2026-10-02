# Limpex — Gerenciador de Faxinas Mobile-First

O **Limpex** é um aplicativo mobile-first para gerenciamento de faxinas e tarefas domésticas compartilhadas entre membros de uma residência, com controle de histórico semanal, limites inteligentes e gestão ergonômica de tarefas.

---

## Como rodar

Requisitos: Node.js 20+ e Docker Desktop em execução (para o Supabase local).

```bash
npm install
npm run db:start    # sobe o Supabase local (1ª vez baixa as imagens)
npm run env:local   # gera o .env.local apontando o app para o Supabase local
npm run dev         # app em http://localhost:3000
```

Em desenvolvimento, a tela de login mostra atalhos para as contas de teste do seed. As contas são `luiz@exemplo.com`, `carlos@exemplo.com` e `mariana@exemplo.com`, todas com a senha `limpex123`. Elas só existem no banco local.

### Testes e verificação

```bash
npm test                  # testes unitários (Vitest)
npm run test:integration  # integração com o Supabase local (cadastro, login, dados)
npm run test:db           # testes do banco (pgTAP)
npm run typecheck         # checagem de tipos
npm run build             # build de produção em dist/
```

### Banco de dados local

```bash
npm run db:reset   # recria o banco (migrações + seed de desenvolvimento)
npm run db:types   # regenera src/types/database.ts a partir do banco
npm run db:stop    # desliga os contêineres
```

Com o banco no ar:
- Studio (painel visual): http://localhost:54323
- E-mails de teste (ex.: recuperação de senha): http://localhost:54324

### Publicação (Vercel)

O app é estático (Vite) e conversa direto com o Supabase. Na Vercel:
1. Importe o repositório do GitHub, com o preset Vite.
2. Configure as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com os dados do projeto Supabase na nuvem.

Cada push na `main` publica uma nova versão. Sem essas variáveis, o app mostra a tela "Limpex indisponível".

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
