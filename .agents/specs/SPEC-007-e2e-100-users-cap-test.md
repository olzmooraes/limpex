# SPEC-007: Testes Automatizados E2E da Barreira de 100 Usuários e Homologação do Épico 1

- **Status**: APPROVED
- **Épico**: [[EPIC-1] Fundação, Autenticação e Teto Global de Usuários](file:///c:/projetos/limpex/.agents/backlog/backlog.md)
- **Tarefa**: `TSK-107`
- **Autor**: Arquiteto AI
- **Data de Criação**: 2026-09-12
- **Última Atualização**: 2026-09-12

---

## 1. Contexto e Objetivo
Esta especificação estabelece a bateria de testes automatizados de ponta a ponta (E2E) para homologação completa do **Épico 1**, garantindo que a **Restrição Obrigatória nº 2** (teto global de 100 usuários) seja verificada de maneira exaustiva através de 7 gates de auditoria técnica.

---

## 2. Regras de Negócio e Restrições Auditadas
- **Restrição 2 (Teto Global de 100 Usuários)**: Rejeição incondicional do 101º cadastro.
- **RN-01 a RN-05**: Verificação prévia de capacidade, login social, registro manual com senha e preservação do acesso de contas já existentes.

---

## 3. Matriz de Auditoria dos 7 Gates

```
[ Gate 1: Capacidade Inicial ] ➔ [ Gate 2: Carga de 100 Usuários ] ➔ [ Gate 3: Transição de Status ]
       ➔ [ Gate 4: Rejeição 101º Manual ] ➔ [ Gate 5: Rejeição 101º Google ]
       ➔ [ Gate 6: Acesso de Contas Existentes ] ➔ [ Gate 7: Integridade Visual UI ]
```

### Gate 1: Verificação de Capacidade Inicial
- **Critério**: Base inicial limpa deve acusar `totalUsers: 0` e `isRegistrationAllowed: true`.

### Gate 2: Inserção Sequencial de 100 Usuários Válidos
- **Critério**: O sistema deve aceitar com sucesso exatamente 100 usuários distintos, gerando IDs e persistindo credenciais.

### Gate 3: Transição do Estado de Capacidade
- **Critério**: Imediatamente após o 100º usuário, `authService.checkCapacity()` deve retornar `totalUsers: 100` e `isRegistrationAllowed: false`.

### Gate 4: Rejeição Inviolável do 101º Usuário Manual
- **Critério**: Qualquer chamada a `authService.register()` deve retornar `success: false` com `errorCode: 'USERS_CAP_REACHED'`.

### Gate 5: Rejeição Inviolável do 101º Usuário Google OAuth
- **Critério**: Qualquer tentativa de novo cadastro via `authService.loginWithGoogle()` com conta inédita deve retornar `success: false` com `errorCode: 'USERS_CAP_REACHED'`.

### Gate 6: Acesso Pleno para Contas Pré-existentes
- **Critério**: Usuários já cadastrados (ex: Usuário 1) devem conseguir realizar login normalmente sem nenhum bloqueio.

### Gate 7: Resposta da Interface (UI Adaptativa)
- **Critério**: O hook `useSystemCapacity` deve instruir a `AuthScreen` a ocultar a aba "Criar Conta" e exibir o banner de aviso em destaque.

---

## 4. Teardown e Restauração de Ambiente
Ao término da execução da suíte, o executor deve redefinir o armazenamento local para o estado padrão de demonstração (`Luiz Otávio`, `Carlos Oliveira`, `Mariana Silva`), preservando a usabilidade contínua do aplicativo de testes.
