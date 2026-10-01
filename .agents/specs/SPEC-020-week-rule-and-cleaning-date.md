# SPEC-020: Regra de Semana, Reset Semanal e Data da Faxina

- **Status**: IMPLEMENTED
- **Épico**: [ÉPICO 4 - Registro de Faxina e Tela Principal Semanal](../backlog/backlog.md) · executada dentro do [ÉPICO 7](../backlog/backlog.md)
- **Autor**: Agente AI / Arquiteto
- **Data de Criação**: 2026-10-01
- **Última Atualização**: 2026-10-01
- **Tarefas Relacionadas**: `TSK-407` (regra de semana, reset, datas futuras) e `TSK-408` (opção "Outra data")
- **Substitui**: o cálculo de semana das [SPEC-015](SPEC-015-cleaning-registration-screen.md) (`computeRecordWeek`, clamp 1..4) e [SPEC-017](SPEC-017-home-week-screen.md) (`deriveWeekContext`)

---

## 1. Contexto e Objetivo

A semana gravada no registro era a "semana do mês" (`teto(dia/7)` limitado a 4), enquanto o formulário trata a semana como domingo a sábado. Consequências comprovadas em 2026-10-01 (quinta-feira):

- Faxinas de domingo a quarta (27 a 30/09) eram gravadas como "Semana 4 de Setembro" e **sumiam da tela Início**, que consultava "Semana 1 de Outubro".
- Sexta e sábado (02 e 03/10) eram aceitos, ou seja, **datas futuras**.
- A "Semana 4" juntava até 10 dias (22 a 31) e a "Semana 1" não se alinhava aos blocos `dom`..`sab` do histórico.

Esta spec aplica as regras revisadas RN-08, RN-09 e RN-24 de [business-rules.md §7](../references/business-rules.md):

- A **data da faxina** (`cleaningDate`) passa a ser a única fonte da verdade. Dia da semana, semana, mês e ano são sempre derivados dela, nunca gravados.
- Toda regra de calendário usa o fuso `America/Sao_Paulo`.

---

## 2. Regras de Negócio Envolvidas

- **RN-08 (revisada)**: semana de domingo a sábado, no horário de Brasília. Vira no domingo às 00:00. Pertence ao mês que contém a maior parte dos seus dias (o mês da quarta-feira).
- **RN-24 (revisada)**: título `"Semana N de <Mês> de <Ano>"`, com N de 1 a 5.
- **RN-09 (revisada)**: chips da semana atual com dias futuros desabilitados, e a opção "Outra data" para datas passadas desde a criação da casa. Datas futuras são sempre rejeitadas.
- **RN-06/RN-07**: a tela Início mostra só a semana atual; o card identifica o dia.
- Restrições obrigatórias nº 2 a 5: **não impactadas**.

---

## 3. Cenários de Aceite BDD

### Regra de semana (domínio)

#### Cenário 1: Semana de domingo a sábado
- **Dado** que hoje é quinta-feira, 01/10/2026, em Brasília
- **Quando** o app calcula a semana atual
- **Então** a semana vai de domingo 27/09/2026 a sábado 03/10/2026

#### Cenário 2: Mês da maioria dos dias
- **Dado** a semana de 27/09/2026 a 03/10/2026 (4 dias em setembro, 3 em outubro)
- **Quando** o título é gerado
- **Então** o título é "Semana 5 de Setembro de 2026"
- **E** a semana de 04/10/2026 a 10/10/2026 é "Semana 1 de Outubro de 2026"
- **E** 10/09/2026 pertence à "Semana 2 de Setembro de 2026"
- **E** 01/08/2026 (sábado) pertence à "Semana 5 de Julho de 2026"

#### Cenário 3: Virada de ano
- **Dado** a semana de 28/12/2025 a 03/01/2026
- **Então** o título é "Semana 5 de Dezembro de 2025"
- **E** a semana iniciada em 04/01/2026 é "Semana 1 de Janeiro de 2026"

#### Cenário 4: Mês com 4 semanas
- **Dado** fevereiro de 2026
- **Então** a última semana de fevereiro (22 a 28/02) é a "Semana 4 de Fevereiro de 2026"
- **E** a semana de 01/03/2026 é a "Semana 1 de Março de 2026"

#### Cenário 5: Fuso de Brasília independe do dispositivo
- **Dado** o instante `2026-10-04T02:30:00Z`, que é sábado 03/10 às 23:30 em Brasília
- **Quando** o app calcula "hoje", em qualquer fuso do dispositivo
- **Então** hoje é 03/10/2026 e a semana atual ainda é 27/09 a 03/10
- **E** no instante `2026-10-04T03:00:00Z` (domingo 00:00 em Brasília) a semana atual passa a ser 04/10 a 10/10

### Tela Início e reset semanal

