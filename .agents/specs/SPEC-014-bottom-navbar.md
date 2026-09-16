# SPEC-014: Bottom Navigation Bar de 5 Posições com Botão Central "+ Faxina"

- **Status**: IMPLEMENTED
- **Épico**: [EPIC 4 - Registro de Faxina e Tela Principal Semanal](file:///c:/projetos/limpex/.agents/backlog/backlog.md)
- **Autor**: Agente AI / Arquiteto
- **Data de Criação**: 2026-09-15
- **Última Atualização**: 2026-09-15

---

## 1. Contexto e Objetivo

A Bottom Navigation Bar é a espinha dorsal de navegação do Limpex (Restrição Obrigatória nº 1 — UX/UI Mobile-First). Ela garante que o usuário acesse as 5 áreas principais com um toque, independente da tela em que está, mantendo a localização das ações frequentes na zona do polegar (*thumb zone*).

Esta spec formaliza o componente de **5 posições fixas** com o **botão central "+ Faxina" elevado em destaque**, tornando-o a fonte única de verdade do modelo de navegação (TSK-401).

---

## 2. Regras de Negócio Envolvidas

- **Restrição Obrigatória nº 1 (UX/UI Mobile-First)**:
  - Navegação principal obrigatória por Navbar fixa inferior com 5 seções bem delimitadas.
  - Áreas de toque mínimas 44x44px e zonas de fácil alcance do polegar.
- **RN-06 (Navegação & Cabeçalho)**: exibir a Bottom Navbar fixa de 5 posições na parte inferior da Tela Principal.
- **RN-20 (Permissões de Registro)**: qualquer membro vinculado à casa pode registrar e visualizar faxinas — o botão central deve estar sempre disponível para membros autenticados.
- **RN-19 (Múltiplas Casas como Membro)**: a navegação permanece estável ao alternar a casa ativa (as abas não dependem da casa selecionada).

---

## 3. Cenários de Aceite BDD (Gherkin)

### Cenário 1: Estrutura exata das 5 posições da Navbar
- **Dado** que um usuário autenticado está logado no Limpex
- **Quando** a Tela Principal é renderizada
- **Então** a Bottom Navbar deve conter exatamente **5 posições bem delimitadas** na seguinte ordem:
  `1. Início` · `2. Badges` · `3. + Faxina (Central)` · `4. Casas` · `5. Histórico`

### Cenário 2: Botão central elevado "+ Faxina"
- **Dado** que a Navbar está visível
- **Então** a 3ª posição deve ser o botão **"+ Faxina"** circular, elevado e destacado visualmente (gradiente primário + sombra de brilho)
- **E** ao tocar nele, deve abrir a tela de registro de nova faxina (aba `new-cleaning`)

### Cenário 3: Indicador de aba ativa
- **Dado** que o usuário navega pelo aplicativo
- **Quando** uma aba é selecionada
- **Então** o item correspondente deve exibir cor de destaque vibrante com micro-transição suave (ícone elevado)
- **E** apenas um item pode estar ativo por vez

### Cenário 4: Ergonomia touch (RN da Restrição nº 1)
- **Dado** que a Navbar é renderizada
- **Então** cada item de navegação deve possuir área mínima interativa de **44x44px**
- **E** a barra deve respeitar a área segura inferior do dispositivo (`env(safe-area-inset-bottom)`)

### Cenário 5: Estabilidade ao alternar casa ativa (RN-19)
- **Dado** que o usuário participa de múltiplas casas
- **Quando** ele alterna a casa ativa pelo seletor do cabeçalho
- **Então** as 5 posições da Navbar permanecem as mesmas (nenhuma aba é adicionada/removida)

---

## 4. Contratos de Dados e Schemas

Fonte única de verdade do modelo de navegação (`src/services/navConfig.ts`):

```typescript
export type NavIcon = 'home' | 'tags' | 'plus' | 'building' | 'history';

export interface NavTabConfig {
  id: TabId;            // 'home' | 'badges' | 'new-cleaning' | 'houses' | 'history'
  label: string;        // rótulo visível (ex.: 'Início', '+ Faxina')
  ariaLabel: string;    // acessibilidade (ex.: 'Registrar nova faxina')
  icon: NavIcon;
  isCentral?: boolean;  // true apenas para a 3ª posição (+ Faxina)
}

export const BOTTOM_NAV_ORDER: NavTabConfig[];
export const BOTTOM_NAV_POSITIONS: 5;
export const CENTRAL_TAB: TabId = 'new-cleaning';
export const TOUCH_TARGET_MIN = 44;
export function getNavTabById(id: TabId): NavTabConfig | undefined;
export function getNavPosition(id: TabId): number; // 1..5
```

---

## 5. Especificação de UX/UI Mobile

- **Tela / Posição na Navbar**: Fixa na base da tela — 5 posições.
  1. **Início** (ícone Home) → aba `home`.
  2. **Badges** (ícone Tags) → aba `badges`.
  3. **+ Faxina** (ícone Plus, botão central elevado) → aba `new-cleaning`.
  4. **Casas** (ícone Building) → aba `houses`.
  5. **Histórico** (ícone History) → aba `history`.
- **Componentes de Interface**: 4 `button` laterais (ícone + label) e 1 botão central circular elevado com label "+ Faxina".
- **Botão Central**: `52x52px`, borda `border-radius: 9999px`, gradiente primário `linear-gradient(135deg, primary-500, primary-600)`, `box-shadow: var(--shadow-glow)` e elevação (`top: -18px`) para destacá-lo sobre a barra.
- **Estados**:
  - `default`: ícones e labels em `--text-muted`.
  - `active`: cor `--color-primary-400`, ícone com `translateY(-2px)` e label `600`.
  - `hover/active` do botão central: `scale(1.05)` / `scale(0.92)`.
- **Barra**: altura `var(--bottom-navbar-height)` (68px), `position: absolute` na base, `backdrop-filter: blur(18px)` glassmorphism (`--bg-surface-glass`), `z-index: 50`, `padding-bottom: env(safe-area-inset-bottom, 0px)`.
- **Dimensões e Touch**: alvo mínimo de 44x44px por item (`--touch-target-min`); central 52x52px.
- **Acessibilidade**: `aria-label` descritivo em cada item e `aria-current="page"` no item ativo.

---

## 6. Plano de Testes

- **Testes Unitários / Domínio** (`src/tests/bottom-navbar-tsk401.test.ts`):
  - Estrutura: exatamente 5 posições, na ordem Início→Badges→+Faxina(Central)→Casas→Histórico.
  - O botão central é a 3ª posição, `new-cleaning`, com `isCentral` e ícone `plus`.
  - IDs únicos, labels/ariaLabels não vazios e alvo de toque ≥ 44px.
  - `getNavTabById` e `getNavPosition` consistentes.
  - Nenhuma aba é duplicada / posição fora do intervalo.
- **Integração**: renderização da Navbar acoplada ao `activeTab`/`onTabChange` na Tela Principal (verificado manualmente em `npm run dev` e por `tsc`/`npm run build`).