# Especificação do Aplicativo: Gerenciador de Faxinas Mobile First

## 1. PAPEL
Você é um especialista em criação de App mobile first com UX/UI sênior.

## 2. OBJETIVO
Criação de um App mobile para gerenciar as faxinas feitas em uma casa de acordo com os usuários cadastrados naquela casa. Um usuário cria a casa e adiciona os outros usuários.

## 3. CONTEXTO
Em uma casa onde as pessoas possuem rotinas diferentes, o aplicativo irá gerenciar quais faxinas foram realizadas e em qual dia da semana, resetando os valores a cada fim de semana.

---

## 4. REGRAS DE PROCESSAMENTO

### 4.1. Tela Inicial e Autenticação
1. **Validação de Usuários:** O App fará uma verificação inicial no banco de dados para contagem de usuários cadastrados.
2. **Limite < 100 Usuários:** Apresenta a tela tradicional de login e opção de cadastro.
3. **Limite ≥ 100 Usuários:** Exibe um aviso informando que o limite de novos cadastros foi atingido, disponibilizando apenas os campos de login para usuários já existentes.
4. **Opções de Acesso:** A tela inicial deve conter alternância clara entre novo cadastro e login.
5. **Métodos de Cadastro:**
   - Registro manual via nome e e-mail.
   - Login social via conta Google.

### 4.2. Tela Principal (1º Item da Navbar)
6. **Elementos da Tela Principal:**
   - **6.1.** Faxinas já realizadas na semana vigente.
   - **6.2.** Navbar de navegação principal na parte inferior da tela.
   - **6.3.** Botão de Logout (Sair) no canto superior direito.
7. **Exibição dos Cards de Faxinas Realizadas:**
   - **7.1.** Lista com as tarefas executadas (expansível se contiver mais de 2 itens).
   - **7.2.** Identificação do usuário que realizou a faxina.
   - **7.3.** Dia da semana em que foi realizada.
   - **7.4.** Ícone indicativo visual caso haja observações ou ressalvas anexadas.

### 4.3. Tela de Criação de Faxinas (Item Central da Navbar)
8. **Campos do Formulário de Registro:**
   - **8.1. Responsável pela Faxina:** Pré-definido com o usuário logado, permitindo alterar para qualquer outro membro vinculado à casa.
   - **8.2. Dia da Semana:** Pré-definido com o dia atual, ajustável para qualquer outro dia da semana.
   - **8.3. Seleção de Tarefas (Badges):** Múltipla seleção de badges/etiquetas correspondentes às tarefas feitas.
   - **8.4. Observações:** Campo de texto livre para anotações ou ressalvas.

### 4.4. Tela de Gestão de Badges / Tags (Item da Navbar)
9. **Finalidade:** Agilizar o registro evitando a digitação repetitiva de tarefas.
10. **Badges Pré-definidos do Sistema:**
    - Janelas
    - Portas
    - Quarto 1
    - Quarto 2
    - Quarto 3
    - Banheiro
    - Varanda
    - Cozinha
    - Sala
    - Casa completa
    - Garagem
    - Calçada
    - Área gourmet
    - Mobília
11. **Criação de Badges Customizados:** O usuário pode criar novos badges acionando o ícone de adição e nomeando o item.
12. **Limite de Criação:** Permitido criar até **20 novos badges personalizados** e até 34 badges no total por casa.
13. **Exclusão:** Todos os badges (pré-existentes e personalizados) podem ser excluídos.
14. **Edição:** Todos os badges (pré-existentes e personalizados) podem ser editados.

### 4.5. Tela de Criar / Vincular a uma Casa (Item da Navbar)
15. **Criação de Casa:** O usuário pode criar uma casa e compartilhar o código gerado para convidar outros usuários.
16. **Vínculo por Código:** Usuários podem se juntar a uma casa informando o código de convite.
17. **Autenticação Obrigatória:** Apenas usuários cadastrados e autenticados podem integrar uma casa.
18. **Limite de Criação:** Cada usuário pode criar apenas **1 casa**.
19. **Múltipla Participação:** Um usuário pode participar de **várias casas**.
20. **Permissão de Registro:** Qualquer membro vinculado à casa pode registrar faxinas.
21. **Permissão de Badges:** Apenas o **criador da casa** possui permissão para criar e excluir badges.
22. **Permissão de Exclusão da Casa:** Apenas o **criador da casa** tem permissão para excluir a casa.

### 4.6. Tela de Histórico de Limpezas (Item da Navbar)
- **Organização:** Cards empilhados verticalmente, dispostos semana a semana.
- **Padrão do Título:** `"Semana [1 a 4] de [Nome do Mês] de [Ano]"`
- **Visualização Semanal por Blocos:** Abaixo do título, exibe os 7 dias da semana (`dom`, `seg`, `ter`, `qua`, `qui`, `sex`, `sab`) em blocos lado a lado em linha única, com cor de fundo destacada nos dias em que houve registro de faxina.
- **Visualização condicional:** Apenas será exibido as semanas que houveram alguma faxina
- **Detalhamento Expansível:** Ao clicar no card, ele se expande exibindo o consolidado das atividades executadas naquela semana.

---

## 5. RESTRIÇÕES OBRIGATÓRIAS
1. **Padrão UX/UI Mobile-First:** Interface responsiva otimizada para telas sensíveis ao toque e navegação fluida por navbar inferior.
2. **Limite Global de Cadastros:** Bloqueio automático de novos registros ao atingir a marca de 100 usuários no banco de dados.
3. **Limites de Propriedade:** 
   - Máximo de 1 casa criada por usuário.
   - Máximo de 34 badges por casa.
4. **Hierarquia de Permissões:**
   - Gestão de Badges e exclusão da casa restritas exclusivamente ao criador/proprietário da casa.
   - Registro e visualização de faxinas abertos a todos os membros vinculados.
5. **Criação de logs de exclusão:** Ao excluir uma casa ou um badge, deverá ser criado um log de exclusão, contendo as seguintes informações:
    - Data e hora da exclusão
    - Quem excluiu
    - O que foi excluído