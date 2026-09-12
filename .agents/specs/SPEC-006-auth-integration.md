# SPEC-006: Autenticação com Senha Protegida e Integração Google OAuth

- **Status**: APPROVED
- **Épico**: [[EPIC-1] Fundação, Autenticação e Teto Global de Usuários](file:///c:/projetos/limpex/.agents/backlog/backlog.md)
- **Tarefa**: `TSK-106`
- **Autor**: Arquiteto AI
- **Data de Criação**: 2026-09-12
- **Última Atualização**: 2026-09-12

---

## 1. Contexto e Objetivo
Para cumprir a regra **RN-05** do Limpex, os usuários devem poder se cadastrar e efetuar login através de dois caminhos:
1. **Credenciais Manuais**: Nome, E-mail e Senha protegida.
2. **Login Social**: Conta Google via OAuth.

Esta especificação define o suporte a senhas seguras (com validação mínima de 6 caracteres, armazenamento seguro e controle de visibilidade tátil no smartphone) e a integração do Google OAuth respeitando a **Restrição Obrigatória nº 2** (bloqueio de novos registros quando a contagem atingir 100 usuários).

---

## 2. Regras de Negócio Envolvidas
- **RN-05**: Cadastro manual por nome e e-mail (com senha) e login social via Google.
- **Restrição 2**: A criação de conta via Google para novos usuários deve ser estritamente bloqueada se `total_users >= 100`. Usuários já cadastrados anteriormente continuam podendo logar via Google normalmente.
- **Ergonomia Mobile**: Campo de senha com botão de alternância de visibilidade (mostrar/ocultar) com área de toque mínima de $44 \times 44\text{px}$.

---

## 3. Cenários de Aceite BDD (Gherkin)

### Cenário 1: Validação de Senha no Cadastro
- **Dado** que um usuário está na aba "Criar Conta"
- **Quando** ele digita uma senha com menos de 6 caracteres (ex: `"12345"`) e submete
- **Então** o formulário deve exibir a mensagem `"A senha deve conter no mínimo 6 caracteres."`
- **E** a submissão deve ser interrompida.

### Cenário 2: Cadastro Manual com Sucesso
- **Dado** que o formulário foi preenchido com nome válido, e-mail inédito e senha de 6+ caracteres
- **E** a capacidade do sistema está liberada (`total_users < 100`)
- **Quando** o usuário clica em "Criar Cadastro"
- **Então** a conta deve ser criada com sucesso
- **E** a sessão ativa deve ser iniciada com transição para a tela principal.

### Cenário 3: Login Manual com Senha Incorreta
- **Dado** que o usuário informa um e-mail cadastrado e uma senha incorreta
- **Quando** ele clica em "Entrar no Limpex"
- **Então** o sistema deve rejeitar o acesso com a mensagem `"Senha incorreta. Verifique suas credenciais."`.

### Cenário 4: Alternância de Visibilidade da Senha (Mobile Touch)
- **Dado** que o usuário está digitando a senha em um smartphone
- **Quando** ele clica no ícone de olho (`Eye`)
- **Então** o tipo do campo deve alternar de `password` para `text`, permitindo conferência da senha
- **E** um novo clique deve retornar o campo para `password`.

### Cenário 5: Login Social Google com Verificação de Teto
- **Dado** que um novo usuário tenta autenticar via Google
- **Quando** a base de dados já atingir 100 usuários
- **Então** a criação da nova conta deve ser recusada com o código `USERS_CAP_REACHED`
- **E** o banner explicativo de capacidade cheia deve ser reforçado.

---

## 4. Contratos de Dados e Métodos de Serviço

```typescript
export interface AuthCredentials {
  name?: string;
  email: string;
  password?: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
  errorCode?: string;
}
```

---

## 5. Plano de Testes
- Testar validação de senhas com menos de 6 caracteres.
- Testar registro com senha e posterior login com senha correta e incorreta.
- Testar bloqueio de novo usuário Google sob teto de 100 registros.
