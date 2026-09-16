# SPEC-011: Criação de Badges Customizados

- **Status**: APPROVED
- **Épico**: [Épico 3 — Gestão de Badges de Tarefas e Limitações](file:///c:/projetos/limpex/.agents/backlog/backlog.md)
- **Tarefa**: `TSK-303`
- **Autor**: Arquiteto AI
- **Data de Criação**: 2026-09-15
- **Última Atualização**: 2026-09-15

---

## 1. Contexto e Objetivo
Permitir que o **criador da casa** adicione novos badges customizados à casa ativa, respeitando as travas inegociáveis de **20 customizados (RN-11)** e **34 badges totais (RN-12 / Restrição Obrigatória nº 3)**. O fluxo herda a tela de gestão de badges (TSK-302 / SPEC-010): o botão "Novo Badge" (visível apenas para o criador, RN-21) abre um modal de criação com validação em tempo real. A persistência usa `dbService.addCustomBadge` (mock espelhando `public.badges`).

---

## 2. Regras de Negócio Envolvidas
- **RN-11 (Customizados ≤ 20)**: criador adiciona até 20 badges customizados por casa.
- **RN-12 (Teto de 34 / RN 3)**: cada casa possui no máximo 34 badges no total (Restrição Inegociável nº 3); ao atingir o teto, a criação é rejeitada.
- **RN-13 / RN-21 (Permissões)**: apenas o criador da casa pode criar badges customizados; membros têm visão somente leitura.
- **RN-19 (Múltiplas Casas)**: o badge criado é vinculado exclusivamente à **casa ativa**.
- **Unicidade**: o nome do badge é único por casa (constraint `UNIQUE(house_id, name)` do banco).

---

## 3. Cenários de Aceite BDD (Gherkin)

### Cenário 1: Criação válida de badge customizado
- **Dado** uma casa ativa com o usuário logado como **criador**
- **E** a casa ainda possui menos de 20 customizados e menos de 34 badges totais
- **Quando** o criador informa um nome válido e confirma a criação
- **Então** o badge é persistido com `isSystem = false`
- **E** o novo badge aparece no grupo "Customizados" com contador incrementado
- **E** o `displayOrder` é maior que 14 (após os badges do sistema).

### Cenário 2: Rejeição de nome vazio
- **Dado** que o criador abre o modal de criação
- **Quando** tenta salvar sem informar um nome (ou apenas espaços)
- **Então** a criação é rejeitada com o código `BADGE_NAME_EMPTY`
- **E** nenhum badge é persistido.

### Cenário 3: Rejeição de nome duplicado
- **Dado** que a casa já possui um badge com o nome "Cozinha"
- **Quando** o criador tenta criar outro badge com o mesmo nome (em qualquer caixa)
- **Então** a criação é rejeitada com o código `BADGE_NAME_DUPLICATE`
- **E** a comparação é **case-insensitive**.

### Cenário 4: Rejeição de nome acima de 40 caracteres
- **Dado** um nome com mais de 40 caracteres
- **Quando** o criador tenta criar o badge
- **Então** a criação é rejeitada com o código `BADGE_NAME_TOO_LONG`
- **E** nomes com exatamente 40 caracteres são aceitos.

### Cenário 5: Trava no teto de customizados (RN-11)
- **Dado** que a casa já possui 20 badges customizados (e menos de 34 totais)
- **Quando** o criador tenta adicionar o 21º customizado
- **Então** a operação é rejeitada com o código `BADGE_CUSTOM_LIMIT_REACHED`
- **E** nenhuma linha é persistida.

### Cenário 6: Trava no teto total de 34 (RN-12 / Restrição nº 3)
- **Dado** que a casa já possui 34 badges no total (14 do sistema + 20 customizados)
- **Quando** o criador tenta adicionar mais um badge
- **Então** a operação é rejeitada com o código `BADGE_LIMIT_REACHED`
- **E** nenhuma linha é persistida, tanto na camada de validação de domínio quanto em `dbService.addCustomBadge`.
- **Nota**: quando a casa atingiu simultaneamente 20 customizados **e** 34 totais, o código retornado é `BADGE_LIMIT_REACHED` (o teto total, Restrição nº 3, tem precedência), consistente com `dbService.addCustomBadge`.

---

## 4. Contratos de Interface e Dados

### 4.1. Validação de domínio — `src/services/badgeCreation.ts`
```typescript
export const BADGE_NAME_MAX_LENGTH = 40;
export type BadgeCreationErrorCode =
  | 'BADGE_NAME_EMPTY'
  | 'BADGE_NAME_TOO_LONG'
  | 'BADGE_NAME_DUPLICATE'
  | 'BADGE_LIMIT_REACHED'
  | 'BADGE_CUSTOM_LIMIT_REACHED';

export interface BadgeCreationValidation {
  valid: boolean;
  errorCode?: BadgeCreationErrorCode;
  errorMessage?: string;
}

export function validateBadgeName(
  name: string,
  existingBadges: Badge[]
): BadgeCreationValidation;

export function nextCustomDisplayOrder(existingBadges: Badge[]): number;
```

### 4.2. Serviço de persistência — `dbService.addCustomBadge`
```typescript
addCustomBadge(houseId: string, badgeName: string):
  Promise<{ success: boolean; badge?: Badge; error?: string }>
```
Rejeita com erro descritivo quando `total >= 34` (RN-12) ou `customCount >= 20` (RN-11); não persiste nada em caso de falha.

### 4.3. Componente de UI — `src/components/badges/BadgeCreateModal.tsx`
```typescript
interface BadgeCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<{ success: boolean; error?: string }>;
  existingBadges: Badge[];
}
```
- Input com validação em tempo real e contador `x/40`.
- Botão "Criar Badge" desabilitado enquanto o nome for inválido ou houver teto atingido.
- Estado de teto total (34) e teto de customizados (20) com aviso descritivo e sem formulário.

---

## 5. Especificação de UX/UI Mobile
- **Disparo**: botão **Novo Badge** da tela Badges (TSK-302, visível apenas ao criador).
- **Modal bottom-sheet**: overlay com blur, conteúdo centralizado, cabeçalho com contadores `{total}/34` e `{custom}/20`.
- **Input**: campo único com ícone `Tag`, `maxLength = 40`, live validation com mensagem de erro em vermelho.
- **Feedback**: spinner no botão durante o submit; fecha o modal em sucesso e recarrega a lista de badges da casa ativa (RN-19).
- **Touch**: alvos ≥ 44px (`--touch-target-min`), coerentes com [ui-ux-design-tokens.md](file:///c:/projetos/limpex/.agents/references/ui-ux-design-tokens.md).

---

## 6. Plano de Testes
- **Testes de Domínio (mock)**: validar os Cenários 1–6 com `validateBadgeName`, `dbService.addCustomBadge` e `deriveBadgePanelState`:
  - Criação válida, nome vazio, duplicado (case-insensitive), limite de 40 caracteres.
  - Trava de 20 customizados (RN-11) e trava de 34 totais (RN-12), rejeição sem persistência.
  - Contadores derivados atualizados em tempo real após a criação.
- **Verificação TypeScript**: `tsc` sem erros.
- **Build**: `npm run build` sem erros.
- **Auditoria de Conformidade**: skill `compliance-audit` (Restrição nº 3 e nº 4).

---

## 7. Rastreabilidade
- **SPEC-011** → **Épico 3** → TSK-303.
- TSK-302 (SPEC-010) provê o ponto de entrada "Novo Badge"; TSK-306 agrega a suíte de testes do Épico 3.
- **RN-10 a RN-15, RN-19, RN-21** (ver [business-rules.md](file:///c:/projetos/limpex/.agents/references/business-rules.md)).