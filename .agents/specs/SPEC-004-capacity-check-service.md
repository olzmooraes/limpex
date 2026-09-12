# SPEC-004: Serviço e Hook de Consulta Prévia de Capacidade (< 100 Usuários)

- **Status**: APPROVED
- **Épico**: [[EPIC-1] Fundação, Autenticação e Teto Global de Usuários](file:///c:/projetos/limpex/.agents/backlog/backlog.md)
- **Tarefa**: `TSK-104`
- **Autor**: Arquiteto AI
- **Data de Criação**: 2026-09-12
- **Última Atualização**: 2026-09-12

---

## 1. Contexto e Objetivo
Para oferecer uma experiência de usuário (UX) elegante e transparente em dispositivos móveis, o Limpex não deve esperar que o usuário preencha todo o formulário de cadastro para só então informá-lo de que o limite de 100 usuários foi atingido. Esta especificação define o serviço de autenticação (`authService`) e o custom hook reativo (`useSystemCapacity`), responsáveis por verificar previamente o status de capacidade do sistema no momento em que o aplicativo é carregado, permitindo que a tela inicial se adapte instantaneamente.

---

## 2. Regras de Negócio e Restrições Envolvidas
- **Restrição 2 (Teto Global de 100 Usuários)**: A tela inicial deve consultar a contagem e esconder o formulário de novo cadastro se $\ge 100$.
- **RN-01 (Verificação Prévia)**: Chamada assíncrona ao carregar a tela de acesso.
- **RN-02 (Permissão de Cadastro)**: Se `total_users < 100`, expõe `isRegistrationAllowed = true`.
- **RN-03 (Bloqueio de Cadastro)**: Se `total_users >= 100`, expõe `isRegistrationAllowed = false`.

---

## 3. Cenários de Aceite BDD (Gherkin)

### Cenário 1: Consulta com Capacidade Disponível
- **Dado** que a base contém 42 usuários cadastrados
- **Quando** o hook `useSystemCapacity` é acionado
- **Então** ele deve retornar `totalUsers: 42`, `maxUsers: 100`, `isRegistrationAllowed: true`
- **E** `isLoading` deve transicionar de `true` para `false` sem erros.

### Cenário 2: Consulta com Teto de 100 Usuários Atingido
- **Dado** que a base contém 100 usuários cadastrados
- **Quando** o hook `useSystemCapacity` é acionado
- **Então** ele deve retornar `totalUsers: 100`, `maxUsers: 100`, `isRegistrationAllowed: false`
- **E** a aplicação deve ter a informação necessária para ocultar as opções de novo cadastro.

### Cenário 3: Tolerância a Falhas e Resiliência
- **Dado** que ocorra uma falha transitória de rede durante a consulta RPC
- **Quando** a exceção for capturada pelo serviço
- **Então** o serviço não deve quebrar a aplicação, mas retornar um estado de erro amigável permitindo retry manual (`refetch()`).

---

## 4. Contratos de Dados e Tipos TypeScript

```typescript
export interface SystemCapacity {
  totalUsers: number;
  maxUsers: number;
  isRegistrationAllowed: boolean;
}

export interface UseSystemCapacityReturn extends SystemCapacity {
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}
```

---

## 5. Plano de Testes
- Testar execução do serviço `authService.checkCapacity()` sob cenários simulados (< 100 e >= 100).
- Testar revalidação através da função `refetch()`.
