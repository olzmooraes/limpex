# SPEC-005: Tela de Login e Cadastro Mobile-First com Bloqueio de 100 Usuários

- **Status**: APPROVED
- **Épico**: [[EPIC-1] Fundação, Autenticação e Teto Global de Usuários](file:///c:/projetos/limpex/.agents/backlog/backlog.md)
- **Tarefa**: `TSK-105`
- **Autor**: Arquiteto AI
- **Data de Criação**: 2026-09-12
- **Última Atualização**: 2026-09-12

---

## 1. Contexto e Objetivo
A tela inicial é a porta de entrada do Limpex e deve fornecer uma experiência visual cativante, acolhedora e ergonômica em smartphones, ao mesmo tempo em que cumpre rigorosamente as **Regras RN-01 a RN-05**: consulta de capacidade prévia, alternância fluida entre login e cadastro, suporte a Google OAuth e **ocultação do cadastro com banner de aviso informativo** sempre que o limite de 100 usuários for atingido.

---

## 2. Regras de Negócio Envolvidas
- **RN-01**: Verificação prévia da contagem de usuários cadastrados no carregamento da tela.
- **RN-02**: Se `total_users < 100`, exibir opções de Login e Cadastro.
- **RN-03**: Se `total_users >= 100`, ocultar a opção de cadastro e exibir aviso informativo de teto atingido, liberando apenas login para usuários já existentes.
- **RN-04**: Alternância visual clara (segmented pill) entre login e cadastro quando liberado.
- **RN-05**: Métodos de acesso por Nome/E-mail e login social via Google OAuth.

---

## 3. Cenários de Aceite BDD (Gherkin)

### Cenário 1: Exibição Inicial com Capacidade Liberada (< 100 Usuários)
- **Dado** que a consulta de capacidade retorna `totalUsers < 100` e `isRegistrationAllowed: true`
- **Quando** o usuário visualiza a tela inicial
- **Então** ele deve ver o seletor em pílula com as opções "Entrar" e "Criar Conta"
- **E** o botão "Continuar com Google" deve estar visível e ativo
- **E** nenhum banner de limite atingido deve ser exibido.

### Cenário 2: Exibição com Limite de 100 Usuários Atingido
- **Dado** que a consulta de capacidade retorna `totalUsers >= 100` e `isRegistrationAllowed: false`
- **Quando** a tela inicial é renderizada
- **Então** a opção/aba "Criar Conta" deve ser completamente ocultada
- **E** um banner de aviso em destaque visual âmbar deve ser exibido com o texto explicativo sobre o limite de 100 usuários
- **E** apenas o formulário de login para contas pré-existentes deve estar disponível.

### Cenário 3: Transição de Sessão ao Autenticar
- **Dado** que o usuário preenche suas credenciais válidas e aciona o botão de entrar
- **Quando** a autenticação for confirmada com sucesso
- **Então** o estado da aplicação deve transicionar suavemente para o Dashboard principal
- **E** o nome do usuário e sua residência devem ser apresentados no cabeçalho.

### Cenário 4: Encerramento de Sessão (Logout)
- **Dado** que o usuário está no Dashboard principal
- **Quando** ele clica no botão de Logout no canto superior direito
- **Então** a sessão ativa deve ser removida
- **E** a tela inicial de autenticação deve ser reexibida imediatamente.

---

## 4. Contratos de Interface e UX Mobile
- Alvos de toque $\ge 44\text{px}$ em botões, abas e inputs.
- Safe Area respeitada no topo e base da tela.
- Feedback visual de loading (spinner) durante submissões assíncronas.
- Mensagens de erro em português claro abaixo dos inputs.

---

## 5. Plano de Testes
- Testar alternância entre abas "Entrar" e "Criar Conta".
- Testar exibição condicional do banner de aviso sob simulação de base cheia.
- Testar fluxo de autenticação e logout com reatividade no `App.tsx`.
