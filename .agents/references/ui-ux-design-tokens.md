# Sistema de Design e Tokens Visuais Mobile-First (UI/UX Design Tokens)

Diretrizes e tokens visuais para garantir uma interface moderna, vibrante, polida e de alto nível de usabilidade no Limpex.

---

## 1. Filosofia Visual
- **Mobile First & Thumb Friendly**: Otimizado para manuseio com uma mão em smartphones.
- **Glassmorphism & Profundidade**: Efeitos de desfoque de fundo (`backdrop-filter: blur(16px)`) na navbar e em cards flutuantes.
- **Micro-interações**: Transições suaves (`cubic-bezier(0.4, 0, 0.2, 1)`), feedback visual e tátil ao pressionar botões e badges.
- **Alto Contraste e Legibilidade**: Conformidade com WCAG AA para contrastes de texto e ícones.

---

## 2. Paleta de Cores Semântica

```css
:root {
  /* Brand / Primária - Verde Limpeza Fresco / Esmeralda */
  --color-primary-50: #ecfdf5;
  --color-primary-100: #d1fae5;
  --color-primary-500: #10b981;
  --color-primary-600: #059669;
  --color-primary-700: #047857;

  /* Secundária / Accent - Ciano / Azul Água */
  --color-accent-400: #22d3ee;
  --color-accent-500: #06b6d4;
  --color-accent-600: #0891b2;

  /* Alerta & Atenção - Amarelo / Âmbar */
  --color-warning-100: #fef3c7;
  --color-warning-500: #f59e0b;
  --color-warning-600: #d97706;

  /* Destrutivo / Erro - Coral / Rubi */
  --color-danger-100: #fee2e2;
  --color-danger-500: #ef4444;
  --color-danger-600: #dc2626;

  /* Neutros & Superfícies (Modo Escuro Padrão Elegante) */
  --bg-app: #0f172a;           /* Fundo principal profundo */
  --bg-surface: #1e293b;       /* Cards e contêineres */
  --bg-surface-elevated: #334155; /* Elementos elevados / modais */
  --border-subtle: #334155;    /* Bordas sutis */
  --text-primary: #f8fafc;     /* Texto de alto contraste */
  --text-secondary: #94a3b8;   /* Rótulos e legendas */
  --text-muted: #64748b;       /* Elementos desabilitados */
}
```

---

## 3. Tipografia
- **Família de Fontes**: `Inter`, `-apple-system`, `BlinkMacSystemFont`, `"Segoe UI"`, `Roboto`, `sans-serif`.
- **Escala de Texto**:
  - `Display / Título de Página`: 22px / 28px, semi-bold (600).
  - `Título de Seção / Card`: 17px / 22px, medium (500).
  - `Corpo Regular`: 15px / 20px, regular (400).
  - `Legenda / Badges`: 12px / 16px, medium (500), tracking leve.

---

## 4. Dimensões & Espaçamento Mobile
- **Alvo Mínimo de Toque (Touch Target)**: `44px x 44px`.
- **Altura da Bottom Navbar**: `68px` (+ safe area bottom).
- **Raio de Borda (Border Radius)**:
  - Botões e Chips: `12px` a `9999px` (pílula).
  - Cards: `18px`.
  - Modais e Bottom Sheets: `24px 24px 0 0`.
- **Margem Lateral Padrão**: `16px` a `20px` nas bordas da tela.

---

## 5. Especificação da Barra de Navegação Inferior (Bottom Navbar)

```
+-------------------------------------------------------------+
|  [ Início ]   [ Badges ]   (( + Faxina ))   [ Casas ]   [ Histórico ]  |
+-------------------------------------------------------------+
```

1. **Item 1: Início / Semana**:
   - Ícone: Home / Check-List.
   - Ação: Exibe o dashboard com as faxinas da semana atual e botão de logout.
2. **Item 2: Badges**:
   - Ícone: Tag / Etiquetas.
   - Ação: Gestão de tarefas (14 fixas + customizadas, limite 34).
3. **Item 3: + Faxina (Botão Central em Destaque)**:
   - Formato: Botão circular ligeiramente elevado (`box-shadow: 0 8px 24px rgba(16, 185, 129, 0.4)`).
   - Ícone: Mais (+) proeminente com gradiente primário.
   - Ação: Abre diretamente o formulário de registro de faxina.
4. **Item 4: Casas**:
   - Ícone: Casa / Moradia com badge de vínculo.
   - Ação: Tela de alternar casa, criar casa ou entrar por código de convite.
5. **Item 5: Histórico**:
   - Ícone: Calendário / Linha do tempo.
   - Ação: Visualização empilhada das semanas anteriores com bloco de 7 dias.
