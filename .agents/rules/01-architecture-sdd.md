# Regra de Arquitetura: Spec-Driven Development (SDD)

Esta regra orienta como o software do Limpex deve ser arquitetado, modularizado e construído através de especificações formais.

---

## 1. O Ciclo Spec-Driven Development (SDD)

No Limpex, o código é um reflexo direto de uma especificação formal. Nenhuma funcionalidade deve ser codificada sem passar pelas etapas:

1. **Seleção de Item do Backlog**: Identificar a tarefa em [.agents/backlog/backlog.md](file:///c:/projetos/limpex/.agents/backlog/backlog.md).
2. **Criação da Spec**: Criar um arquivo `.agents/specs/SPEC-XXX-<nome>.md` usando [.agents/templates/feature-spec-template.md](file:///c:/projetos/limpex/.agents/templates/feature-spec-template.md).
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

O projeto deve manter clara separação entre camadas de responsabilidade:

```
src/
├── app/                  # Rotas e páginas (Next.js App Router / PWA)
├── components/           # Componentes de UI desacoplados e reutilizáveis
│   ├── ui/               # Botões, inputs, modais, badges genéricos
│   └── cleaning/         # Componentes específicos de faxina, semana e casas
├── domain/               # Entidades, tipos e lógica pura de negócio
│   ├── models/           # User, House, CleaningRecord, Badge, AuditLog
│   └── rules/            # Validadores de limites (100 users, 34 badges, 1 casa)
├── services/             # Clientes de API, Supabase e persistência
├── hooks/                # Custom React hooks para estado e interações
└── lib/                  # Utilitários gerais (formatadores de data, helpers)
```

---

## 3. Gestão de Estado e Reatividade

- **Estado Local vs Global**: Estado de formulário e UI em componentes locais; dados de sessão, casa ativa e faxinas em hooks/contextos leves.
- **Filtros Temporais Reativos**: O cálculo da "semana vigente" deve ser feito de forma determinística a partir da data atual do cliente/servidor, sem mutação destrutiva de dados históricos.
- **Tratamento de Erros Resiliente**: Toda operação assíncrona deve prever estados de carregamento (skeletons), sucesso (toasts táteis) e falha com mensagens em português claro e amigável.
