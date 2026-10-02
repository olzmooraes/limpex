# Regra de Arquitetura: Spec-Driven Development (SDD)

Esta regra orienta como o software do Limpex deve ser arquitetado, modularizado e construído através de especificações formais.

---

## 1. O Ciclo Spec-Driven Development (SDD)

No Limpex, o código é um reflexo direto de uma especificação formal. Nenhuma funcionalidade deve ser codificada sem passar pelas etapas:

1. **Seleção de Item do Backlog**: Identificar a tarefa em [.agents/backlog/backlog.md](../backlog/backlog.md).
2. **Criação da Spec**: Criar um arquivo `.agents/specs/SPEC-XXX-<nome>.md` usando [.agents/templates/feature-spec-template.md](../templates/feature-spec-template.md).
3. **Definição de Contratos & Schemas**:
   - Modelos de dados (TypeScript interfaces / Zod schemas / SQL DDL).
   - Endpoints ou queries Supabase/PostgreSQL.
   - Cenários BDD (Given / When / Then).
4. **Alinhamento / Aprovação**: Apresentar ao usuário quando envolver decisões de interface ou modelo de dados.
5. **Implementação Guiada por Testes (TDD)**:
   - Escrever testes unitários e de integração para validar os critérios da spec.
   - Implementar a lógica de negócio e os componentes de interface.
6. **Auditoria de Conformidade**: Executar verificação contra restrições de negócio usando a skill `compliance-audit`.
7. **Atualização do Backlog**: Marcar a tarefa como `DONE` com link para a spec correspondente.

---

## 2. Princípios de Separação de Camadas (Clean Boundaries)

O projeto mantém separação entre camadas de responsabilidade (estrutura real desde a TSK-703):

```
src/
├── App.tsx               # Decide a tela pela sessão (login, nova senha, app)
├── screens/              # MainShell (cabeçalho + abas + navbar) e uma tela por aba
├── components/           # Componentes de UI reutilizáveis (auth, badges, cleaning, layout)
├── hooks/                # useSession, useHouses, useHouseData, useCurrentWeek...
├── data/                 # Acesso ao Supabase: leitura via RLS, escrita via RPC, mapeamentos
├── domain/               # Lógica pura de negócio sem dependências (ex.: week.ts — SPEC-020)
├── services/             # Lógica de apresentação e validação no cliente (retorno imediato)
├── lib/                  # Cliente Supabase e tradução de erros (AppError)
├── integration/          # Testes de integração contra o Supabase local (*.int.spec.ts)
└── types/                # Tipos do app e tipos gerados do banco (database.ts)
supabase/
├── migrations/           # Fonte da verdade do banco (SPEC-021)
├── tests/database/       # Testes pgTAP
└── seed.sql              # Dados só de desenvolvimento
```

- **Regras de negócio:** são aplicadas pelo banco (RLS, triggers e RPCs). O cliente só antecipa validações para dar retorno imediato.
- **Acesso a dados:** componentes e telas nunca chamam o Supabase direto; usam `src/data/`.

---

## 3. Gestão de Estado e Reatividade

- **Estado Local vs Global**: Estado de formulário e UI em componentes locais; dados de sessão, casa ativa e faxinas em hooks/contextos leves.
- **Filtros Temporais Reativos**: O cálculo da "semana vigente" deve ser feito de forma determinística a partir da data atual do cliente/servidor, sem mutação destrutiva de dados históricos.
- **Tratamento de Erros Resiliente**: Toda operação assíncrona deve prever estados de carregamento (skeletons), sucesso (toasts táteis) e falha com mensagens em português claro e amigável.