#### Cenário 6: Faxinas da semana que cruza meses aparecem (regressão do bug)
- **Dado** que hoje é 01/10/2026
- **E** existem faxinas em 28/09, 30/09 e 01/10, e outra em 26/09 (semana anterior)
- **Quando** o usuário abre a aba Início
- **Então** são exibidas exatamente as faxinas de 28/09, 30/09 e 01/10
- **E** o subtítulo é "Semana 5 de Setembro de 2026"

#### Cenário 7: Reset com o app aberto
- **Dado** que o app está aberto no sábado 03/10/2026 às 23:59 (Brasília), na aba Início
- **Quando** o relógio passa para domingo 04/10/2026 às 00:00, ou o app volta ao primeiro plano depois disso
- **Então** a aba Início passa a mostrar "Semana 1 de Outubro de 2026", vazia
- **E** as faxinas da semana anterior continuam salvas (nenhum dado é apagado)

#### Cenário 8: Registros antigos se ajustam sozinhos
- **Dado** um registro salvo antes desta mudança, com `weekNumber`/`month`/`year` calculados pela regra antiga
- **Quando** a tela Início é exibida
- **Então** o registro é posicionado pela sua `cleaningDate`, e os campos antigos são ignorados

### Formulário de registro

#### Cenário 9: Chips da semana atual com dias futuros bloqueados
- **Dado** que hoje é quinta-feira, 01/10/2026
- **Quando** o usuário abre "+ Faxina"
- **Então** o chip "qui 01" vem selecionado e marcado como hoje
- **E** os chips "sex 02" e "sab 03" aparecem desabilitados
- **E** ao tocar em "seg 28" a data da faxina passa a ser 28/09/2026
- **E** se a casa foi criada nesta semana (ex.: terça 29/09), os chips anteriores à criação também aparecem desabilitados (RN-09: datas a partir da criação da casa)

#### Cenário 10: Data futura rejeitada em qualquer caminho
- **Dado** um rascunho ou payload com data posterior a hoje (Brasília)
- **Quando** o registro é validado no formulário ou na persistência
- **Então** é rejeitado com `CLEANING_DATE_IN_FUTURE` e nada é salvo

#### Cenário 11: "Outra data" para semanas anteriores (TSK-408)
- **Dado** que hoje é 01/10/2026 e a casa foi criada em 01/09/2026
- **Quando** o usuário toca em "Outra data" e escolhe 10/09/2026
- **Então** o seletor só permite datas de 01/09/2026 a 01/10/2026
- **E** nenhum chip fica selecionado e aparece o resumo "Quinta-feira, 10/09/2026 · Semana 2 de Setembro de 2026"
- **E** ao salvar, a confirmação informa a semana e avisa que a faxina não aparece em Início, que mostra só a semana atual

#### Cenário 12: Data anterior à criação da casa
- **Dado** uma casa criada em 01/09/2026
- **Quando** é validado um registro com data 31/08/2026
- **Então** é rejeitado com `CLEANING_DATE_BEFORE_HOUSE`

---

## 4. Contratos de Dados

### 4.1 Domínio de calendário: `src/domain/week.ts` (novo)

```typescript
export const BUSINESS_TIME_ZONE = 'America/Sao_Paulo';

/** Data civil sem hora, formato 'AAAA-MM-DD'. */
export type IsoDate = string;

export interface WeekInfo {
  start: IsoDate;  // domingo
  end: IsoDate;    // sábado
  number: number;  // 1..5 — ordem da semana dentro do mês da sua quarta-feira
  month: number;   // 1..12 — mês da quarta-feira
  year: number;    // ano da quarta-feira
  label: string;   // "Semana N de <Mês> de <Ano>"
}

export function todayInBusinessTz(now?: Date): IsoDate;  // via Intl, independe do fuso do dispositivo
export function dayOfWeekOf(date: IsoDate): DayOfWeek;
export function weekOf(date: IsoDate): WeekInfo;
export function dateOfWeekday(day: DayOfWeek, week: WeekInfo): IsoDate;
export function isAfter(a: IsoDate, b: IsoDate): boolean;
export function msUntilNextBusinessDay(now?: Date): number;  // até a próxima meia-noite em Brasília
```

- **Regra de numeração:** `number = teto(diaDoMês(quarta-feira) / 7)`, pois a k-ésima quarta-feira de um mês cai entre os dias 7(k−1)+1 e 7k.
- **Aritmética de datas:** feita em UTC sobre datas civis, sem horas, para não depender do fuso do dispositivo.

### 4.2 `CleaningRecord` (em `src/types/index.ts`)

```typescript
export interface CleaningRecord {
  id: string;
  houseId: string;
  userId: string;
  userName: string;
  registeredById: string;
  cleaningDate: IsoDate;  // fonte única; dia/semana/mês/ano são derivados
  badgeIds: string[];
  notes?: string;
  createdAt: string;
}
```

**Removidos:** `dayOfWeek`, `weekNumber`, `month`, `year`. A coluna equivalente no banco já é eliminada pela TSK-702.

