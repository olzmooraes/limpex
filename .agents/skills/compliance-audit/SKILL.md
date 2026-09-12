---
name: compliance-audit
description: >-
  Use this skill to audit code, pull requests, or feature implementations against the 5 mandatory business rules and constraints of Limpex (100 users cap, 34 badges cap, house ownership limits, role permissions, and exclusion logs).
---

# Skill: Compliance Audit (Auditoria de Conformidade)

Esta skill executa uma varredura de integridade para garantir que nenhuma alteração no Limpex viole as regras e restrições fundamentais do produto.

---

## Lista de Verificação Obrigatória (5 Regras de Ouro)

Antes de considerar qualquer entrega concluída, o agente deve auditar os seguintes 5 pontos:

### 1. Limite Global de 100 Usuários
- [ ] O backend/banco possui proteção intransponível contra o 101º cadastro (função/trigger ou middleware de auth)?
- [ ] A tela inicial consulta a capacidade antes de exibir opções de cadastro?
- [ ] Caso `total_users >= 100`, o formulário de cadastro é ocultado e o aviso informativo é renderizado?
- [ ] Tentativas de login com Google de usuários novos não cadastrados são barradas caso o limite esteja atingido?

### 2. Limite de Propriedade de Casas
- [ ] Existe restrição `UNIQUE` ou validação estrita que impede um usuário de criar uma 2ª casa?
- [ ] Um usuário pode vincular-se e alternar entre múltiplas casas das quais é membro?

### 3. Limite de Badges por Casa (Máx 34)
- [ ] Ao criar uma casa, os 14 badges do sistema são inicializados?
- [ ] Há validação que restringe a criação de no máximo 20 novos badges customizados?
- [ ] Há validação que impede que a contagem total de badges de uma casa ultrapasse 34?

### 4. Permissões de Acesso (RBAC)
- [ ] Apenas o criador da casa tem permissão para criar, editar e excluir badges?
- [ ] Apenas o criador da casa tem permissão para excluir a casa?
- [ ] Membros comuns conseguem registrar e visualizar faxinas, mas têm botões administrativos ocultados/bloqueados?

### 5. Logs de Exclusão (Auditoria)
- [ ] A exclusão de uma casa grava um log com data/hora, ID/nome do autor e detalhes da casa excluída?
- [ ] A exclusão de um badge grava um log com data/hora, ID/nome do autor e detalhes do badge excluído?
- [ ] Os logs de exclusão são protegidos contra mutação ou exclusão acidental?

---

## Relatório de Auditoria
Se algum item falhar, o agente deve relatar a não-conformidade imediatamente e gerar o patch de correção antes de concluir a tarefa.
