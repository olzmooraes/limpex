# SPEC-003: Gatilho e Trava de Limite Global de 100 Usuários

- **Status**: APPROVED
- **Épico**: [[EPIC-1] Fundação, Autenticação e Teto Global de Usuários](file:///c:/projetos/limpex/.agents/backlog/backlog.md)
- **Tarefa**: `TSK-103`
- **Autor**: Arquiteto AI
- **Data de Criação**: 2026-09-12
- **Última Atualização**: 2026-09-12

---

## 1. Contexto e Objetivo
A **Restrição Obrigatória nº 2** do Limpex estabelece que o sistema deve suportar no máximo 100 usuários cadastrados globalmente. Esta especificação define a implementação de uma barreira inviolável no nível de banco de dados (gatilho/trigger PostgreSQL) que aborta qualquer tentativa de inserção que resulte em mais de 100 usuários, além de uma função RPC segura para consulta prévia de capacidade sem exposição de dados pessoais.

---

## 2. Regras de Negócio e Restrições Envolvidas
- **Restrição 2 (Teto Global de 100 Usuários)**: O banco de dados e a camada de autenticação devem travar rigorosamente a criação do 101º usuário.
- **RN-01**: Verificação prévia da capacidade no banco antes de exibir formulários de cadastro.
- **RN-02**: Enquanto existirem menos de 100 usuários cadastrados (`COUNT(*) < 100`), o cadastro de novos usuários é permitido.
- **RN-03**: Ao atingir ou superar 100 usuários cadastrados (`COUNT(*) >= 100`), qualquer novo registro manual ou via Google OAuth é bloqueado.

---

## 3. Cenários de Aceite BDD (Gherkin)

### Cenário 1: Cadastro Permitido abaixo de 100 Usuários
- **Dado** que existem 99 usuários cadastrados na tabela `public.users`
- **Quando** um novo usuário solicita cadastro
- **Então** o registro do 100º usuário deve ser inserido com sucesso
- **E** a contagem de usuários passa a ser exatamente 100.

### Cenário 2: Bloqueio Rigoroso do 101º Cadastro (Trigger)
- **Dado** que existem 100 usuários cadastrados na tabela `public.users`
- **Quando** um 101º usuário tentar ser inserido via registro manual ou Google OAuth
- **Então** o trigger do banco de dados deve interceptar a inserção antes da gravação (`BEFORE INSERT`)
- **E** disparar uma exceção SQL com o código de erro `'USERS_CAP_REACHED'`
- **E** a tabela `public.users` deve continuar contendo no máximo 100 registros.

### Cenário 3: Consulta Segura de Capacidade do Sistema (RPC)
- **Dado** que um usuário anônimo abre a tela inicial do aplicativo
- **Quando** o frontend executa a função RPC `get_system_capacity()`
- **Então** o sistema deve retornar um objeto JSON `{ "total_users": X, "max_users": 100, "is_registration_allowed": boolean }`
- **E** nenhum dado confidencial (nomes ou e-mails) de outros usuários deve ser retornado.

---

## 4. Especificação Técnica e Contratos SQL

### 4.1. Função e Trigger PostgreSQL
```sql
CREATE OR REPLACE FUNCTION public.check_max_users_limit()
RETURNS TRIGGER AS $$
DECLARE
    current_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO current_count FROM public.users;
    
    IF current_count >= 100 THEN
        RAISE EXCEPTION 'USERS_CAP_REACHED: O limite de 100 usuários cadastrados foi atingido.'
            USING ERRCODE = 'P0001';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trigger_check_max_users_limit
BEFORE INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.check_max_users_limit();
```

### 4.2. Função RPC de Consulta de Capacidade
```sql
CREATE OR REPLACE FUNCTION public.get_system_capacity()
RETURNS JSONB AS $$
DECLARE
    user_count INTEGER;
    max_cap CONSTANT INTEGER := 100;
BEGIN
    SELECT COUNT(*) INTO user_count FROM public.users;
    RETURN jsonb_build_object(
        'total_users', user_count,
        'max_users', max_cap,
        'is_registration_allowed', (user_count < max_cap)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_system_capacity() TO anon, authenticated;
```

---

## 5. Plano de Testes
- Teste unitário de simulação inserindo 100 usuários sequencialmente.
- Tentativa da 101ª inserção verificando que o erro retornado contém `USERS_CAP_REACHED`.
- Verificação do retorno da função RPC `get_system_capacity()`.
