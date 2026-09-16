# SPEC-017: Tela Principal — Cards de Faxinas Realizadas na Semana Vigente

- **Status**: APPROVED
- **Épico**: [EPIC 4 - Registro de Faxina e Tela Principal Semanal](file:///c:/projetos/limpex/.agents/backlog/backlog.md)
- **Autor**: Agente AI / Arquiteto
- **Data de Criação**: 2026-09-15
- **Última Atualização**: 2026-09-15
- **Tarefa Relacionada**: `TSK-404` (dependência: `TSK-403` — persistência e `getCleaningRecords`)
- **Depende de**: [SPEC-016-cleaning-persistence.md](file:///c:/projetos/limpex/.agents/specs/SPEC-016-cleaning-persistence.md) e [SPEC-014-bottom-navbar.md](file:///c:/projetos/limpex/.agents/specs/SPEC-014-bottom-navbar.md)

> **Escopo da TSK-404**: substituir o bloco *demo* hardcoded da aba **Início** (Item 1 da
> Navbar) por cards reais alimentados por `dbService.getCleaningRecords(activeHouse.id,
> { year, month, weekNumber })` da **semana vigente**. Comportamentos de base do card
> (expansão funcional acima de 2 tarefas e indicador de observações) já são exigidos pela
> RN-07 e entram nesta tarefa de forma funcional; o polimento visual (micro-animação —
> `TSK-405`) e o refinamento do indicador de notas (`TSK-406`) permanecem como tarefas
> posteriores.

---

## 1. Contexto e Objetivo

O `TSK-403` entregou a persistência de registros de faxina (`cleaning_records` +
`cleaning_badges`) e a consulta isolada por casa com filtros de `year/month/weekNumber`/
`userId`. A aba **Início** da Bottom Navbar ainda exibe **cards fictícios hardcoded**
(`demo-1`), sem conexão com o armazenamento. Esta spec formaliza a substituição do mock por
dados **reais da semana vigente**, com estados de loading/vazio/erro, contador dinâmico,
resolução dos nomes de badges via `getHouseBadges`, identificação clara do responsável (avatar
com iniciais + nome), dia da semana (`WEEKDAY_LABELS`) e as bases funcionais de expansão e de
indicador de observações previstas na RN-07.

A lógica de "semana vigente" é **determinística e derivada da data atual**
(`computeRecordWeek(now)` → `{ weekNumber, month, year }`), nunca mutando dados históricos — a
base da `TSK-407` (reset semanal). Nenhuma mutação destrutiva é realizada nesta tela.

Entregas:

- Camada de domínio testável `src/services/cleaningWeekView.ts` (contexto semanal,
  derivação de cards, iniciais, nomes de badges e visibilidade expandida).
- Substituição do bloco hardcoded da aba `home` em `App.tsx` por lista real de
  `CleaningCardView`, com contador, estados de loading/vazio e recarga após novo registro.
- Estilos adicionais em `App.module.css` (estado vazio, resumo semanal, cursor do card).
- Teste de domínio `home-week-tsk404.test.ts` registrado como **Gate 4** do runner
  `runEpic4Audit.ts`.

---

## 2. Regras de Negócio Envolvidas

- **RN-06 (Navegação & Cabeçalho)** — a tela principal exibe o resumo das faxinas realizadas na
  **semana vigente**, com Bottom Navbar fixa de 5 posições e logout no cabeçalho (mantidos).
- **RN-07 (Cards de Faxinas Realizadas)** — identificação clara do responsável (avatar +
  nome), dia da semana (`dom`..`sab`), lista de tarefas executadas (chips de badges),
  **expansível quando > 2 tarefas** e **ícone visível quando o registro possui notas**.
- **RN-08 (Reset Semanal)** — ao iniciar um novo ciclo semanal, a tela principal reinicia a
  visualização para a semana corrente (derivada da data atual); o histórico pretérito
  permanece intacto (não é tocado por esta tela).
- **RN-20 (Permissões de Registro)** — qualquer membro vinculado visualiza as faxinas da casa
  ativa (as consultas já isolam por `houseId` — RN-19).
- **RN-19 (Múltiplas Casas / Isolamento)** — a consulta é estritamente escopada à casa ativa;
  ao alternar de casa, a lista recarrega sem vazar registros de outras casas.
- **Restrição Obrigatória nº 1 (UX Mobile)** — alvos de toque ≥ 44px, espaçamentos ≥ 8px,
  micro-transições suaves e navegação por navbar fixa (padrões inalterados).

---

## 3. Cenários de Aceite BDD (Gherkin)

### Cenário 1: Cards reais da semana vigente
- **Dado** uma casa ativa com registros de faxina persistidos na semana corrente e em outras
  semanas
- **Quando** o usuário acessa a aba **Início**
- **Então** o contador exibe a quantidade de registros da semana vigente
- **E** é renderizado um card por registro da semana corrente (responsável com avatar de
  iniciais, dia da semana e chips de badges)
- **E** registros de outras semanas/casas não são exibidos (isolamento RN-19)

### Cenário 2: Semana vigente derivada da data atual
- **Dado** a data do sistema em um determinado dia de um mês
- **Quando** a aplicação determina o contexto semanal
- **Então** `{ weekNumber, month, year }` é derivado de `computeRecordWeek(now)`
- **E** o rótulo "Semana X de [Mês] de [Ano]" reflete deterministicamente essa data
  (base da TSK-407)

### Cenário 3: Estado vazio
- **Dado** que não existem registros na semana vigente
- **Quando** a aba **Início** é exibida
- **Então** o contador exibe "0 registradas"
- **E** é mostrada uma mensagem de estado vazio orientando o usuário a registrar uma faxina

### Cenário 4: Expansão quando há mais de 2 tarefas
- **Dado** um registro com mais de 2 badges de tarefas
- **Quando** o card é renderizado
- **Então** apenas os 2 primeiros badges são exibidos inicialmente
- **E** um botão de expansão ("+ N tarefas executadas") permite alternar entre colapsado e
  expandido
- **E** registros com até 2 tarefas não exibem o botão de expansão

### Cenário 5: Indicador de observações
- **Dado** um registro que possui texto no campo observações
- **Quando** o card é renderizado
- **Então** o ícone indicativo visível é exibido na área do responsável
- **E** o conteúdo das observações é acessível via expansão do bloco de notas
- **E** registros sem notas não exibem o indicador

### Cenário 6: Recarga após novo registro
- **Dado** que o usuário registra uma nova faxina na aba "+ Faxina"
- **Quando** ele retorna à aba **Início**
- **Então** a lista da semana vigente é recarregada e inclui o novo registro (sem refresh
  manual)

### Cenário 7: Alternância de casa
- **Dado** um usuário membro de duas casas com registros distintos
- **Quando** ele alterna a casa ativa no cabeçalho
- **Então** a aba **Início** recarrega exibindo apenas os registros da nova casa ativa
  (RN-19)

---

## 4. Contratos de Dados e Schemas

### 4.1 Camada de domínio `src/services/cleaningWeekView.ts`

```typescript
import type { CleaningRecord, Badge, DayOfWeek } from '../types';

export const PT_MONTH_NAMES: readonly string[]; // 12 nomes de meses em pt-BR (índice mês-1)

export interface WeekContext {
  weekNumber: number;   // 1..4 (week of month, derivado de computeRecordWeek)
  month: number;        // 1..12
  year: number;
  weekLabel: string;    // "Semana X de <Mês> de <Ano>"
  todayDayOfWeek: DayOfWeek;
}

export interface CleaningCardView {
  recordId: string;
  userName: string;
  initials: string;       // até 2 iniciais do nome
  weekdayLabel: string;   // WEEKDAY_LABELS[record.dayOfWeek]
  badgeNames: string[];   // nomes resolvidos via badges da casa (ordem de record.badgeIds)
  hasNotes: boolean;
  notes?: string;
  isExpandable: boolean;  // badgeNames.length > 2
  overflowCount: number;  // badgeNames.length - 2 (>= 1 quando isExpandable)
}

export function deriveWeekContext(now?: Date): WeekContext;
export function getInitials(name: string): string;
export function resolveBadgeNames(record: CleaningRecord, badges: Badge[]): string[];
export function buildCleaningCardView(record: CleaningRecord, badges: Badge[]): CleaningCardView;
export function visibleBadgeNames(card: CleaningCardView, isExpanded: boolean): string[];
```

- **`deriveWeekContext`**: usa `computeRecordWeek(now)` (já exportada de
  `cleaningRegistration.ts`) e `getTodayDayOfWeek(now)`; `weekLabel` no formato RN-24.
- **`getInitials`**: normaliza o nome (remove acentos multiplataforma), separa por espaços,
  aproveita no máximo 2 palavras (1ª e última), ignora partículas de ligação curtas (ex. "de",
  "da", "dos"), retorna até 2 letras maiúsculas.
- **`buildCleaningCardView`**: resolve `userName`, `initials`, `weekdayLabel`, `badgeNames`
  (ordenados pela ordem de `record.badgeIds`, ignorando badges inexistentes — ex. removidos),
  `hasNotes`/`notes` e os campos de expansão.

### 4.2 Consulta dos dados (em `src/services/supabase.ts` — já existente, TSK-403)

```typescript
getCleaningRecords(
  houseId: string,
  filters?: { year?: number; month?: number; weekNumber?: number; userId?: string }
): Promise<CleaningRecord[]>;
```

Na aba `home`: `dbService.getCleaningRecords(activeHouse.id, { year, month, weekNumber })`
onde `{ weekNumber, month, year } = deriveWeekContext(new Date())`.

---

## 5. Especificação de UX/UI Mobile

- **Tela / Posição**: aba `home` (Item 1 da Navbar) — substitui os cards demo.
- **Cabeçalho da aba**: `badgeLabel` "Semana Vigente", título "Faxinas Realizadas", subtítulo
  `deriveWeekContext(...).weekLabel` e contador "N registradas" (singular "1 registrada").
- **Lista de cards**: reinteligente (reuso das classes `.cleaningCard`/`.cardHeader`/
  `.userInfo`/`.avatar`/`.userName`/`.cleaningDay`/`.noteIndicator`/`.badgeTags`/`.taskTag`/
  `.expandButton`/`.notesBox` já existentes em `App.module.css`), ordenação cronológica
  ascendente por `cleaningDate` (sorting já aplicado por `getCleaningRecords`).
- **Estados**:
  - *Loading*: placeholder/spinner (loader) enquanto a consulta está em andamento.
  - *Vazio* (`records.length === 0`): card/mensagem "Nenhuma faxina registrada nesta semana." +
    orientação para usar "+ Faxina".
  - *Sucesso*: lista de `CleaningCardView`.
  - *Sem casa ativa*: reproduz o estado vazio neutro (mensagem descritiva).
- **Expansão**: botão discreto à esquerda (mesmo padrão do demo), alvo de toque ≥ 44px,
  alterna `expandedCardId` por registro; dobra/desdobra default (sem animação extra nesta
  tarefa — micro-animação é TSK-405).
- **Indicador de notas**: ícone `FileText` visível quando `hasNotes` (base funcional da
  TSK-406); bloco `notesBox` exibido quando o card estiver expandido e houver notas.
- **Recarga**: `useEffect` chaveado em `[activeHouse, homeRefreshNonce]`; um nonce incrementado
  em `handleSubmitCleaning` (sucesso) e na troca de casa garante a atualização (RN-08/RN-19).

---

## 6. Plano de Testes

- **Testes de Domínio** (`src/tests/home-week-tsk404.test.ts` — `runHomeWeekSimulationTest`):
  1. `deriveWeekContext` deriva semana/mês/ano e rótulo determinístico da data (RN-08/RN-24).
  2. Filtro da semana vigente via `getCleaningRecords(houseId, {year, month, weekNumber})`
     retorna apenas a semana corrente (isolamento RN-19 entre casas e semanas).
  3. `buildCleaningCardView`: nome/iniciais/dia da semana/nomes de badges resolvidos, notas e
     `hasNotes`.
  4. Expansão: `isExpandable`/`overflowCount` para 1, 2, 3 e 5 badges; `visibleBadgeNames`
     colapsado/expandido.
  5. `getInitials`: nomes com 1, 2 e 3+ palavras, partículas de ligação e acentos.
  6. Contador do resumo semanal (0, 1, N).
  7. Badge removido da casa é ignorado na resolução de nomes (referência órfã não quebra o card).
- **Integração**: `tsc` + `npm run build`; comportamento de recarga após novo registro
  (nonce) e troca de casa verificados manualmente.
- **Auditoria do Épico 4**: novo **Gate 4** em `runEpic4Audit.ts` (4 gates / ≥ 80 verificações).