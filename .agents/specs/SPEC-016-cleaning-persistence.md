# SPEC-016: Backend e Persistência dos Registros de Faxina (`cleaning_records` e `cleaning_badges`)

- **Status**: APPROVED
- **Épico**: [EPIC 4 - Registro de Faxina e Tela Principal Semanal](file:///c:/projetos/limpex/.agents/backlog/backlog.md)
- **Autor**: Agente AI / Arquiteto
- **Data de Criação**: 2026-09-15
- **Última Atualização**: 2026-09-15
- **Tarefa Relacionada**: `TSK-403` (dependência: `TSK-402` — formulário e payload)
- **Depende de**: [SPEC-015-cleaning-registration-screen.md](file:///c:/projetos/limpex/.agents/specs/SPEC-015-cleaning-registration-screen.md) e [SPEC-002-database-schema-supabase.md](file:///c:/projetos/limpex/.agents/specs/SPEC-002-database-schema-supabase.md)

---

## 1. Contexto e Objetivo

A `TSK-402` (SPEC-015) entrega o formulário de registro de faxina e o payload `CleaningRecord`
pronto, porém **sem persistência** (`handleSubmitCleaning` é um no-op). Esta spec formaliza a
camada de **backend e persistência** dos registros: gravação em `cleaning_records` (cabeçalho)
e `cleaning_badges` (associação N:N), consulta isolada por casa/semana (base das TSK-404 e
TSK-501) e as garantias de integridade no **mock local** (`dbService`) e no **banco
PostgreSQL/Supabase** (migração com RLS e triggers).

Entregas:

- Migração SQL `20260915000000_cleaning_persistence_rls.sql` (RLS, triggers de integridade e
  correção do `CHECK` de `week_number` para 1..4).
- Camada de domínio testável `src/services/cleaningPersistence.ts` (validações de persistência).
- Serviços `dbService.createCleaningRecord` e `dbService.getCleaningRecords` (mock local,
  espelhando as tabelas `cleaning_records`/`cleaning_badges`).
- Conexão do fluxo UI→backend em `App.tsx` (`handleSubmitCleaning`) com feedback de sucesso/erro.
- Teste de domínio `cleaning-persistence-tsk403.test.ts` registrado como **Gate 3** do runner
  `runEpic4Audit.ts`.

---

## 2. Regras de Negócio Envolvidas

- **RN-20 (Permissões de Registro)** — qualquer membro vinculado à casa pode registrar e
  visualizar faxinas (Restrição Obrigatória nº 4). Um usuário que **não** é membro da casa é
  rejeitado no nível de serviço e de banco (RLS).
- **RN-19 (Múltiplas Casas / Isolamento)** — todo registro é escopado à casa ativa; consultas e
  inserções nunca vazam entre casas (`house_id`).
- **RN-09 (Formulário)** — o responsável (`userId`) deve ser um membro da casa ativa; os badges
  selecionados devem pertencer à casa ativa.
- **RN-06/RN-07 (Tela Principal)** — registros persistidos alimentam a semana vigente;
  `weekNumber` pertencente a 1..4 e `cleaningDate` como data real da faxina.
- **Restrição Obrigatória nº 5 (Auditoria)** — a cascata de exclusão de badge/casa (referências
  em `cleaning_badges`) não exige novo log, pois o log é do evento de exclusão (badge/casa), já
  coberto pelas TSK-205/TSK-305. A persistência de faxinas **não** gera log de exclusão.
- **Restrição Obrigatória nº 1 (UX Mobile)** — feedback de sucesso/erro acessível (`aria-live`),
  alvos de toque ≥ 44px inalterados.

---

## 3. Cenários de Aceite BDD (Gherkin)

### Cenário 1: Persistência de um registro válido de faxina
- **Dado** uma casa ativa com membros vinculados e badges (sistema/customizados)
- **Quando** um membro submete um payload `CleaningRecord` válido (responsável, dia, ≥1 badge)
- **Então** o registro é gravado em `cleaning_records` (cabeçalho)
- **E** cada badge selecionado é gravado na associação `cleaning_badges` (múltiplas linhas)
- **E** a persistência preserva `dayOfWeek`, `cleaningDate`, `weekNumber` (1..4), `month`,
  `year`, `notes?` e `createdAt`

### Cenário 2: Consulta isolada por casa e semana
- **Dado** registros de faxina em várias casas e períodos
- **Quando** um membro consulta os registros de uma casa (`getCleaningRecords(houseId)`)
- **Então** apenas os registros daquela casa são retornados (isolamento RN-19)
- **E** ao filtrar por `year/month/weekNumber`, apenas a semana solicitada é retornada

### Cenário 3: Rejeição de usuário sem vínculo à casa (RN-20)
- **Dado** um usuário que não é membro da casa ativa
- **Quando** ele tenta persistir um registro naquela casa
- **Então** o serviço rejeita com erro `CLEANING_MEMBERSHIP_REQUIRED`
- **E** nenhuma linha é persistida em `cleaning_records`/`cleaning_badges`

### Cenário 4: Rejeição de responsável que não é membro da casa
- **Dado** um membro autenticado que seleciona como responsável um usuário fora da casa
- **Quando** ele submete o registro
- **Então** o serviço rejeita com erro `CLEANING_RESPONSIBLE_NOT_IN_HOUSE`
- **E** nenhuma linha é persistida

### Cenário 5: Rejeição de badge de outra casa (RN-19)
- **Dado** um payload contendo um badge que pertence a outra casa
- **Quando** o membro submete o registro
- **Então** o serviço rejeita com erro `CLEANING_BADGE_NOT_IN_HOUSE`
- **E** nenhuma linha é persistida (nem cabeçalho nem associação parcial)

### Cenário 6: Casa inexistente
- **Dado** que o payload referencia uma `houseId` inexistente
- **Quando** o registro é submetido
- **Então** o serviço rejeita com erro `CLEANING_HOUSE_NOT_FOUND`

### Cenário 7: Integração UI→Backend
- **Dado** a aba central "+ Faxina" com um payload validado em tela
- **Quando** o botão "Salvar Registro de Faxina" é acionado
- **Então** `handleSubmitCleaning` persiste via `dbService.createCleaningRecord`
- **E** a tela exibe feedback de sucesso ("Registro salvo com sucesso") ou de erro

### Cenário 8: Integridade no banco (migração SQL)
- **Dado** as políticas RLS de `cleaning_records`/`cleaning_badges`
- **Quando** um membro da casa insere ou consulta registros
- **Então** as operações são permitidas apenas para os membros da casa
- **E** o trigger de integridade rejeita associação de badge de outra casa no `cleaning_badges`
- **E** o `CHECK` de `week_number` garante 1..4

---

## 4. Contratos de Dados e Schemas

### 4.1 Camada de domínio `src/services/cleaningPersistence.ts`

```typescript
import type { CleaningRecord, House, HouseMember, Badge } from '../types';

export type CleaningPersistenceErrorCode =
  | 'CLEANING_HOUSE_NOT_FOUND'
  | 'CLEANING_MEMBERSHIP_REQUIRED'
  | 'CLEANING_RESPONSIBLE_NOT_IN_HOUSE'
  | 'CLEANING_BADGE_NOT_IN_HOUSE';

export type CleaningPersistenceCheck =
  | { valid: true }
  | { valid: false; errorCode: CleaningPersistenceErrorCode; message: string };

export function validateCleaningPersistence(
  record: CleaningRecord,
  house: House | null,
  members: HouseMember[],
  badges: Badge[]
): CleaningPersistenceCheck;
```

### 4.2 Serviço `dbService` (em `src/services/supabase.ts`)

```typescript
type CleaningRecordFilters = {
  year?: number;
  month?: number;
  weekNumber?: number;
  userId?: string;
};

createCleaningRecord(
  record: CleaningRecord
): Promise<{ success: boolean; record?: CleaningRecord; error?: string; errorCode?: string }>;

getCleaningRecords(
  houseId: string,
  filters?: CleaningRecordFilters
): Promise<CleaningRecord[]>;
```

- **Persistência mock**: array em `localStorage['limpex_mock_cleaning_records']`, cada item é um
  objeto `CleaningRecord` completo (espelha `cleaning_records` + `cleaning_badges` no formato
  de domínio com `badgeIds`).
- **Códigos de erro** (espelho das restrições RN-19/RN-20): `CLEANING_HOUSE_NOT_FOUND`,
  `CLEANING_MEMBERSHIP_REQUIRED`, `CLEANING_RESPONSIBLE_NOT_IN_HOUSE`,
  `CLEANING_BADGE_NOT_IN_HOUSE`.
- **Cascata**: `deleteHouseWithLog` passa a remover também os `cleaning_records` da casa
  (espelhando o `ON DELETE CASCADE` de `house_id`); `deleteBadgeWithLog` já remove a referência
  do badge nos registros (espelhando `ON DELETE CASCADE` de `cleaning_badges.badge_id`).

### 4.3 Migração SQL `20260915000000_cleaning_persistence_rls.sql`

1. **Correção do teto da semana**: recria o `CHECK` de `cleaning_records.week_number`
   para `BETWEEN 1 AND 4` (alinhamento com o domain-model e SPEC-015).
2. **RLS — `cleaning_records`**:
   - `SELECT`: membros da casa (já existe — mantido).
   - `INSERT`: membro autenticado da casa e `house_id`.
   - `UPDATE`/`DELETE`: não existem fluxos nesta aplicação; nenhuma política é concedida
     (nega por padrão — registros são append-only).
3. **RLS — `cleaning_badges`**:
   - `SELECT`: membros da casa do registro associado.
   - `INSERT`: membro autenticado da casa do registro associado.
4. **Trigger `handle_cleaning_badge_integrity`**: em `BEFORE INSERT OR UPDATE` em
   `cleaning_badges`, valida que o `badge_id` pertence à mesma `house_id` do
   `cleaning_record_id` (com a qual acessa `public.cleaning_records`).
5. **Trigger `handle_cleaning_record_integrity`**: em `BEFORE INSERT OR UPDATE` em
   `cleaning_records`, valida que `registered_by_id` (solicitante) é membro da casa
   (RN-20) — camada de defesa em profundidade além da RLS.

> A migração é idempotente (`CREATE OR REPLACE` / `DROP ... IF EXISTS`), no padrão das
> migrações TSK-205/TSK-305.

---

## 5. Especificação de UX/UI Mobile

- **Tela / Posição**: aba `new-cleaning` (Item Central da Navbar) — `CleaningFormPanel`.
- **Mudanças no feedback**: o banner de sucesso passa a indicar persistência real
  (*"Registro de faxina salvo com sucesso"*), mantendo o resumo `responsável · dia · tarefas`;
  em caso de falha de persistência, o painel exibe banner de erro com a mensagem do serviço.
- **Estados**: `submitting` (spinner) → `success` (banner `aria-live`) ou `error`
  (banner `role="alert"`). Alvos de toque e acessibilidade inalterados (Restrição nº 1).
- **Sem novos componentes**: apenas textos e tratamento de erro no painel existente.

---

## 6. Plano de Testes

- **Testes de Domínio** (`src/tests/cleaning-persistence-tsk403.test.ts`):
  1. Persistência de registro válido (cabeçalho + associações) com fidelidade de campos.
  2. Consulta isolada por casa e filtro por `year/month/weekNumber` (RN-19).
  3. Rejeição de não-membro (`CLEANING_MEMBERSHIP_REQUIRED`) sem persistência parcial.
  4. Rejeição de responsável fora da casa (`CLEANING_RESPONSIBLE_NOT_IN_HOUSE`).
  5. Rejeição de badge de outra casa (`CLEANING_BADGE_NOT_IN_HOUSE`) sem cabeçalho gravado.
  6. Casa inexistente (`CLEANING_HOUSE_NOT_FOUND`).
  7. Cascata: exclusão de casa remove registros (RN-22/Restrição 5 preservada); exclusão de
     badge remove a referência nos registros sem quebrá-los.
  8. Dois registros no mesmo `ms` não colidem (ID único com sufixo aleatório).
- **Integração**: `createCleaningRecord` chamado por `handleSubmitCleaning` no `App.tsx`;
  verificação via `tsc` + `npm run build`.
- **Auditoria do Épico 4**: novo **Gate 3** em `runEpic4Audit.ts` (3 gates / ≥ 63 verificações).