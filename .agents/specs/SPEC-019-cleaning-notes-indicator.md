# SPEC-019: Ícone Indicativo Visual para Registros com Observações/Ressalvas

- **Status**: APPROVED
- **Épico**: [EPIC 4 - Registro de Faxina e Tela Principal Semanal](file:///c:/projetos/limpex/.agents/backlog/backlog.md)
- **Autor**: Agente AI / Arquiteto Fullstack
- **Data de Criação**: 2026-09-17
- **Última Atualização**: 2026-09-17
- **Tarefa Relacionada**: `TSK-406` (dependência: `TSK-404` — cards da semana vigente)
- **Depende de**: [SPEC-017-home-week-screen.md](file:///c:/projetos/limpex/.agents/specs/SPEC-017-home-week-screen.md) e [SPEC-018-card-expandable-animation.md](file:///c:/projetos/limpex/.agents/specs/SPEC-018-card-expandable-animation.md)

---

## 1. Contexto e Objetivo

Na especificação original do aplicativo (Item 7.4 da `especificacao_app_faxina.md`) e nas regras de negócio (**RN-07**), é explicitamente exigido:
> *"Ícone indicativo visual caso haja observações ou ressalvas anexadas."*

Durante a execução da `TSK-404` e `TSK-405`, um primeiro esboço do ícone foi introduzido no cabeçalho do `CleaningCard.tsx`. Contudo, para atender plenamente aos padrões de excelência de UX/UI Mobile-First e aos requisitos de conformidade do Limpex, a **TSK-406** formaliza e entrega:
1. **Camada de domínio dedicada (`cleaningNotesIndicator.ts`)**: função determinística de derivação de estado visual, sanitização de notas, cálculo de acessibilidade (`aria-expanded`, `aria-controls`, `aria-label` dinâmico e tooltip contextual) e geração de ID semântico para a gaveta de notas.
2. **Ícone Indicativo Visual Refinado**:
   - Card sem observações: o ícone **não é exibido** (evitando poluição visual e espaços fantasmas).
   - Card com observações (estado colapsado): botão tátil destacado com gradiente de destaque ciano/accent, ícone semântico (`FileText`) e um ponto indicador sutil (*badge dot*) assinalando a presença de notas anexadas.
   - Card com observações (estado expandido): o botão assume estado ativo evidente (`noteIndicatorActive`), sincronizado com a abertura fluida da gaveta da caixa de notas.
3. **Ergonomia Mobile-First (Restrição Obrigatória nº 1)**:
   - Alvo de toque garantido de **no mínimo 44x44px** (`min-width: 44px; min-height: 44px`), assegurando conforto em dispositivos móveis (*thumb zone*).
   - Feedback tátil de escala ao clique/toque (`:active { transform: scale(0.94); }`).
4. **Resiliência de Conteúdo**:
   - Suporte a observações de até 500 caracteres (`CLEANING_NOTES_MAX_LENGTH`), com quebra de palavras segura (`overflow-wrap: anywhere; word-break: break-word; white-space: pre-wrap;`) impedindo qualquer extravasamento horizontal no card.
   - Tratamento estrito de notas contendo apenas espaços em branco (não consideradas notas válidas).
5. **Independência Operacional**:
   - Em cards que possuem até 2 tarefas (que não exibem o botão de expansão de tarefas da TSK-405), o ícone de notas permite alternar a visualização da observação de forma independente e acessível.

---

## 2. Regras de Negócio e Restrições Envolvidas

- **RN-07 (Cards de Faxinas Realizadas - Indicativo Visual de Observações)**:
  - Se o registro possuir observações válidas (`notes.trim().length > 0`), o ícone indicativo visual é obrigatoriamente renderizado no cabeçalho do card.
  - Se o registro não possuir notas ou contiver apenas espaços em branco, o ícone não é renderizado.
- **RN-09 (Formulário e Validação de Observações)**:
  - Observações são textos opcionais de até 500 caracteres (`CLEANING_NOTES_MAX_LENGTH`). O componente deve renderizar textos multilinha ou extensos com quebra natural.
- **Restrição Obrigatória nº 1 (Padrão UX/UI Mobile-First)**:
  - Alvos de toque mínimos de 44x44px.
  - Micro-animação suave com `--transition-normal` e suporte a `@media (prefers-reduced-motion: reduce)`.
  - Cores e contrastes semânticos usando os tokens de design do Limpex (`--color-accent-400`, `--color-accent-500`, `--bg-surface-elevated`).
- **Restrições nº 2, nº 3, nº 4 e nº 5**:
  - Totalmente preservadas sem qualquer modificação ou afrouxamento de limites e regras de permissão.

---

## 3. Cenários de Aceite BDD (Gherkin)

### Cenário 1: Registro sem observações (ausência de ícone indicativo)
- **Dado** um registro de faxina no qual `notes` é `undefined`, `null` ou string vazia `""`
- **Quando** o card é renderizado na tela principal
- **Então** o ícone indicativo visual de observações **não** é renderizado
- **E** a gaveta de notas **não** é renderizada no DOM.

### Cenário 2: Registro com notas contendo apenas espaços em branco
- **Dado** um registro de faxina no qual `notes` é `"   "`
- **Quando** o estado do indicador é derivado pela camada de domínio
- **Então** `hasNotes` é avaliado como `false`
- **E** o ícone indicativo visual **não** é renderizado.

### Cenário 3: Registro com observação válida em estado colapsado padrão
- **Dado** um registro de faxina com a observação `"Limpeza com desinfetante especial no piso."`
- **E** o card encontra-se no estado colapsado (`isExpanded = false`)
- **Quando** o card é renderizado
- **Então** o botão do ícone indicativo é renderizado no canto superior direito do card
- **E** o botão possui dimensão de toque mínima de 44x44px
- **E** o botão exibe o ícone `FileText` e o ponto de alerta (*badge dot*)
- **E** o atributo `aria-expanded` é `"false"`
- **E** o atributo `aria-label` é `"Ver observações adicionais desta faxina"`
- **E** o atributo `aria-controls` referencia o identificador semântico `notes-drawer-{recordId}`
- **E** a caixa de notas permanece oculta.

### Cenário 4: Interação por toque no ícone indicativo (expansão da observação)
- **Dado** um card colapsado que possui observação válida
- **Quando** o usuário toca no botão do ícone indicativo
- **Então** a função `onToggleExpand` é acionada com o `recordId` correspondente
- **E** o estado do card transiciona para expandido (`isExpanded = true`)
- **E** o botão assume a classe visual ativa (`noteIndicatorActive`)
- **E** o atributo `aria-expanded` torna-se `"true"`
- **E** o atributo `aria-label` torna-se `"Ocultar observações adicionais desta faxina"`
- **E** a gaveta de notas é animada suavemente revelando o texto `"Obs: Limpeza com desinfetante especial no piso."`.

### Cenário 5: Card com até 2 tarefas e com observação
- **Dado** um registro de faxina com apenas 1 ou 2 tarefas (não expansível via botão de badges TSK-405)
- **E** o registro possui uma observação preenchida
- **Quando** o card é renderizado
- **Então** o botão de expansão de badges (`+ N tarefas`) **não** é renderizado
- **E** o botão do ícone indicativo de notas **é** renderizado
- **E** tocar no ícone abre suavemente a caixa de notas sem exigir múltiplos badges.

### Cenário 6: Registro com observação extensa (até 500 caracteres)
- **Dado** um registro de faxina com observação de 500 caracteres contendo palavras longas ou quebras de linha
- **Quando** o card é expandido
- **Então** todo o texto é exibido com integridade
- **E** quebras de linha são respeitadas com `white-space: pre-wrap`
- **E** não ocorre overflow horizontal ou quebra da largura máxima do card (360px a 430px).

### Cenário 7: Acessibilidade e preferência de movimento reduzido
- **Dado** um usuário navegando com leitor de tela ou com `prefers-reduced-motion: reduce`
- **Quando** ele foca e ativa o botão de notas
- **Então** o leitor anuncia claramente a finalidade e o estado (`aria-expanded` e `aria-label`)
- **E** as transições ocorrem sem animação de movimento se `prefers-reduced-motion` estiver ativo.

---

## 4. Contratos de Dados e Camada de Domínio

### 4.1 Interface `CleaningNotesIndicatorState` (`src/services/cleaningNotesIndicator.ts`)

```typescript
export interface CleaningNotesIndicatorState {
  /** Se o ícone indicativo deve ser exibido na UI */
  isVisible: boolean;
  /** Texto sanitizado da observação (ou undefined se inexistente) */
  sanitizedNotes?: string;
  /** Identificador semântico do elemento da gaveta de notas (aria-controls) */
  notesDrawerId: string;
  /** Rótulo acessível dinâmico para aria-label */
  ariaLabel: string;
  /** Tooltip explicativo para o atributo title */
  tooltip: string;
  /** Se o indicador está em estado aberto/ativo */
  isActive: boolean;
}
```

### 4.2 Funções de Domínio

```typescript
/**
 * Verifica se a string de notas é válida (não vazia e não composta apenas por espaços).
 */
export function hasValidNotes(notes?: string | null): boolean;

/**
 * Gera o ID semântico para a gaveta de notas.
 */
export function getNotesDrawerId(recordId: string): string;

/**
 * Deriva o estado completo do indicador visual de notas do card.
 */
export function deriveNotesIndicatorState(
  recordId: string,
  rawNotes?: string | null,
  isExpanded: boolean = false
): CleaningNotesIndicatorState;
```

---

## 5. Especificação UX/UI Mobile

- **Posicionamento**: Topo direito do card (`.cardHeader`), alinhado verticalmente com as informações do responsável.
- **Dimensões**: `min-width: 44px; min-height: 44px;` para estrita conformidade com a Restrição nº 1.
- **Cores & Efeitos**:
  - Padrão colapsado: `background-color: rgba(6, 182, 212, 0.12); color: var(--color-accent-400);`
  - Badge dot: círculo de 7x7px em `var(--color-accent-400)` posicionado de forma absoluta no canto superior direito do botão com borda de contraste de 2px `var(--bg-surface)`.
  - Padrão expandido: `background: linear-gradient(135deg, var(--color-accent-500), var(--color-primary-600)); color: #ffffff; box-shadow: 0 2px 8px rgba(6, 182, 212, 0.3);`
- **Caixa de Observações (`.notesBox`)**:
  - `background-color: var(--bg-app); border-left: 3px solid var(--color-accent-500);`
  - Ícone de informação `Info` à esquerda (14px).
  - Texto: `color: var(--text-secondary); font-size: 12px; line-height: 1.45; word-break: break-word; white-space: pre-wrap;`
- **Transições**:
  - `transition: all var(--transition-normal);`
  - Respeito à media query `@media (prefers-reduced-motion: reduce)`.

---

## 6. Plano de Testes e Auditoria

1. **Testes Unitários de Domínio (`src/tests/cleaning-notes-indicator-tsk406.test.ts`)**:
   - Cenários 1 a 7 descritos nesta spec com validações completas:
     - `hasValidNotes` com null, undefined, "", "   ", e textos válidos.
     - `deriveNotesIndicatorState` para colapsado vs expandido.
     - Verificação de rótulos de acessibilidade, IDs e tooltips.
     - Teste de notas com 500 caracteres (`CLEANING_NOTES_MAX_LENGTH`).
     - Integração com `buildCleaningCardView` e `CleaningCard`.
2. **Integração no Runner Consolidado (`src/tests/runEpic4Audit.ts`)**:
   - Inclusão do **Gate 6**: *"Ícone Indicativo Visual de Observações (TSK-406 / SPEC-019)"*.
3. **Auditoria de Conformidade (`compliance-audit`)**:
   - Verificação das 5 regras de ouro do Limpex.