### 4.3 Formulário (em `src/services/cleaningRegistration.ts`)

```typescript
export interface CleaningFormDraft {
  responsibleMemberId: string;
  cleaningDate: IsoDate;  // substitui dayOfWeek; padrão = hoje (Brasília)
  badgeIds: string[];
  notes: string;
}

export interface CleaningDateBounds {
  today: IsoDate;    // máximo permitido
  minDate: IsoDate;  // data de criação da casa, em Brasília
}

export type CleaningValidationErrorCode =
  | 'CLEANING_RESPONSIBLE_REQUIRED'
  | 'CLEANING_DATE_REQUIRED'      // substitui CLEANING_DAY_REQUIRED
  | 'CLEANING_DATE_IN_FUTURE'     // novo
  | 'CLEANING_DATE_BEFORE_HOUSE'  // novo
  | 'CLEANING_MIN_BADGES'
  | 'CLEANING_BADGE_NOT_IN_HOUSE'
  | 'CLEANING_NOTES_TOO_LONG';
```

**Saem:** `computeRecordWeek`, `dateForWeekday`, `getTodayDayOfWeek` e `deriveWeekContext`, substituídas pelas funções de `src/domain/week.ts`.

### 4.4 Consulta (em `src/services/supabase.ts`, mock atual)

```typescript
getCleaningRecords(
  houseId: string,
  filters?: { from?: IsoDate; to?: IsoDate; userId?: string }  // intervalo inclusivo
): Promise<CleaningRecord[]>;
```

- **Tela Início:** `getCleaningRecords(houseId, { from: semana.start, to: semana.end })`.
- **Persistência (`createCleaningRecord`):** passa a rejeitar `CLEANING_DATE_IN_FUTURE`, como defesa em profundidade. No banco real, a mesma checagem vira trigger na TSK-702.

---

## 5. UX/UI Mobile

### Aba "+ Faxina", seção "Dia da faxina"
- **Chips:** 7 chips `dom`..`sab` da semana atual, cada um com a abreviação e o dia do mês (ex.: "seg 28"), porque a semana pode cruzar meses.
  - O chip de hoje recebe o marcador "hoje".
  - Os chips futuros ficam visualmente atenuados, com `aria-disabled` e sem ação.
  - Alvo de toque ≥ 44px.
- **"Outra data":** botão de 44px abaixo dos chips que revela um `<input type="date">` nativo com `min = criação da casa` e `max = hoje`. O seletor nativo do celular dá a melhor ergonomia.
  - Quando a data escolhida está fora da semana atual, nenhum chip fica selecionado.
  - Aparece então a linha "Quinta-feira, 10/09/2026 · Semana 2 de Setembro de 2026".
- **Confirmação ao salvar:** "Faxina registrada · Semana N de <Mês> de <Ano>". Se não for a semana atual, acrescenta: "Ela não aparece em Início, que mostra só a semana atual."

### Aba Início
- **Subtítulo:** `weekOf(hoje).label`.
- **Card:** mostra o dia da semana e a data, por exemplo "Segunda-feira · 28/09".
- **Reset:** "hoje" e a semana atual são recalculados a cada meia-noite em Brasília, por timer, e sempre que o app volta ao primeiro plano (`visibilitychange`). A virada de domingo 00:00 é um caso particular; recalcular todo dia mantém os dias futuros corretos com o app aberto.

---

## 6. Plano de Testes

### Novas suítes Vitest (`*.spec.ts`)
- **`src/domain/week.spec.ts`:** Cenários 1 a 5, mais `msUntilNextBusinessDay` (sábado 23:59 → 60 000 ms).
- **`src/services/cleaningRegistration.spec.ts`:** Cenários 9 a 12 no nível de domínio:
  - rascunho com padrão = hoje;
  - data a partir do chip;
  - rejeição de data futura e de data anterior à casa;
  - payload sem os campos removidos.
- **`src/services/cleaningWeekView.spec.ts`:** Cenários 6 a 8. A consulta por intervalo no mock usa a data fixa de 01/10/2026.

### Suítes legadas
- As verificações que codificam a regra antiga saem de `cleaning-registration-tsk402`, `cleaning-persistence-tsk403` e `home-week-tsk404`: o clamp 1..4, `weekNumber` 3 para 16/09 e o filtro por `weekNumber`.
- Os fixtures das suítes 403 a 406 são ajustados ao novo `CleaningRecord`.

### Verificação manual
No navegador, com o servidor de desenvolvimento:
- chips desabilitados;
- "Outra data" com limites;
- mensagem de confirmação;
- a faxina de 28/09 visível em Início.

---

## 7. Fora de Escopo
- Tela de Histórico (Épico 5). Ela reutilizará `weekOf` para agrupar as semanas.
- Constraint de data futura e remoção das colunas derivadas no banco real (TSK-702).
- Edição de faxina (TSK-409).
