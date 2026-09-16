# SPEC-008: Modelagem e Migração de `houses` e `house_members`

- **Status**: APPROVED
- **Épico**: [[EPIC-2] Gestão de Casas, Membros e Permissões](file:///c:/projetos/limpex/.agents/backlog/backlog.md)
- **Tarefas**: `TSK-201` (base), os demais itens do Épico 2 herdam este modelo
- **Autor**: Arquiteto AI
- **Data de Criação**: 2026-09-14
- **Última Atualização**: 2026-09-14 (TSK-205)

---

## 1. Contexto e Objetivo
O Limpex permite que usuários autenticados criem residências (`houses`) e participem de outras residências como membros (`house_members`). Este modelo é a fundação do Épico 2: criação de casa, entrada via código de convite, múltiplas casas e hierarquia criador/membro. A **Restrição Obrigatória nº 3** exige que cada usuário possa ser criador de **no máximo 1 casa**, ao mesmo tempo que pode participar como **membro de múltiplas casas** (RN-18, RN-19). O objetivo desta especificação é consolidar a modelagem relacional, as migrações SQL e o espelho de dados (mock) dessas duas entidades, garantindo a restrição em camada de banco de dados (constraint/RLS) e na camada de serviço.

---

## 2. Regras de Negócio Envolvidas
- **Restrição 3 (Limites de Propriedade)**: `houses.creator_id` com `UNIQUE` (1 casa por criador); `house_members` permite múltiplas associações por usuário.
- **RN-18 (Limite de Propriedade)**: Cada usuário pode ser criador/dono de apenas 1 casa.
- **RN-19 (Múltiplas Casas como Membro)**: Usuário pode participar de várias casas simultaneamente.
- **RN-16 / RN-17 (Criação e Vínculo via Código)**: A casa nasce com código único; membros entram via código de convite.
- **Restrição 4 (Hierarquia Rígida)**: `house_members.role` distingue `'CREATOR'` de `'MEMBER'`; apenas o criador administra a casa (RN-21).

---

## 3. Cenários de Aceite BDD (Gherkin)

### Cenário 1: Criação de Casa pelo Criador (Fluxo de Sucesso)
- **Dado** que um usuário autenticado X não possui nenhuma casa criada
- **Quando** X cria uma casa informando um nome válido
- **Então** o sistema persiste a casa com código de convite único
- **E** insere X como `house_members.role = 'CREATOR'`
- **E** a casa já nasce com os 14 badges do sistema associados.

### Cenário 2: Bloqueio de Segunda Casa pelo Mesmo Criador
- **Dado** que o usuário X já é `creator_id` de uma casa existente
- **Quando** X tenta criar uma segunda casa
- **Então** a operação deve ser rejeitada
- **E** o banco de dados impede por violação da constraint `unique_house_creator` (`UNIQUE(creator_id)`)
- **E** a camada de serviço devolve o erro com código `HOUSE_LIMIT_REACHED`
- **E** nenhuma nova linha é inserida.

### Cenário 3: Participação em Múltiplas Casas como Membro
- **Dado** que o usuário Y já é membro da Casa 1
- **Quando** Y informa o código de convite válido da Casa 2
- **Então** Y é adicionado à Casa 2 com `role = 'MEMBER'`
- **E** Y passa a enxergar e alternar entre Casa 1 e Casa 2 (RN-19).

### Cenário 4: Isolamento de Leitura de Membros (RLS)
- **Dado** que o usuário A pertence apenas à Casa 1
- **Quando** A consulta a lista de membros
- **Então** A enxerga apenas os `house_members` vinculados à Casa 1
- **E** nunca os membros de outras residências.

### Cenário 5: Proteção contra Auto-Promoção a Criador (RLS)
- **Dado** que um usuário autenticado não é dono da Casa 2
- **Quando** ele tenta criar um vínculo em `house_members` como `role = 'CREATOR'`, ou alterar o `creator_id` de uma casa existente
- **Então** a política RLS deve negar a operação (governança pela camada de serviço/autorização).

### Cenário 6 (TSK-202): Geração de Código de Convite de 6 Caracteres
- **Dado** que um usuário autenticado cria uma casa
- **Quando** a operação de criação é confirmada
- **Então** a casa deve receber um código de convite **com exatamente 6 caracteres**
- **E** o código é amigável (somente `A-Z` e `2-9`, sem caracteres ambíguos como `0`, `O`, `1`, `I`)
- **E** o código é único em relação a todas as casas existentes.

### Cenário 7 (TSK-202): Compartilhamento do Código de Convite
- **Dado** que um membro visualiza o código de convite da casa ativa
- **Quando** ele toca no botão de compartilhar
- **Então** o aplicativo abre a folha de compartilhamento nativa do dispositivo (Web Share API)
- **E** na ausência de suporte, copia o código para a área de transferência
- **E** exibe um feedback visual de sucesso ("Copiado!") por 2 segundos.

### Cenário 8 (TSK-205): Exclusão de Casa Restrita ao Proprietário
- **Dado** que o usuário X é o `creator_id` de uma casa e o usuário Y é apenas `MEMBER`
- **Quando** Y tenta excluir a casa
- **Então** a operação deve ser rejeitada pelo banco (política RLS `DELETE` com `auth.uid() = creator_id`)
- **E** a camada de serviço devolve o erro com código `NOT_HOUSE_OWNER`
- **E** nenhuma linha (casa, membros, badges) é removida.
- **Quando** o próprio X (proprietário) exclui a casa
- **Então** a casa, seus `house_members` e seus badges são removidos em cascata
- **E** um log de auditoria (`exclusion_logs`, Restrição Obrigatória nº 5) é gravado com autor, data/hora e quantidade de vínculos e badges afetados.
- **E** após a exclusão, X passa a poder criar uma nova casa (a `UNIQUE(creator_id)` é liberada).

---

## 4. Contratos de Dados e Schemas

### 4.1. PostgreSQL (Supabase)

```sql
-- public.houses
CREATE TABLE public.houses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    invite_code TEXT NOT NULL UNIQUE,
    creator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_house_creator UNIQUE (creator_id) -- 1 casa por criador (RN-18)
);

-- public.house_members
CREATE TABLE public.house_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('CREATOR', 'MEMBER')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_user_per_house UNIQUE (house_id, user_id) -- membro único por casa
);
```

**Políticas RLS obrigatórias:**
- `houses`:
  - `SELECT`: usuários membros da casa (via `house_members`).
  - `INSERT`: `auth.uid() = creator_id`.
  - `UPDATE`: apenas `creator_id = auth.uid()`.
  - `DELETE`: apenas `creator_id = auth.uid()`.
- `house_members`:
  - `SELECT`: membros da casa.
  - `INSERT`/`UPDATE`/`DELETE`: **negado por padrão** (a entrada por convite e o vínculo do criador são operados por trigger/RPC `SECURITY DEFINER`, jamais por política aberta).

**Services (invariantes refletidas no mock do dev):**
- `createHouse(name, creatorId)` → erro `HOUSE_LIMIT_REACHED` se `creatorId` já possuir casa.
- `joinHouseByInviteCode(inviteCode, userId)` → adiciona o usuário como `MEMBER`.
- `getUserHouses(userId)` → casas em que o usuário é criador ou membro.
- `getHouseMembers(houseId)` → membros de uma casa com nome/e-mail (join com `users`).
- `deleteHouseWithLog(houseId, requesterId)` → apenas `house.creatorId === requesterId`; erros `HOUSE_NOT_FOUND` / `NOT_HOUSE_OWNER`; em cascata remove a casa, vínculos e badges e grava `exclusion_logs` (Cenário 8).

### 4.2. Contrato do Código de Convite (TSK-202)
- **Formato**: exatamente 6 caracteres, alfabeto `[A-Z0-9]` sem ambíguos.
- **Alfabeto amigável**: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (exclui `0`, `O`, `1`, `I`).
- **Unicidade**: garantida contra todos os `houses.invite_code` existentes (busca em loop até código livre).
- **Normalização**: comparado e armazenado sempre em maiúsculas no serviço de adesão.
- **CI convencional** (ex.: `QR6K9X`): `A-Z` + `2-9`, 6 posições.

### 4.3. TypeScript (espelho no app)

```typescript
export interface House {
  id: string;
  name: string;
  inviteCode: string;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
}

export type MemberRole = 'CREATOR' | 'MEMBER';

export interface HouseMember {
  id: string;
  houseId: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: MemberRole;
  joinedAt: string;
}
```

---

## 5. Especificação de UX/UI Mobile
Esta tarefa (TSK-201) é **100% de modelo e dados** — não introduz telas novas. A interface consumidora (Tela de Casas, TSK-203) receberá os dados com:
- Lista de casas do usuário para o seletor de casa ativa (TSK-204).
- Estados de erro descritivos para `HOUSE_LIMIT_REACHED` ("Você já é criador de uma casa").
- Área de toque mínima de 44x44px nos controles de criar/entrar (regra 02-mobile-ux-guidelines).

### 5.1. Botão de Compartilhamento (TSK-202)
- Renderizado junto ao código de convite da casa ativa na tela de Casas.
- Ícone de compartilhar (Share) com label "Compartilhar"; área de toque ≥ 44x44px.
- Fluxo primário: Web Share API (`navigator.share`) — título "Convite para <nome da casa>" + texto com o código.
- Fallback: `navigator.clipboard.writeText(código)` quando Web Share não estiver disponível.
- Estados: ocioso → sucesso ("Código copiado!") com ícone `Check` e dura 2s; erro é silenciado com fallback de cópia.

---

## 6. Plano de Testes
- **Migration/Constraints**: validar que `UNIQUE(creator_id)` rejeita 2º insert de casa do mesmo criador e que o trigger `handle_new_house` cria CREATOR + 14 badges.
- **RLS**: validar isolamento de leitura de `house_members` por casa.
- **Geração (TSK-202)**: validar comprimento exato de 6 caracteres, alfabeto sem ambíguos e unicidade entre casas.
- **Domínio (mock)**: simulação de criação de casa, bloqueio de 2ª casa (`HOUSE_LIMIT_REACHED`), vínculo multi-casa por convite e leitura de membros. (Runner consolidado em `TSK-206`.)
- **Exclusão (TSK-205)**: rejeição de exclusão por membro (`NOT_HOUSE_OWNER`) e por terceiro sem vínculo; `HOUSE_NOT_FOUND` para casa inexistente; exclusão bem-sucedida apenas pelo proprietário com cascata (membros + badges) e registro de `exclusion_logs`; liberação da `UNIQUE(creator_id)` após a exclusão.