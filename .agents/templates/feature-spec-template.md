# SPEC-[ID]: [Nome da Funcionalidade]

- **Status**: [DRAFT | IN_REVIEW | APPROVED | IMPLEMENTED]
- **Épico**: [[EPIC-ID] - Título do Épico](file:///c:/projetos/limpex/.agents/backlog/backlog.md)
- **Autor**: Agente AI / Arquiteto
- **Data de Criação**: [AAAA-MM-DD]
- **Última Atualização**: [AAAA-MM-DD]

---

## 1. Contexto e Objetivo
Descreva de forma concisa o que esta funcionalidade entrega e qual necessidade do usuário ela atende no contexto mobile do Limpex.

---

## 2. Regras de Negócio Envolvidas
Liste as regras e restrições obrigatórias impactadas (ver [.agents/references/business-rules.md](file:///c:/projetos/limpex/.agents/references/business-rules.md)):
- [ ] Limite de 100 usuários
- [ ] Limite de 1 casa por criador
- [ ] Limite de 34 badges por casa
- [ ] Permissão exclusiva do criador
- [ ] Registro de log de auditoria na exclusão

---

## 3. Cenários de Aceite BDD (Gherkin)

### Cenário 1: [Fluxo Principal de Sucesso]
- **Dado** que um usuário está autenticado na casa X
- **Quando** ele preenche o formulário de faxina com badges válidos
- **Então** o registro deve ser salvo com sucesso
- **E** exibido imediatamente na lista de faxinas da semana vigente.

### Cenário 2: [Cenário de Limite ou Restrição]
- **Dado** que a casa já possui 34 badges cadastrados
- **Quando** o criador da casa tenta adicionar um 35º badge
- **Então** o sistema deve bloquear a ação e exibir uma mensagem informativa.

---

## 4. Contratos de Dados e Schemas
Especifique as interfaces TypeScript, contratos de API e modelos de banco de dados envolvidos.

```typescript
// Exemplo de interface
export interface CleaningRecord {
  id: string;
  houseId: string;
  userId: string;
  dayOfWeek: 'dom' | 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab';
  badgeIds: string[];
  notes?: string;
  createdAt: string;
}
```

---

## 5. Especificação de UX/UI Mobile
- **Tela / Posição na Navbar**: [Ex: Item 3 - Central da Navbar]
- **Componentes de Interface**: [Inputs, Badges, Botões de ação]
- **Estados Visuais**: Loading, Sucesso, Validação de Erro, Estado Vazio.
- **Dimensões e Touch**: Garantir área mínima de toque de 44x44px.

---

## 6. Plano de Testes
- **Testes Unitários**: Funções de domínio e validação de regras.
- **Testes de Integração**: Interação com o banco de dados / serviços.
- **Testes de Interface**: Renderização correta e responsividade mobile.
