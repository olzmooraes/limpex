# Regra de Segurança, Limites e Auditoria

Esta regra define os mecanismos técnicos obrigatórios para impor as 5 restrições críticas do Limpex em banco de dados, API e interface.

---

## 1. Teto Global de 100 Usuários

### Requisito:
Bloqueio total de novos cadastros assim que o número de registros na tabela de usuários atingir 100.

### Implementação Obrigatória:
1. **Verificação no Backend / Banco (Defesa em Profundidade)**:
   - Trigger ou função PostgreSQL (ou middleware de autenticação) executada antes de qualquer inserção na tabela de usuários / auth.
   ```sql
   -- Exemplo de Trigger PostgreSQL
   CREATE OR REPLACE FUNCTION check_max_users_limit()
   RETURNS TRIGGER AS $$
   BEGIN
     IF (SELECT COUNT(*) FROM public.users) >= 100 THEN
       RAISE EXCEPTION 'LIMIT_REACHED: O limite máximo de 100 usuários cadastrados foi atingido.';
     END IF;
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;
   ```
2. **Camada de UX Preventiva**:
   - Endpoint ou consulta pública (`/api/auth/capacity-check`) que retorna se o cadastro está liberado ou bloqueado.
   - Quando bloqueado: esconde o formulário de cadastro e a opção de cadastro com Google OAuth; exibe banner informativo: *"O Limpex atingiu o limite de 100 usuários para este ambiente de testes. Novos cadastros estão temporariamente suspensos. Apenas login para usuários já cadastrados."*

---

## 2. Limites de Propriedade e Casas

### Requisitos:
1. Um usuário pode ser proprietário/criador de no máximo **1 casa**.
2. Um usuário pode ser membro de **múltiplas casas**.

### Implementação Obrigatória:
- Restrição de unicidade no banco de dados na coluna `creator_id` da tabela `houses` (`UNIQUE(creator_id)`).
- Se o usuário tentar criar uma segunda casa, a interface desabilita o botão e a API rejeita com código de erro `HOUSE_LIMIT_REACHED`.
- Relação de membros modelada em tabela associativa `house_members (house_id, user_id, role, joined_at)`.

---

## 3. Limite de Badges por Casa (Máximo 34)

### Requisitos:
- 14 badges pré-definidos do sistema fornecidos por padrão ao criar a casa.
- Até 20 badges customizados criados pelo proprietário.
- **Teto absoluto de 34 badges por casa**.

### Implementação Obrigatória:
- Verificação antes da inserção de novos badges: se a contagem de badges ativos daquela casa for $\ge 34$, bloquear a criação.
- A interface oculta ou desabilita o botão "+" de novo badge assim que atingir 34 badges totais (ou 20 customizados).

---

## 4. Matriz de Autorização (RBAC - Role-Based Access Control)

| Ação | Criador da Casa | Membro da Casa | Usuário não membro |
| :--- | :---: | :---: | :---: |
| Visualizar Faxinas da Casa | Sim | Sim | Não |
| Registrar Faxina na Casa | Sim | Sim | Não |
| Editar sua própria Faxina | Sim | Sim | Não |
| Excluir sua própria Faxina | Sim | Sim | Não |
| Criar Badges Customizados | **Sim** | Não | Não |
| Editar Badges | **Sim** | Não | Não |
| Excluir Badges | **Sim** | Não | Não |
| Excluir a Casa | **Sim** | Não | Não |
| Convidar Membros (Código) | Sim | Sim | Não |

---

## 5. Auditoria Obrigatória de Exclusão (Audit Logging)

### Requisito:
Toda exclusão de **casa** ou de **badge** deve registrar um log persistente contendo:
- `timestamp`: Data e hora exata em formato UTC / ISO-8601.
- `user_id`: ID do usuário autenticado que ordenou a exclusão.
- `user_name`: Nome do usuário que realizou a ação.
- `target_type`: `'HOUSE'` ou `'BADGE'`.
- `target_id`: ID da entidade excluída.
- `target_name`: Nome da casa ou do badge.
- `details`: Objeto JSON com metadados adicionais (ex: quantidade de faxinas arquivadas, membros desvinculados).

Os registros de exclusão são **imutáveis** e nunca podem ser deletados.
