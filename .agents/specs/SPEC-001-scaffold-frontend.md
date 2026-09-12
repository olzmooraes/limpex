# SPEC-001: Scaffold do Projeto Frontend Mobile-First & Layout Shell

- **Status**: APPROVED
- **Épico**: [[EPIC-1] Fundação, Autenticação e Teto Global de Usuários](file:///c:/projetos/limpex/.agents/backlog/backlog.md)
- **Tarefa**: `TSK-101`
- **Autor**: Arquiteto AI
- **Data de Criação**: 2026-09-12
- **Última Atualização**: 2026-09-12

---

## 1. Contexto e Objetivo
O Limpex é concebido desde a sua gênese como um aplicativo **mobile-first**, focado na simplicidade, agilidade e ergonomia tátil para gerenciar faxinas residenciais. O objetivo desta especificação é estabelecer a infraestrutura base do frontend (Vite + React + TypeScript), configurar os **Design Tokens** em Vanilla CSS sem dependência de frameworks utilitários externos, e implementar o **Layout Shell** contendo o cabeçalho superior e a **Bottom Navigation Bar fixa de 5 posições**.

---

## 2. Regras de Negócio e Restrições Envolvidas
- **Restrição 1 (Padrão UX/UI Mobile-First)**:
  - Navegação principal obrigatoriamente por Bottom Navbar fixa de 5 posições.
  - Alvos mínimos de toque de 44x44px em todos os controles interativos.
  - Botão central "+ Faxina" elevado e em destaque visual.
  - Respeito à safe-area de dispositivos móveis (`env(safe-area-inset-bottom)`).

---

## 3. Cenários de Aceite BDD (Gherkin)

### Cenário 1: Renderização do Contêiner Mobile e Safe Area
- **Dado** que um usuário acessa o aplicativo via dispositivo móvel ou desktop
- **Quando** a aplicação carrega
- **Então** a interface deve renderizar centralizada com largura ergonômica de smartphone (360px a 430px em desktop e 100% em mobile)
- **E** a área segura inferior (safe-area) deve ser respeitada para não sobrepor a barra de navegação do sistema operacional.

### Cenário 2: Exibição das 5 Posições da Bottom Navbar
- **Dado** que o usuário está na tela inicial
- **Quando** ele visualiza a barra de navegação inferior fixa
- **Então** ele deve visualizar exatamente 5 botões:
  1. `Início` (Dashboard semanal)
  2. `Badges` (Gestão de etiquetas)
  3. `+ Faxina` (Botão central em destaque circular/elevado)
  4. `Casas` (Alternar e vincular casa)
  5. `Histórico` (Histórico semanal)
- **E** cada botão deve possuir dimensões mínimas clicáveis de 44x44px.

### Cenário 3: Alternância Fluida de Abas
- **Dado** que a barra de navegação está visível
- **Quando** o usuário toca em qualquer uma das abas
- **Então** o conteúdo da tela deve alternar de forma imediata e fluida
- **E** a aba selecionada deve apresentar destaque visual (cor primária e micro-animação).

---

## 4. Contratos de Dados e Tipos TypeScript

```typescript
export type TabId = 'home' | 'badges' | 'new-cleaning' | 'houses' | 'history';

export interface TabConfig {
  id: TabId;
  label: string;
  iconName: string;
  isAction?: boolean; // Para o botão central em destaque
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface ActiveHouse {
  id: string;
  name: string;
  inviteCode: string;
  isCreator: boolean;
}
```

---

## 5. Especificação de UX/UI e Design Tokens

### 5.1. Cores Semânticas
- **Primária (Emerald Clean)**: `#10b981` (Hover: `#059669`, Background sutil: `#ecfdf5`).
- **Acento (Cyan Water)**: `#06b6d4`.
- **Superfície / Fundo (Slate Dark)**: Background App `#0f172a`, Superfície `#1e293b`, Borda `#334155`.
- **Texto**: Primário `#f8fafc`, Secundário `#94a3b8`.

### 5.2. Geometria da Bottom Navbar
- Altura base: `68px` + `padding-bottom: env(safe-area-inset-bottom)`.
- Fundo translúcido: `background: rgba(30, 41, 59, 0.85); backdrop-filter: blur(16px)`.
- Botão central: `width: 54px; height: 54px`, circular, transform `translateY(-14px)`, sombra `0 8px 24px rgba(16, 185, 129, 0.4)`.

---

## 6. Plano de Testes
- **Tipagem**: Validar compilação TypeScript com `tsc --noEmit`.
- **Responsividade**: Verificar renderização em 375px (iPhone SE), 390px (iPhone 14) e desktop (>1024px centralizado).
- **Interatividade**: Testar navegação entre todas as 5 abas com feedback visual tátil.
