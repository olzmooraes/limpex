# SPEC-013: Exclusão de Badges

- **Status**: APPROVED
- **Épico**: [Épico 3 — Gestão de Badges de Tarefas e Limitações](file:///c:/projetos/limpex/.agents/backlog/backlog.md)
- **Tarefa**: `TSK-305`
- **Autor**: Arquiteto AI
- **Data de Criação**: 2026-09-15
- **Última Atualização**: 2026-09-15

---

## 1. Contexto e Objetivo
Permitir que o **criador da casa** exclua qualquer badge (do sistema ou customizado) da casa ativa, com confirmação explícita e registro obrigatório de auditoria em `exclusion_logs` (Restrição Inegociável nº 5 / RN-15). A exclusão é restrita exclusivamente ao criador (RN-14 / RN-21) e ao escopo da **casa ativa** (RN-19), completando o CRUD de badges iniciado em TSK-302/303/304.

---

## 2. Regras de Negócio Envolvidas
- **RN-14 (Exclusão de Badges)**: todos os badges — padrão (sistema) ou customizados — podem ser excluídos pelo criador da casa.
- **RN-15 / Restrição nº 5 (Auditoria de Exclusão)**: toda exclusão de badge gera obrigatoriamente um registro imutável em `exclusion_logs` com data/hora (ISO-8601/UTC), identificador e nome do autor, descrição do badge excluído (nome) e quantidade de vínculos afetados.
- **RN-21 (Permissões Administrativas)**: apenas o criador da casa tem permissão para gerenciar badges (criar, editar, excluir); membros não visualizam os controles de exclusão e uma chamada direta ao serviço é rejeitada com `BADGE_DELETE_FORBIDDEN`.
- **RN-19 (Múltiplas Casas)**: a exclusão afeta exclusivamente o badge da **casa ativa**; badges de outras casas não são atingidos (isolamento total).
- **RN-12 / Restrição nº 3**: excluir um badge **libera uma vaga** no teto de 34 badges total (e de 20 customizados), permitindo a criação de novos badges.

---

## 3. Cenários de Aceite BDD (Gherkin)

### Cenário 1: Exclusão válida — badge customizado
- **Dado** uma casa ativa com o usuário logado como **criador**
- **E** a casa possui um badge customizado "Lavanderia"
- **Quando** o criador confirma a exclusão do badge
- **Então** o badge é removido da lista de badges da casa
- **E** um log de auditoria é gravado em `exclusion_logs` com `entityType = 'BADGE'`, nome "Lavanderia", `houseId` da casa e metadata com `isSystem = false`.

### Cenário 2: Exclusão válida — badge do sistema
- **Dado** uma casa ativa com o usuário logado como **criador**
- **E** a casa possui o badge do sistema "Cozinha" (`isSystem = true`)
- **Quando** o criador confirma a exclusão do badge
- **Então** o badge é removido da lista de badges da casa
- **E** um log de auditoria é gravado com `entityType = 'BADGE'`, nome "Cozinha" e metadata com `isSystem = true`.

### Cenário 3: Rejeição — membro (não criador)
- **Dado** uma casa ativa com o usuário logado como **membro** (não criador)
- **E** o controle de exclusão não está visível na interface
- **Quando** o membro tenta chamar diretamente o serviço `deleteBadgeWithLog`
- **Então** a operação é rejeitada com o código `BADGE_DELETE_FORBIDDEN`
- **E** nenhuma linha é removida e nenhum log é gravado.

### Cenário 4: Rejeição — badge inexistente
- **Dado** uma casa ativa com o criador logado
- **Quando** o criador tenta excluir um badge com `badgeId` inexistente
- **Então** a operação é rejeitada com o código `BADGE_NOT_FOUND`
- **E** nenhuma alteração ocorre.

### Cenário 5: Rejeição — badge de outra casa (isolamento RN-19)
- **Dado** que o criador possui duas casas (A e B), cada uma com o badge "Cozinha"
- **Quando** o criador tenta excluir o badge da casa B usando o `houseId` da casa A
- **Então** a operação é rejeitada com `BADGE_NOT_FOUND` (o badge não pertence à casa ativa)
- **E** o badge da casa B permanece intacto.

### Cenário 6: Liberação de vaga no teto (RN-11 / RN-12)
- **Dado** que a casa possui 34 badges (14 do sistema + 20 customizados) `capReached = true`
- **Quando** o criador exclui um badge customizado
- **Então** a contagem cai para 33 (`capReached = false`)
- **E** o criador consegue criar um novo badge customizado imediatamente.

### Cenário 7: Fidelidade do log de auditoria (RN-15 / Restrição nº 5)
- **Dado** que o criador excluiu um badge "Garagem"
- **Quando** um log de auditoria é inspecionado
- **Então** o log contém `deletedAt` em ISO-8601/UTC, `userId`/`userName` do autor, `entityType = 'BADGE'`, `entityId`, `entityName = 'Garagem'`, `houseId` e metadata com `isSystem` e quantidade de vínculos afetados (`affectedRegisters`).
- **E** logs anteriores permanecem intactos (imutabilidade / append-only).

### Cenário 8: Isolamento entre casas após exclusão (RN-19)
- **Dado** duas casas A e B, ambas com o badge do sistema "Sala"
- **Quando** o criador exclui o badge "Sala" apenas da casa A
- **Então** o badge "Sala" da casa B permanece existente e funcional.

---

## 4. Contratos de Interface e Dados

### 4.1. Validação de domínio — `src/services/badgeDelete.ts`
```typescript
import { Badge } from '../types';

export type BadgeDeleteErrorCode = 'BADGE_NOT_FOUND' | 'BADGE_DELETE_FORBIDDEN';

export interface BadgeDeleteCheck {
  valid: boolean;
  errorCode?: BadgeDeleteErrorCode;
  errorMessage?: string;
}

/**
 * Valida a exclusão de um badge (TSK-305 / SPEC-013 / RN-14 / RN-21 / RN-19).
 * 1. Badge deve existir na casa ativa (BADGE_NOT_FOUND).
 * 2. Solicitante deve ser o criador da casa (BADGE_DELETE_FORBIDDEN).
 */
export function validateBadgeDelete(
  houseId: string,
  badgeId: string,
  houseBadges: Badge[],
  houseCreatorId: string | undefined,
  requesterId: string
): BadgeDeleteCheck;
```

### 4.2. Serviço de persistência — `dbService.deleteBadgeWithLog`
```typescript
deleteBadgeWithLog(
  houseId: string,
  badgeId: string,
  requesterId: string,
  requesterName: string
): Promise<{ success: boolean; badge?: Badge; error?: string; errorCode?: string }>
```
- Rejeita `BADGE_NOT_FOUND` se o badge não existir ou não pertencer à casa (isolamento RN-19).
- Rejeita `BADGE_DELETE_FORBIDDEN` se o solicitante não for o criador da casa (RN-21).
- Em caso de sucesso: remove o badge da casa e grava obrigatoriamente um log em `exclusion_logs` com:
  - `deletedAt` (ISO-8601/UTC), `userId`, `userName`, `entityType = 'BADGE'`, `entityId`, `entityName`, `houseId` e metadata `{ isSystem, affectedRegisters }`.
- O mock espelha a política RLS `"Apenas criador da casa pode deletar badges"` já existente em `public.badges`.

### 4.3. Componente de UI — `src/components/badges/BadgeDeleteModal.tsx`
```typescript
interface BadgeDeleteModalProps {
  isOpen: boolean;
  badge: Badge | null;
  onClose: () => void;
  onSubmit: (badgeId: string) => Promise<{ success: boolean; error?: string }>;
}
```
- Modal bottom-sheet de **confirmação destrutiva**: exibe nome do badge, aviso de irreversibilidade e informações de grupo (sistema/customizado).
- Botões "Cancelar" (fecha) e "Excluir" (destaca-se em vermelho, com spinner durante o submit).

### 4.4. Painel — ação de exclusão em `BadgeManagementPanel`
```typescript
interface BadgeManagementPanelProps {
  // ... (props existentes)
  onRequestDeleteBadge?: (badge: Badge) => void;
}
```
- Botão ícone `Trash2` (≥ 44px touch target) visível apenas para o criador, exibido ao lado de cada chip de badge (sistema e customizado), ao lado do botão de edição.

---

## 5. Especificação de UX/UI Mobile
- **Disparo**: toque no ícone `Trash2` ao lado do badge (apenas criador — RN-21).
- **Modal bottom-sheet de confirmação**: overlay com blur, conteúdo centralizado, cabeçalho "Excluir Badge" com ícone de alerta, corpo com o nome do badge em destaque e texto explicativo sobre irreversibilidade e auditoria.
- **Ações**: botão "Cancelar" (primário neutro) e botão "Excluir" (destrutivo vermelho, ≥ 44px, com spinner durante o submit).
- **Feedback**: em sucesso fecha o modal e recarrega a lista de badges da casa ativa (RN-19); em erro exibe mensagem no próprio modal.
- **Touch**: alvos ≥ 44px (`--touch-target-min`), coerentes com [ui-ux-design-tokens.md](file:///c:/projetos/limpex/.agents/references/ui-ux-design-tokens.md).

---

## 6. Plano de Testes
- **Testes de Domínio (mock)**: validar os Cenários 1–8 com `validateBadgeDelete`, `dbService.deleteBadgeWithLog` e `deriveBadgePanelState`:
  - Exclusão válida de badge customizado e do sistema (log de auditoria gravado).
  - Rejeição por membro não-criador (`BADGE_DELETE_FORBIDDEN`) sem remoção nem log.
  - Badge inexistente (`BADGE_NOT_FOUND`).
  - Isolamento: badge de outra casa rejeitado (RN-19).
  - Liberação de vaga no teto (RN-11/RN-12) e criação subsequente permitida.
  - Fidelidade do log (campos obrigatórios, `affectedRegisters`, append-only).
  - Isolamento entre casas após exclusão.
- **Verificação TypeScript**: `tsc` sem erros.
- **Build**: `npm run build` sem erros.
- **Auditoria de Conformidade**: skill `compliance-audit` (Restrição nº 3, nº 4 e nº 5).

---

## 7. Rastreabilidade
- **SPEC-013** → **Épico 3** → TSK-305.
- TSK-302 (SPEC-010) provê a tela de gestão com os chips de badge; TSK-304 (SPEC-012) a edição; TSK-306 agrega a suíte de testes do Épico 3.
- **RN-11, RN-12, RN-14, RN-15, RN-19, RN-21** (ver [business-rules.md](file:///c:/projetos/limpex/.agents/references/business-rules.md)).