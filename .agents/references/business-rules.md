# Referência de Regras de Negócio do Limpex

Este documento consolida e formaliza todas as regras de negócio extraídas da especificação original ([especificacao_app_faxina.md](../../especificacao_app_faxina.md)).

---

## 1. Regras de Autenticação e Teto Global de Usuários (RN-01 a RN-05)

- **RN-01 (Verificação Prévia de Capacidade)**: O aplicativo deve consultar a contagem total de usuários cadastrados antes de liberar o formulário de cadastro.
- **RN-02 (Cadastro Liberado para < 100 Usuários)**: Enquanto a contagem for inferior a 100 usuários, a interface exibe as opções completas de login e novo cadastro.
- **RN-03 (Bloqueio Automático para $\ge 100$ Usuários)**: Ao atingir ou superar 100 usuários, o cadastro é desabilitado imediatamente. A tela exibe um aviso informando que o limite foi atingido e permite apenas o login de usuários já existentes.
- **RN-04 (Alternância de Acesso)**: A tela inicial deve fornecer alternância fluida entre login e cadastro (quando liberado).
- **RN-05 (Métodos de Cadastro e Login)**:
  - Registro manual por Nome e E-mail (com senha segura).
  - Autenticação social via Google OAuth.

---

## 2. Regras da Tela Principal - Dashboard Semanal (RN-06 e RN-07)

- **RN-06 (Navegação & Cabeçalho)**:
  - Exibe o resumo das faxinas realizadas na **semana vigente**.
  - No canto superior direito, exibe botão de Logout (Sair).
  - Na parte inferior, exibe a Bottom Navbar fixa de 5 posições.
- **RN-07 (Cards de Faxinas Realizadas)**:
  - Identificação clara do usuário que executou a faxina.
  - Dia da semana em que a faxina foi realizada (`dom`, `seg`, `ter`, `qua`, `qui`, `sex`, `sab`).
  - Lista de tarefas executadas (chips de badges).
  - **Comportamento Expansível**: Se a lista contiver mais de 2 tarefas, exibe opção para expandir/recolher os itens excedentes.
  - **Indicativo Visual de Observações**: Exibir ícone visível caso o registro contenha notas/ressalvas.
- **RN-08 (Reset Semanal)**: Ao início de um novo ciclo semanal (domingo/segunda), a tela principal reinicia a visualização para a nova semana, enquanto todo o histórico pretérito permanece intacto e acessível na tela de histórico.

---

## 3. Regras de Registro de Faxina - Item Central da Navbar (RN-09)

- **RN-09 (Formulário de Registro de Limpeza)**:
  - **Responsável**: Vem pré-selecionado com o usuário autenticado, mas permite alteração para qualquer outro membro pertencente à casa selecionada.
  - **Dia da Semana**: Vem pré-selecionado com o dia atual, ajustável para qualquer outro dia da semana.
  - **Seleção de Badges/Tarefas**: Permite seleção múltipla entre os badges ativos da casa.
  - **Campo de Observações**: Campo de texto livre opcional para anotações e ressalvas.

---

## 4. Regras de Badges e Tags de Tarefas (RN-10 a RN-15)

- **RN-10 (Badges Pré-definidos do Sistema)**:
  Toda casa é inicializada com os 14 badges padrão:
  1. Janelas
  2. Portas
  3. Quarto 1
  4. Quarto 2
  5. Quarto 3
  6. Banheiro
  7. Varanda
  8. Cozinha
  9. Sala
  10. Casa completa
  11. Garagem
  12. Calçada
  13. Área gourmet
  14. Mobília
- **RN-11 (Badges Customizados)**: O criador da casa pode adicionar novos badges digitando um nome descritivo.
- **RN-12 (Teto de Badges)**:
  - Permitido criar até **20 badges customizados**.
  - Limite máximo absoluto de **34 badges por casa**.
  - O botão de adicionar badge fica desabilitado ao atingir esses limites.
- **RN-13 (Edição de Badges)**: Todos os badges (padrão ou customizados) podem ser editados pelo criador da casa.
- **RN-14 (Exclusão de Badges)**: Todos os badges (padrão ou customizados) podem ser excluídos pelo criador da casa.
- **RN-15 (Auditoria de Exclusão)**: A exclusão de qualquer badge gera obrigatoriamente um registro no log de auditoria.

---

## 5. Regras de Casas e Membros (RN-16 a RN-22)

