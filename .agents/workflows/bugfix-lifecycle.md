# Workflow: Resolução de Bugs e Regressões (Bugfix Lifecycle)

Procedimento padrão para diagnóstico, reprodução, correção e garantia de não-regressão no Limpex.

---

## Fases do Fluxo

### 1. Triagem e Reprodução
1. Identificar o comportamento anômalo relatado.
2. Determinar qual regra de negócio ou especificação foi violada.
3. Isolar o ambiente e escrever um teste automatizado mínimo que reproduza a falha (o teste deve falhar).

### 2. Avaliação de Impacto e Restrições
1. Avaliar se o bug compromete alguma das 5 restrições obrigatórias:
   - Limite de 100 usuários.
   - Limite de 34 badges.
   - 1 casa por usuário.
   - Permissões de dono vs membro.
   - Logs de exclusão.
2. Se afetar restrições, classificar como severidade **P0 (Crítico)**.

### 3. Aplicação do Patch
1. Implementar a correção na menor camada necessária (Domínio > Serviço > UI).
2. Executar o teste de regressão criado no passo 1 até que passe.
3. Executar toda a suíte de testes do projeto para garantir zero efeitos colaterais.

### 4. Fechamento e Documentação
1. Documentar brevemente a causa raiz no ticket/backlog.
2. Atualizar a especificação correspondente em `.agents/specs/` se o bug decorreu de ambiguidade na regra original.
