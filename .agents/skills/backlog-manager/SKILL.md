---
name: backlog-manager
description: >-
  Use this skill to manage, prioritize, triage, and update tasks, epics, and milestones in the Limpex backlog and development plan.
---

# Skill: Backlog Manager

Esta skill padroniza o ciclo de vida dos itens do backlog do Limpex, assegurando rastreabilidade total entre planos, especificações e código entregue.

---

## Ciclo de Estados de um Item

Todo item no [.agents/backlog/backlog.md](file:///c:/projetos/limpex/.agents/backlog/backlog.md) segue os estados:

```
[BACKLOG] ➔ [TODO] ➔ [SPEC_DRAFTING] ➔ [SPEC_APPROVED] ➔ [IN_PROGRESS] ➔ [REVIEW/TESTING] ➔ [DONE]
```

### Definições dos Estados:
- `BACKLOG`: Item levantado, mas ainda sem detalhamento imediato.
- `TODO`: Item priorizado para a iteração atual.
- `SPEC_DRAFTING`: Especificação técnica em elaboração no diretório `.agents/specs/`.
- `SPEC_APPROVED`: Especificação aprovada e pronta para desenvolvimento.
- `IN_PROGRESS`: Tarefa sendo ativamente implementada (código / testes).
- `REVIEW/TESTING`: Código escrito, testes em execução e verificação de conformidade.
- `DONE`: Requisito verificado, testes passando e critérios de aceite cumpridos.

---

## Procedimento de Execução

### 1. Iniciar Trabalho em um Item
1. Abra [.agents/backlog/backlog.md](file:///c:/projetos/limpex/.agents/backlog/backlog.md).
2. Verifique se as dependências do item estão `DONE`.
3. Altere o status da tarefa para `IN_PROGRESS`.
4. Inclua data/hora de início e referência da spec.

### 2. Concluir Trabalho em um Item
1. Certifique-se de que os testes automatizados correspondentes foram executados e passaram.
2. Certifique-se de que a auditoria de conformidade com [.agents/skills/compliance-audit/SKILL.md](file:///c:/projetos/limpex/.agents/skills/compliance-audit/SKILL.md) foi realizada.
3. Atualize o status da tarefa no backlog para `DONE` com a data de conclusão e links para os artefatos/arquivos gerados.
4. Verifique o impacto no [.agents/backlog/development_plan.md](file:///c:/projetos/limpex/.agents/backlog/development_plan.md).
