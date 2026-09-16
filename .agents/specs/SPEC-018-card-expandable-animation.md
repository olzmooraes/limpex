# SPEC-018: Card Expansível de Faxina com Micro-Animação

- **Status**: APPROVED
- **Épico**: [EPIC 4 - Registro de Faxina e Tela Principal Semanal](file:///c:/projetos/limpex/.agents/backlog/backlog.md)
- **Autor**: Agente AI / Arquiteto
- **Data de Criação**: 2026-09-15
- **Última Atualização**: 2026-09-15
- **Tarefa Relacionada**: `TSK-405` (dependência: `TSK-404` — cards da semana vigente)
- **Depende de**: [SPEC-017-home-week-screen.md](file:///c:/projetos/limpex/.agents/specs/SPEC-017-home-week-screen.md) e [SPEC-014-bottom-navbar.md](file:///c:/projetos/limpex/.agents/specs/SPEC-014-bottom-navbar.md)

---

## 1. Contexto e Objetivo

A tarefa `TSK-404` entregou os cards reais da semana vigente na aba **Início**, com a lógica básica de alternância entre colapsado e expandido. No entanto, a expansão e o recolhimento ocorrem de maneira instantânea (corte abrupto de elementos no DOM), o chevron é substituído sem rotação e o bloco de observações aparece sem transição suave.

A **TSK-405** tem como objetivo implementar a **micro-animação fluida e ergonômica** do card expansível para registros que contenham **mais de 2 tarefas** (conforme exigido pela **RN-07** e pela **Restrição Obrigatória nº 1 — UX Mobile-First**):
1. Transição suave de altura utilizando técnica moderna CSS (`grid-template-rows: 0fr ➔ 1fr` ou transição de `max-height`/`opacity` com curva cúbica `--transition-normal`).
2. Rotação suave de 180° do ícone chevron (`transform: rotate(180deg)`), mantendo o ícone estável e animado.
3. Aparição gradual (*staggered fade-in / slide-up*) dos badges excedentes (tarefas 3 a N) e da caixa de observações (*notesBox*).
4. Acessibilidade completa (`aria-expanded`, `aria-controls`) e respeito à diretiva de acessibilidade `@media (prefers-reduced-motion: reduce)`.
5. Isolamento componentizado criando o componente dedicado `CleaningCard.tsx` para garantir reutilização futura (inclusive no Épico 5 — Histórico).

---

## 2. Regras de Negócio e Restrições Envolvidas

- **RN-07 (Cards de Faxinas Realizadas)**:
  - Registro com **até 2 tarefas**: não exibe botão de expansão; os badges são mostrados em linha/wrap estático.
  - Registro com **mais de 2 tarefas**: o card deve ser expansível, exibindo inicialmente apenas as 2 primeiras tarefas com indicação visual para expansão (ex: `+ N tarefas executadas`).
  - Ao expandir, exibe todas as tarefas com animação suave; ao recolher, volta aos 2 itens.
- **Restrição Obrigatória nº 1 (UX Mobile-First)**:
  - Micro-transições suaves (150ms a 250ms) usando `--transition-normal` (`250ms cubic-bezier(0.4, 0, 0.2, 1)`).
  - Alvos de toque mínimos de 44x44px (`min-height: var(--touch-target-min, 44px)`).
  - Sem quebra de layout (*layout thrashing*) ou travamento de frame (60fps no mobile).
- **Acessibilidade**:
  - Respeito a `prefers-reduced-motion`.
  - Botão de expansão com `aria-expanded="true|false"` e `aria-controls`.

---

## 3. Cenários de Aceite BDD (Gherkin)

### Cenário 1: Card com até 2 tarefas (não expansível)
- **Dado** um registro de faxina com 1 ou 2 badges
- **Quando** o card é renderizado na tela principal
- **Então** os badges são exibidos diretamente
- **E** o botão de expansão (`+ N tarefas executadas`) **não** é renderizado
- **E** não há gatilho de micro-animação de badges

### Cenário 2: Card com mais de 2 tarefas (estado colapsado padrão)
- **Dado** um registro de faxina com 3 ou mais badges (ex: 4 badges)
- **Quando** o card é renderizado pela primeira vez
- **Então** apenas os 2 primeiros badges são exibidos na área inicial
- **E** os badges excedentes (3º e 4º) ficam ocultos na gaveta animada colapsada (`grid-template-rows: 0fr` / `opacity: 0`)
- **E** o botão de expansão exibe `+ 2 tarefas executadas` com chevron apontando para baixo (0deg)
- **E** o botão possui `aria-expanded="false"`

### Cenário 3: Ação de expansão com micro-animação
- **Dado** um card colapsado com mais de 2 tarefas
- **Quando** o usuário toca no botão de expansão
- **Então** o estado alterna para expandido (`aria-expanded="true"`)
- **E** o chevron executa rotação suave de 180° no sentido horário em 250ms
- **E** a gaveta de badges excedentes transiciona suavemente sua altura e opacidade (0fr ➔ 1fr / opacity 0 ➔ 1)
- **E** o texto do botão muda para `Recolher tarefas` (ou `Recolher`)
- **E** se o registro tiver observações, o bloco de notas (*notesBox*) é revelado com transição de opacidade

### Cenário 4: Ação de recolhimento suave
- **Dado** um card previamente expandido
- **Quando** o usuário toca no botão de expansão novamente
- **Então** o chevron rotaciona suavemente de volta para 0°
- **E** a gaveta de badges excedentes e a caixa de observações retraem suavemente sem salto visual brusco
- **E** o botão volta a exibir `+ N tarefas executadas` com `aria-expanded="false"`

### Cenário 5: Respeito a preferências de movimento reduzido
- **Dado** um dispositivo com a configuração do sistema `prefers-reduced-motion: reduce` ativa
- **Quando** o usuário alterna a expansão do card
- **Então** as transições ocorrem de forma instantânea sem interpolação de movimento

---

## 4. Arquitetura e Contratos de Componentes

### 4.1 Componente `src/components/cleaning/CleaningCard.tsx`

```typescript
import React from 'react';
import type { CleaningCardView } from '../../services/cleaningWeekView';

export interface CleaningCardProps {
  card: CleaningCardView;
  isExpanded: boolean;
  onToggleExpand: (recordId: string) => void;
}

export const CleaningCard: React.FC<CleaningCardProps>;
```

### 4.2 Camada de Domínio e Helpers `src/services/cardExpandable.ts`

```typescript
import type { CleaningCardView } from './cleaningWeekView';

export interface CardExpandableState {
  isExpandable: boolean;
  overflowCount: number;
  initialBadges: string[];
  overflowBadges: string[];
  expandLabel: string;
  collapseLabel: string;
}

export function deriveCardExpandableState(card: CleaningCardView): CardExpandableState;
```

- **`initialBadges`**: sempre até os 2 primeiros itens.
- **`overflowBadges`**: itens a partir do 3º (índice 2 em diante).
- **`expandLabel`**: `+ ${overflowCount} ${overflowCount === 1 ? 'tarefa executada' : 'tarefas executadas'}`.
- **`collapseLabel`**: `'Recolher tarefas'`.

### 4.3 Estrutura de Micro-Animação CSS (`CleaningCard.module.css`)

```css
/* Chevron rotativo de 180° */
.chevronIcon {
  transition: transform var(--transition-normal);
  transform: rotate(0deg);
}

.chevronExpanded {
  transform: rotate(180deg);
}

/* Gaveta CSS Grid para transição perfeita de altura */
.overflowDrawer {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows var(--transition-normal), opacity var(--transition-normal);
  opacity: 0;
}

.overflowDrawerExpanded {
  grid-template-rows: 1fr;
  opacity: 1;
}

.drawerInner {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Redução de movimento para acessibilidade */
@media (prefers-reduced-motion: reduce) {
  .chevronIcon,
  .overflowDrawer,
  .notesBox {
    transition: none !important;
  }
}
```

---

## 5. Plano de Testes

- **Testes de Domínio e Comportamento** (`src/tests/card-expandable-tsk405.test.ts`):
  1. `deriveCardExpandableState` com 1 badge: `isExpandable === false`, `overflowCount === 0`, `overflowBadges` vazio.
  2. `deriveCardExpandableState` com 2 badges: `isExpandable === false`, `overflowCount === 0`, `initialBadges.length === 2`.
  3. `deriveCardExpandableState` com 3 badges: `isExpandable === true`, `overflowCount === 1`, rótulo singular `+ 1 tarefa executada`.
  4. `deriveCardExpandableState` com 5 badges: `isExpandable === true`, `overflowCount === 3`, rótulo plural `+ 3 tarefas executadas`.
  5. Preservação da ordem de todos os badges entre `initialBadges` e `overflowBadges`.
  6. Rótulo de recolhimento padronizado (`Recolher tarefas`).
- **Suíte de Auditoria do Épico 4**:
  - Registro do **Gate 5** em `src/tests/runEpic4Audit.ts` (5 gates / ≥ 150 verificações totais).
