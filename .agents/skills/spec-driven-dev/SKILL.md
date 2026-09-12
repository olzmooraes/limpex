---
name: spec-driven-dev
description: >-
  Use this skill whenever the user or agent needs to specify, design, or refine a new feature, API endpoint, or UI component before writing code, ensuring adherence to Spec-Driven Development (SDD).
---

# Skill: Spec-Driven Development (SDD)

Esta skill orienta o processo de transformar itens do backlog ou ideias em especificações formais, testáveis e completas antes de qualquer implementação de código.

---

## Procedimento de Execução

### Passo 1: Obter Contexto do Item
1. Localize o item em [.agents/backlog/backlog.md](file:///c:/projetos/limpex/.agents/backlog/backlog.md).
2. Verifique os pré-requisitos, regras de negócio em [.agents/references/business-rules.md](file:///c:/projetos/limpex/.agents/references/business-rules.md) e modelos em [.agents/references/domain-model.md](file:///c:/projetos/limpex/.agents/references/domain-model.md).

### Passo 2: Criar o Arquivo de Especificação
1. Crie um novo arquivo em `.agents/specs/SPEC-<NUMERO>-<nome-da-feature>.md` usando o modelo padrão [.agents/templates/feature-spec-template.md](file:///c:/projetos/limpex/.agents/templates/feature-spec-template.md).
2. Preencha detalhadamente:
   - **Objetivo & Contexto**: Problema que resolve.
   - **Regras de Negócio Envolvidas**: Quais limites ou permissões são impactados.
   - **Cenários BDD (Gherkin)**: `Cenário: ... Dado ... Quando ... Então ...` cobrindo casos de sucesso e cenários de erro/limite.
   - **Contratos de Interface & Dados**: Schemas TypeScript, endpoints, queries de banco.
   - **Especificação UX/UI**: Layout, estados de loading, mensagens de erro e alvos de toque.
   - **Plano de Testes**: Testes unitários e de integração necessários.

### Passo 3: Revisão e Validação
1. Apresente o resumo da spec para o usuário caso haja decisões de UI ou regras ambíguas.
2. Atualize o status do item no backlog para `SPEC_APPROVED`.

### Passo 4: Transição para Código
1. Após a spec estar completa, proceda com o workflow [.agents/workflows/feature-lifecycle.md](file:///c:/projetos/limpex/.agents/workflows/feature-lifecycle.md).
