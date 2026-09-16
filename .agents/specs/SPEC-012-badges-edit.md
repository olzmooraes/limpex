# SPEC-012: Edição de Badges (Renomear)

- **Status**: APPROVED
- **Épico**: [Épico 3 — Gestão de Badges de Tarefas e Limitações](file:///c:/projetos/limpex/.agents/backlog/backlog.md)
- **Tarefa**: `TSK-304`
- **Autor**: Arquiteto AI
- **Data de Criação**: 2026-09-15
- **Última Atualização**: 2026-09-15

---

## 1. Contexto e Objetivo
Permitir que o **criador da casa** renomeie qualquer badge (do sistema ou customizado) da casa ativa, sem alterar contadores nem posições de `displayOrder`. A edição é restrita exclusivamente ao criador (RN-21 / RN-13) e validada contra duplicatas case-insensitive na casa, preservando a unicidade `UNIQUE(house_id, name)` do banco.

---

## 2. Regras de Negócio Envolvidas
- **RN-13 (Edição de Badges)**: todos os badges — padrão (sistema) ou customizados — podem ser editados pelo criador da casa.
- **RN-21 (Permissões Administrativas)**: apenas o criador da casa tem permissão para gerenciar (criar, editar, excluir) badges; membros não visualizam os controles de edição.
- **RN-19 (Múltiplas Casas)**: a edição afeta exclusivamente o badge da **casa ativa**.
- **Unicidade**: o nome do badge é único por casa (constraint `UNIQUE(house_id, name)`). Renomear não pode gerar duplicata (case-insensitive) exceto quando o novo nome é o mesmo nome do badge sendo editado (sem alteração efetiva).
- **Não altera contadores**: renomear não cria nem remove badges — os limites RN-11 (20 customizados) e RN-12 (34 totais) não são impactados.

---

## 3. Cenários de Aceite BDD (Gherkin)

### Cenário 1: Renomeação válida — badge customizado
- **Dado** uma casa ativa com o usuário logado como **criador**
- **E** a casa possui um badge customizado "Lavanderia"
- **Quando** o criador renomeia o badge para "Lavanderia Premium"
- **Então** o nome do badge é atualizado para "Lavanderia Premium"
- **E** o badge permanece como `isSystem = false` e mantém o mesmo `displayOrder`.

### Cenário 2: Renomeação válida — badge do sistema
- **Dado** uma casa ativa com o usuário logado como **criador**
- **E** a casa possui o badge do sistema "Cozinha" (`isSystem = true`)
- **Quando** o criador renomeia o badge para "Cozinha Principal"
- **Então** o nome do badge é atualizado para "Cozinha Principal"
- **E** o badge permanece como `isSystem = true` e mantém o mesmo `displayOrder`.

### Cenário 3: Nome sem alteração (no-op)
- **Dado** um badge com o nome "Cozinha" na casa ativa
- **Quando** o criador tenta renomear para "Cozinha" (mesmo nome)
- **Então** a operação é aceita sem erro (nenhuma mudança efetiva no banco).

### Cenário 4: Rejeição — nome vazio
- **Dado** que o criador abre o modal de edição com o nome atual "Banheiro"
- **Quando** apaga o nome e tenta salvar (campo vazio ou apenas espaços)
- **Então** a edição é rejeitada com o código `BADGE_NAME_EMPTY`
- **E** o nome original "Banheiro" permanece inalterado.

### Cenário 5: Rejeição — nome duplicado (case-insensitive)
- **Dado** que a casa possui os badges "Sala" e "Sala de Estar"
- **Quando** o criador tenta renomear "Sala" para "sala de estar"
- **Então** a edição é rejeitada com o código `BADGE_NAME_DUPLICATE`
- **E** o nome "Sala" permanece inalterado.

### Cenário 6: Rejeição — nome acima de 40 caracteres
- **Dado** um badge com o nome "Varanda"
- **Quando** o criador tenta renomear para um nome com mais de 40 caracteres
- **Então** a edição é rejeitada com o código `BADGE_NAME_TOO_LONG`
- **E** o nome "Varanda" permanece inalterado.

### Cenário 7: Rejeição — membro (não criador)
- **Dado** uma casa ativa com o usuário logado como **membro** (não criador)
- **E** o controle de edição não está visível na interface
- **Quando** o membro tenta chamar diretamente o serviço `renameBadge`
- **Então** a operação é rejeitada com o código `BADGE_EDIT_FORBIDDEN`
- **E** nenhuma linha é alterada.

### Cenário 8: Rejeição — badge inexistente
- **Dado** uma casa ativa com o criador logado
- **Quando** o criador tenta renomear um badge com `badgeId` inexistente
- **Então** a operação é rejeitada com o código `BADGE_NOT_FOUND`
- **E** nenhuma alteração ocorre.

### Cenário 9: Contadores inalterados após edição
- **Dado** uma casa com 15 badges (14 sistema + 1 customizado)
- **Quando** o criador renomeia qualquer badge
- **Então** a contagem permanece 15 badges, 14 do sistema e 1 customizado.

---

## 4. Contratos de Interface e Dados

### 4.1. Validação de domínio — `src/services/badgeEdit.ts`
```typescript
import { Badge } from '../types';

export type BadgeEditErrorCode =
  | 'BADGE_NAME_EMPTY'
  | 'BADGE_NAME_TOO_LONG'
  | 'BADGE_NAME_DUPLICATE';

export interface BadgeEditValidation {
  valid: boolean;
  errorCode?: BadgeEditErrorCode;
  errorMessage?: string;
}

/**
 * Valida o novo nome de um badge durante edição (TSK-304 / SPEC-012).
 * Regras:
 * 1. Nome não pode ser vazio (após trim).
 * 2. Nome não pode exceder 40 caracteres.
 * 3. Nome não pode duplicar outro badge da casa (case-insensitive),
 *    mas permite manter o mesmo nome do badge sendo editado.
 */
export function validateBadgeEditName(
  newName: string,
  badgeToEditId: string,
  existingBadges: Badge[]
): BadgeEditValidation;
```

### 4.2. Serviço de persistência — `dbService.renameBadge`
```typescript
renameBadge(
  houseId: string,
  badgeId: string,
  newName: string,
  requesterId: string
): Promise<{ success: boolean; badge?: Badge; error?: string; errorCode?: string }>
```
- Rejeita `BADGE_NOT_FOUND` se o badge não existir ou não pertencer à casa.
- Rejeita `BADGE_EDIT_FORBIDDEN` se o solicitante não for o criador da casa (RN-21).
- Rejeita `BADGE_NAME_DUPLICATE` se o novo nome já existir em outro badge da mesma casa (case-insensitive).
- Em caso de sucesso, atualiza apenas o campo `name` (trim) e retorna o badge atualizado.

### 4.3. Componente de UI — `src/components/badges/BadgeEditModal.tsx`
```typescript
interface BadgeEditModalProps {
  isOpen: boolean;
  badge: Badge | null;
  onClose: () => void;
  onSubmit: (badgeId: string, newName: string) => Promise<{ success: boolean; error?: string }>;
  existingBadges: Badge[];
}
```
- Input com validação em tempo real e contador `{length}/40`.
- Pré-preenchido com o nome atual do badge.
- Botão "Salvar" desabilitado enquanto o nome for inválido ou não houver alteração efetiva.

### 4.4. Painel — ação de edição em `BadgeManagementPanel`
```typescript
interface BadgeManagementPanelProps {
  // ... (props existentes)
  onRequestEditBadge?: (badge: Badge) => void;
}
```
- Botão ícone `Pencil` (≥ 44px touch target) visível apenas para o criador, exibido ao lado de cada chip de badge (sistema e customizado).

---

## 5. Especificação de UX/UI Mobile
- **Disparo**: toque no ícone `Pencil` ao lado do badge (apenas criador — RN-21).
- **Modal bottom-sheet**: overlay com blur, conteúdo centralizado, cabeçalho "Editar Badge" + ícone `Pencil`.
- **Input**: campo único com ícone `Tag`, `maxLength = 40`, live validation com mensagem de erro em vermelho. Pré-preenchido com o nome atual.
- **Botão Salvar**: desabilitado quando o nome é inválido, vazio, ou idêntico ao nome atual (sem alteração).
- **Feedback**: spinner durante o submit; fecha o modal em sucesso e recarrega a lista de badges da casa ativa (RN-19).
- **Touch**: alvos ≥ 44px (`--touch-target-min`), coerentes com [ui-ux-design-tokens.md](file:///c:/projetos/limpex/.agents/references/ui-ux-design-tokens.md).

---

## 6. Plano de Testes
- **Testes de Domínio (mock)**: validar os Cenários 1–9 com `validateBadgeEditName`, `dbService.renameBadge` e `deriveBadgePanelState`:
  - Renomeação válida de badge customizado (mantém isSystem = false).
  - Renomeação válida de badge do sistema (mantém isSystem = true).
  - No-op: mesmo nome aceito sem erro.
  - Rejeição de nome vazio, duplicado (case-insensitive) e acima de 40 chars.
  - Rejeição por membro não-criador (BADGE_EDIT_FORBIDDEN).
  - Badge inexistente (BADGE_NOT_FOUND).
  - Contadores inalterados após renomeação.
- **Verificação TypeScript**: `tsc` sem erros.
- **Build**: `npm run build` sem erros.
- **Auditoria de Conformidade**: skill `compliance-audit` (Restrição nº 3 e nº 4).

---

## 7. Rastreabilidade
- **SPEC-012** → **Épico 3** → TSK-304.
- TSK-302 (SPEC-010) provê a tela de gestão com os chips de badge; TSK-305 (exclusão) e TSK-306 (testes) completam o CRUD.
- **RN-13, RN-19, RN-21** (ver [business-rules.md](file:///c:/projetos/limpex/.agents/references/business-rules.md)).
