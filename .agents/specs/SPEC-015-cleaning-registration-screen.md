# SPEC-015: Tela/Modal de Registro de Faxina (Item Central da Navbar)

- **Status**: IMPLEMENTED
- **Épico**: [EPIC 4 - Registro de Faxina e Tela Principal Semanal](file:///c:/projetos/limpex/.agents/backlog/backlog.md)
- **Autor**: Agente AI / Arquiteto
- **Data de Criação**: 2026-09-15
- **Última Atualização**: 2026-09-15
- **Tarefa Relacionada**: `TSK-402` (dependências: `TSK-301` — badges, `TSK-401` — navbar)
- **Depende de**: [SPEC-014-bottom-navbar.md](file:///c:/projetos/limpex/.agents/specs/SPEC-014-bottom-navbar.md)

---

## 1. Contexto e Objetivo

O botão central elevado **"+ Faxina"** da Bottom Navbar (SPEC-014) aciona a aba `new-cleaning`. Esta spec formaliza a **Tela de Registro de Faxina** que ocupa esse Item Central, permitindo a um membro vinculado à casa registrar de forma fluida uma faxina realizada, com:

- **Responsável**: pré-selecionado com o usuário autenticado, alterável para qualquer outro membro da casa ativa.
- **Dia da semana**: pré-selecionado com o dia atual, ajustável para qualquer dia `dom`..`sab`.
- **Badges/tarefas**: seleção múltipla entre os badges reais da casa ativa.
- **Observações**: campo de texto livre opcional.

A persistência em banco ficará a cargo da `TSK-403`; esta tarefa entrega a interface funcional, a camada de validação de domínio e o **payload** (objeto `CleaningRecord`) pronto para ser persistido — mantendo as fronteiras do backlog.

---

## 2. Regras de Negócio Envolvidas

- **RN-09 (Formulário de Registro de Limpeza)** — campos de responsável/dia/badges/observações conforme acima.
- **RN-20 (Permissões de Registro)** — qualquer membro vinculado à casa pode registrar faxinas (Restrição Obrigatória nº 4).
- **RN-19 (Múltiplas Casas)** — o formulário opera sobre a casa ativa; ao alternar a casa, membros/badges são recarregados.
- **RN-10 (14 badges do sistema)** — os badges exibidos vêm da casa ativa (`getHouseBadges`), nunca hard-coded.
- **Restrição Obrigatória nº 1 (UX/UI Mobile-First)** — alvos de toque ≥ 44px, layout mobile-first 360–430px.

---

## 3. Cenários de Aceite BDD (Gherkin)

### Cenário 1: Responsável pré-selecionado com o usuário autenticado
- **Dado** que um usuário autenticado acessa a aba central "+ Faxina" em uma casa com membros
- **Quando** o formulário de registro é aberto
- **Então** o campo **Responsável** vem pré-selecionado com o usuário autenticado
- **E** a lista do seletor contém todos os membros vinculados à casa ativa

### Cenário 2: Dia da semana pré-selecionado com o dia atual
- **Dado** que o formulário de registro é aberto
- **Então** o chip do dia corresponde ao dia da semana corrente (ex.: hoje `qui` → chip `qui` ativo)
- **E** é possível alternar para qualquer outro dos 7 dias (`dom`, `seg`, `ter`, `qua`, `qui`, `sex`, `sab`)

### Cenário 3: Seleção múltipla de badges da casa ativa
- **Dado** a casa ativa com seus badges reais (sistema + customizados)
- **Quando** o usuário toca em um ou mais chips de tarefa
- **Então** os badges selecionados alternam para o estado ativo
- **E** nenhum badge de outra casa é exibido (isolamento RN-19)

### Cenário 4: Registro válido gera payload de faxina
- **Dado** um responsável, um dia e ao menos 1 badge selecionado
- **Quando** o usuário toca em **Salvar Registro de Faxina**
- **Então** a validação passa e um payload `CleaningRecord` coerente é construído (casa, responsável, `registeredBy`, dia, badges, notas e metadados de semana/mês/ano)
- **E** a interface exibe feedback de sucesso com o resumo do registro

### Cenário 5: Validação — nenhum badge selecionado
- **Dado** que o usuário tenta salvar sem selecionar nenhuma tarefa
- **Então** o registro é bloqueado com mensagem `CLEANING_MIN_BADGES`
- **E** nenhum payload é gerado

### Cenário 6: Validação — responsável ausente
- **Dado** que o seletor de responsável está vazio (casa sem membros vinculados)
- **Então** o registro é bloqueado com mensagem `CLEANING_RESPONSIBLE_REQUIRED`

### Cenário 7: Validação — observações muito longas
- **Dado** que as observações excedem 500 caracteres
- **Então** o registro é bloqueado com mensagem `CLEANING_NOTES_TOO_LONG`

### Cenário 8: Ergononomia touch e acessibilidade
- **Dado** que a tela é renderizada
- **Então** todos os controles interativos possuem área mínima de 44x44px (Restrição nº 1)
- **E** chips, seletor e botão possuem `aria-label`/`aria-pressed` descritivos

---

## 4. Contratos de Dados e Schemas

Camada de domínio testável `src/services/cleaningRegistration.ts`:

```typescript
import type { DayOfWeek, HouseMember, Badge, CleaningRecord } from '../types';

export const WEEKDAY_ORDER: DayOfWeek[]; // ['dom','seg','ter','qua','qui','sex','sab']
export const WEEKDAY_LABELS: Record<DayOfWeek, string>; // { dom: 'Domingo', seg: 'Segunda-feira', ... }
export const CLEANING_NOTES_MAX_LENGTH = 500;

export type CleaningFormDraft = {
  responsibleMemberId: string;
  dayOfWeek: DayOfWeek;
  badgeIds: string[];
  notes: string;
};

export type CleaningValidationErrorCode =
  | 'CLEANING_RESPONSIBLE_REQUIRED'
  | 'CLEANING_DAY_REQUIRED'
  | 'CLEANING_MIN_BADGES'
  | 'CLEANING_BADGE_NOT_IN_HOUSE'
  | 'CLEANING_NOTES_TOO_LONG';

export function getTodayDayOfWeek(now?: Date): DayOfWeek;
export function deriveCleaningFormState(
  members: HouseMember[],
  currentUserId: string,
  now?: Date
): CleaningFormDraft; // responsável = usuário logado, dia = hoje
export function validateCleaningRegistration(
  draft: CleaningFormDraft,
  members: HouseMember[],
  badges: Badge[]
): { valid: true } | { valid: false; errorCode: CleaningValidationErrorCode; message: string };
export function computeRecordWeek(date: Date): { weekNumber: number; month: number; year: number };
export function buildCleaningRecordPayload(
  draft: CleaningFormDraft,
  opts: {
    houseId: string;
    members: HouseMember[];
    registeredById: string;
    now?: Date;
  }
): CleaningRecord; // note: id/createdAt gerados — persistência = TSK-403
```

`CleaningRecord` (já definido em `src/types/index.ts`) — campos preenchidos pelo payload:
`id`, `houseId`, `userId` (responsável), `userName`, `registeredById`, `dayOfWeek`, `cleaningDate`, `weekNumber` (1..4), `month`, `year`, `badgeIds`, `notes?`, `createdAt`.

---

## 5. Especificação de UX/UI Mobile

- **Tela / Posição na Navbar**: Item Central — aba `new-cleaning` (painel dentro do tab, sem overlay). Montado como componente `CleaningFormPanel.tsx` (padrão `BadgeManagementPanel`.
- **Componentes de Interface**:
  - **Responsável**: `select` dropdown com todos os membros da casa ativa (nome) + valor atual do usuário logado.
  - **Dia da Semana**: 7 chips ajustáveis (`dom` a `sab`), chip do dia atual ativo; rótulo legível abaixo (ex.: "Hoje é Quinta-feira").
  - **Badges/Tarefas**: chips de seleção múltipla com `aria-pressed`, ordenados por `displayOrder`, agrupados visualmente.
  - **Observações**: `textarea` com contador `{n}/500`.
  - **Botão Salvar**: destaque primário `linear-gradient`, min-height 48px, spinner enquanto submete.
- **Estados Visuais**:
  - `loading`: spinner "Carregando membros e badges..." (dados da casa ativa).
  - `empty (sem casa)`: aviso "Selecione uma casa no topo para registrar uma faxina."
  - `empty (sem badges)`: aviso "Esta casa ainda não possui badges de tarefas."
  - `error`: mensagens inline por campo (chips de dia/badges, textarea) e banner de erro no submit.
  - `success`: banner de sucesso com resumo (responsável · dia · nº de tarefas).
- **Dimensões e Touch**: todos os controles ≥ 44x44px; chips de badge com mínimo 40px de altura + padding amplo para área efetiva ≥ 44px.
- **Acessibilidade**: `label` ligado via `htmlFor`/`id`, `aria-pressed` nos chips, `aria-live` no feedback.

---

## 6. Plano de Testes

- **Testes Unitários / Domínio** (`src/tests/cleaning-registration-tsk402.test.ts`):
  - `getTodayDayOfWeek` mapeia corretamente domingo (0) a sábado (6).
  - `deriveCleaningFormState` pré-seleciona usuário logado como responsável e o dia atual.
  - Validação: sucesso (≥1 badge), `CLEANING_MIN_BADGES`, `CLEANING_RESPONSIBLE_REQUIRED`, `CLEANING_DAY_REQUIRED`, `CLEANING_NOTES_TOO_LONG`, `CLEANING_BADGE_NOT_IN_HOUSE`.
  - `computeRecordWeek` calcula semana/mês/ano coerentes para datas de referência.
  - `buildCleaningRecordPayload` gera `CleaningRecord` com todos os campos (houseId, responsável, registeredById, dia, badges, notas, metadados) e `userName` resolvido do membro.
  - Isolamento RN-19: badges de outra casa nunca são selecionáveis.
- **Integração**: renderização do `CleaningFormPanel` ligada à aba `new-cleaning` com membros/badges reais (`getHouseMembers`/`getHouseBadges`); verificação por `tsc` + `npm run build`.
- **Auditoria do Épico 4**: novo **Gate 2** no runner `runEpic4Audit.ts`.