- **RN-16 (Criação de Casa)**: Um usuário autenticado pode criar uma casa. Ao criar, o sistema gera automaticamente um código único de convite.
- **RN-17 (Vínculo via Código)**: Qualquer usuário autenticado pode entrar em uma casa informando o código de convite.
- **RN-18 (Limite de Propriedade)**: Cada usuário pode ser criador/dono de apenas **1 casa**.
- **RN-19 (Múltiplas Casas como Membro)**: Um usuário pode participar de **várias casas** simultaneamente e alternar entre elas.
- **RN-20 (Permissões de Registro)**: Qualquer membro vinculado à casa pode registrar e visualizar faxinas.
- **RN-21 (Permissões Administrativas)**: Apenas o criador da casa tem permissão para gerenciar badges (criar, editar, excluir) e para excluir a casa.
- **RN-22 (Auditoria de Exclusão de Casa)**: A exclusão da casa gera obrigatoriamente um registro no log de auditoria contendo autor, data/hora e identificação da casa.

---

## 6. Regras da Tela de Histórico de Limpezas (RN-23 a RN-27)

- **RN-23 (Agrupamento Semanal)**: Cards organizados verticalmente, dispostos semana a semana.
- **RN-24 (Formato Obrigatório do Título)**:
  `"Semana [1 a 4] de [Nome do Mês] de [Ano]"` (Ex: *"Semana 2 de Setembro de 2026"*).
- **RN-25 (Blocos dos Dias da Semana)**:
  Abaixo do título, exibe os 7 dias lado a lado em linha única:
  `dom  seg  ter  qua  qui  sex  sab`
  Os blocos correspondentes aos dias em que houve faxina registrada recebem cor de fundo de destaque.
- **RN-26 (Exibição Condicional)**: Apenas semanas que contiverem ao menos uma faxina registrada são exibidas na lista.
- **RN-27 (Detalhamento Expansível)**: Ao tocar no card da semana, ele se expande exibindo o consolidado de todas as atividades realizadas naquela semana.

---

## 7. Decisões de Produto de 2026-10-01 (prevalecem sobre as seções acima)

Aprovadas pelo dono do produto após a revisão técnica de 2026-10-01. Onde houver conflito com as regras anteriores ou com a especificação original, valem estas.

### Revisões de regras existentes
- **RN-08 (revisada — Semana e Reset Semanal)**: A semana vai de **domingo a sábado**, no fuso **America/Sao_Paulo** (horário de Brasília). A virada ocorre no domingo às 00:00. A semana pertence ao mês que contém a maior parte dos seus dias, ou seja, o mês da sua quarta-feira.
- **RN-24 (revisada — Título da Semana)**: `"Semana [N] de [Nome do Mês] de [Ano]"`, com **N de 1 a 5**, numerando as semanas do mês pelo critério da RN-08. Ex.: a semana de 27/09/2026 a 03/10/2026 é *"Semana 5 de Setembro de 2026"*.
- **RN-09 (revisada — Data da Faxina)**: Os chips `dom`..`sab` representam a semana atual, com os dias futuros desabilitados. A opção "Outra data" permite qualquer data passada a partir da criação da casa. Datas futuras são sempre rejeitadas.
- **RN-05 (revisada — Autenticação)**: Cadastro por nome, e-mail e senha, sem critério de força além do mínimo de 6 caracteres imposto pelo Supabase Auth. Sem confirmação de e-mail no cadastro. Há recuperação de senha por e-mail. O login com Google permanece no escopo, mas é implementado depois do fluxo de e-mail e senha.
- **RN-14 (revisada — Exclusão de Badge)**: A exclusão é lógica. Faxinas de semanas anteriores mantêm o badge, com o nome preservado no histórico. Faxinas da semana atual perdem o vínculo com o badge excluído. Se uma faxina ficar sem tarefas, o registro é mantido e sinalizado como "sem tarefas" para que seja editado.

### Novas regras
- **RN-28 (Edição e Exclusão de Faxina)**: Quem registrou a faxina e o responsável por ela podem editá-la ou excluí-la (correção de erro humano). A exclusão de faxina não gera log de auditoria.
- **RN-29 (Saída da Casa)**: Um membro pode sair de uma casa. O criador não pode sair da própria casa, apenas excluí-la. Não há transferência de propriedade. As faxinas de ex-membros permanecem no histórico com o nome do responsável.
- **RN-30 (Remoção de Membro)**: O criador pode remover membros da casa. A saída e a remoção de membros geram registro no log de auditoria (extensão da Restrição nº 5).
- **RN-31 (Novo Código de Convite)**: O criador pode gerar um novo código de convite, invalidando o anterior.
