# Regra de Design: Mobile-First UX/UI Guidelines

Esta regra estabelece os padrões visuais, ergonômicos e de usabilidade para garantir que o Limpex proporcione uma experiência móvel de padrão internacional.

---

## 1. Ergonomia e Áreas de Toque (Touch Ergonomics)

1. **Alvos de Toque (Touch Targets)**:
   - Todo elemento clicável (botões, ícones, chips de badges, links) deve possuir área mínima interativa de **44 x 44px**.
   - Espaçamento mínimo de **8px** entre elementos clicáveis adjacentes para evitar toques acidentais.
2. **Thumb Zone (Zona do Polegar)**:
   - Ações frequentes e primárias (registrar faxina, alternar abas, salvar) devem ficar localizadas na metade inferior da tela.
   - Ações destrutivas (excluir casa, excluir badge, logout) devem exigir confirmação explícita em modal/bottom sheet com feedback háptico/visual.
3. **Safe Areas**:
   - Respeitar estritamente as margens de entalhe (notch) superior e barra de gestos inferior (`env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`).

---

## 2. Padrão da Barra de Navegação Inferior (Bottom Navbar)

A navbar inferior é a espinha dorsal de navegação do Limpex e deve conter exatamente 5 posições:

```
[ 1. Início / Semana ]  [ 2. Badges ]  [ ★ 3. + Faxina (Central) ]  [ 4. Casas ]  [ 5. Histórico ]
```

### Especificações da Navbar:
- **Posição Fixa**: Fixada na base da tela com `z-index` elevado e efeito de desfoque translúcido (*backdrop-blur glassmorphism*).
- **Botão Central (+ Faxina)**:
  - Destacado visualmente (formato ligeiramente elevado / circular, cor de destaque primária).
  - Ação direta para abrir a tela/modal de criação de faxina.
- **Indicador Ativo**: Ícone e label com cor de destaque vibrante e micro-transição suave ao alternar.

---

## 3. Elementos de Interface Específicos do Limpex

### 3.1. Cards de Faxinas da Semana (Tela Principal)
- Exibe o responsável, o dia da semana e a lista de tarefas executadas.
- **Comportamento Expansível**: Se contiver mais de 2 itens, exibe um botão/gatilho discreto `+ X itens` ou chevron animado para expandir/recolher.
- **Ícone de Ressalvas/Observações**: Se houver texto no campo de observação, exibir ícone visível (ex: balão de diálogo ou prancheta com tooltip/bottom-sheet).

### 3.2. Seletor de Badges (Tela de Criação de Faxinas)
- Exibição em grade de chips/pílulas selecionáveis.
- Estados visuais claros:
  - Não selecionado: borda sutil, fundo neutro.
  - Selecionado: fundo com cor de destaque, ícone de check e leve elevação.
- Feedback tátil com transição CSS fluida ao alternar.

### 3.3. Cards de Histórico Semanal
- Padrão de título: `"Semana [1 a 4] de [Nome do Mês] de [Ano]"`.
- Faixa horizontal com os 7 dias da semana em linha única sem quebra:
  `dom` | `seg` | `ter` | `qua` | `qui` | `sex` | `sab`
- Dias com faxina registrada recebem cor de fundo de destaque (badge com preenchimento sólido); dias sem faxina ficam com fundo atenuado/translúcido.
- Apenas semanas que tiveram faxinas são renderizadas.
- Ao tocar no card, ele se expande exibindo o consolidado das atividades.
