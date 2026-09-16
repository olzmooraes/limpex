# SPEC-010: Tela de Gestão de Badges (Item 2 da Bottom Navbar)

- **Status**: APPROVED
- **Épico**: [Épico 3 — Gestão de Badges de Tarefas e Limitações](file:///c:/projetos/limpex/.agents/backlog/backlog.md)
- **Tarefa**: `TSK-302`
- **Autor**: Arquiteto AI
- **Data de Criação**: 2026-09-15
- **Última Atualização**: 2026-09-15

---

## 1. Contexto e Objetivo
O Item 2 da Bottom Navbar (**Badges**) deve apresentar a **tela de gestão de badges da casa ativa**: listar os badges reais persistidos no banco (14 do sistema + customizados), espelhando os dados da casa selecionada no seletor do topo (TSK-204/RN-19). A tela substitui a versão estática atual (que renderiza apenas `SYSTEM_BADGE_NAMES` com contadores fixos) por uma UI orientada a dados, com estados de carregamento, casa ausente, agrupamento sistema/customizado e contadores calculados em tempo real.

Os fluxos de criação (TSK-303), edição (TSK-304) e exclusão (TSK-305) são tarefas subsequentes que dependem desta tela: aqui são definidos os contêineres e o ponto de entrada visual "Novo Badge" (visibilidade por papel e travamento por teto), sem implementar os fluxos CRUD.

---

## 2. Regras de Negócio Envolvidas
- **RN-10 (14 Badges Pré-definidos)**: toda casa nasce com exatamente 14 badges do sistema (`isSystem = true`).
- **RN-11 (Customizados ≤ 20)**: criador adiciona até 20 badges customizados.
- **RN-12 (Teto de 34 / RN 3)**: cada casa possui no máximo 34 badges no total (Restrição Inegociável nº 3); botão "Novo Badge" desabilitado ao atingir o teto.
- **RN-13 / RN-14 (Edição e Exclusão)**: apenas o criador gerencia badges — herança do RBAC RN-21.
- **RN-21 (Permissões Administrativas)**: apenas o criador da casa possui controles de gestão; membros têm visão somente leitura.
- **RN-19 (Múltiplas Casas)**: a tela reflete sempre os badges da **casa ativa**; ao trocar de casa, os dados são recarregados.

---

## 3. Cenários de Aceite BDD (Gherkin)

### Cenário 1: Exibição dos Badges Reais da Casa Ativa
- **Dado** que o usuário está autenticado com uma casa ativa selecionada
- **Quando** a aba Badges é aberta
- **Então** a tela exibe os badges persistidos da casa ativa
- **E** agrupa em "Badges do Sistema" (RN-10) e "Badges Customizados"
- **E** o contador mostra `{total}/34 badges` calculado em tempo real
- **E** o subcontador de customizados mostra `{custom}/20`.

### Cenário 2: Estado Sem Casa Ativa
- **Dado** que o usuário não possui nenhuma casa ou nenhuma casa ativa
- **Quando** a aba Badges é aberta
- **Então** a tela exibe um card orientativo "Selecione uma casa para visualizar e gerenciar os badges"
- **E** não exibe badges nem o botão "Novo Badge".

### Cenário 3: Visibilidade do Botão "Novo Badge" por Papel (RN-21)
- **Dado** uma casa ativa
- **Quando** o usuário logado é o **criador** da casa
- **Então** o botão "Novo Badge" é exibido habilitado (se teto não atingido)
- **E** quando o usuário é **membro** (não criador), o botão **não** é exibido.

### Cenário 4: Trava Visual no Teto de 34 (RN-12)
- **Dado** que a casa ativa já possui 34 badges
- **Quando** o criador visualiza a aba Badges
- **Então** o botão "Novo Badge" aparece desabilitado com o aviso "Teto de 34 badges atingido".

### Cenário 5: Recarga ao Trocar de Casa Ativa (RN-19)
- **Dado** que o usuário participa de múltiplas casas
- **Quando** a casa ativa é alterada no seletor do topo
- **Então** a tela Badges recarrega e exibe os badges da nova casa ativa.

---

## 4. Contratos de Interface e Dados

### 4.1. Fonte de dados
`dbService.getHouseBadges(houseId: string): Promise<Badge[]>` (mock localStorage espelhando `public.badges`).

### 4.2. Modelo `Badge`
```typescript
export interface Badge {
  id: string;
  houseId: string;
  name: string;
  isSystem: boolean; // true = 14 padrões, false = customizado
  displayOrder?: number;
  createdAt: string;
}
```

### 4.3. Componente
```typescript
interface BadgeManagementPanelProps {
  house: House | null;        // casa ativa (null = nenhuma)
  badges: Badge[] | null;     // badges carregados (null = carregando/não carregado)
  isLoading: boolean;
  currentUserId: string;
  onRequestCreateBadge?: () => void; // TSK-303 conecta o fluxo de criação
}
```

### 4.4. Contadores derivados
```typescript
const total = badges.length;                                  // RN-12: ≤ 34
const customCount = badges.filter(b => !b.isSystem).length;   // RN-11: ≤ 20
const systemCount = badges.filter(b => b.isSystem).length;    // RN-10: = 14
const capReached = total >= MAX_TOTAL_BADGES;                 // 34
const customLimitReached = customCount >= MAX_CUSTOM_BADGES;  // 20
```

---

## 5. Especificação de UX/UI Mobile
- **Tela / Posição na Navbar**: Item 2 — Botão central esquerdo (**Badges**).
- **Estrutura**:
  1. Cabeçalho `Etiquetas de Faxina` / `Badges da Casa` + pill contador `{total}/34 badges`.
  2. Subcontador discreto `{custom} customizados / 20` (quando houver customizados).
  3. Grupo **Badges do Sistema** (chip com ícone `Tag`, cor primária).
  4. Grupo **Badges Customizados** (chip com ícone `Sparkles`, acento ciano), exibido somente quando existirem customizados.
  5. Botão **Novo Badge** (pílula tracejada `+`) — visível apenas para o criador; desabilitado ao atingir RN-12 com mensagem.
  6. Estado vazio (sem casa ativa): card com `AlertTriangle` e texto orientativo.
  7. Estado de carregamento: indicador suave enquanto busca os badges.
- **Dimensões e Touch**: alvos de toque ≥ 44px (`--touch-target-min`), margens laterais 16px, chips com `--radius-full`, transições `--transition-fast`. Visual coerente com os tokens de [ui-ux-design-tokens.md](file:///c:/projetos/limpex/.agents/references/ui-ux-design-tokens.md).

---

## 6. Plano de Testes
- **Testes de Domínio (mock)**: testar os Cenários 1–5 usando `dbService` + `createSystemBadges`:
  - Cálculo correto de `total`, `systemCount`, `customCount` e flags `capReached`/`customLimitReached`.
  - Isolamento por casa: troca de casa ativa retorna o conjunto de badges correto (RN-19/Cenário 5).
  - Regra de visibilidade do controle de criação por papel (RN-21/Cenário 3).
  - Trava visual no teto de 34 (RN-12/Cenário 4).
- **Verificação TypeScript**: `tsc` sem erros.
- **Auditoria de Conformidade**: skill `compliance-audit`.

---

## 7. Rastreabilidade
- **SPEC-010** → **Épico 3** → TSK-302.
- TSK-303 (criação), TSK-304 (edição) e TSK-305 (exclusão) herdam esta tela e conectam `onRequestCreateBadge` e os controles de gestão.
- **RN-10 a RN-15, RN-19, RN-21** (ver [business-rules.md](file:///c:/projetos/limpex/.agents/references/business-rules.md)).