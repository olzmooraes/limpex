# SPEC-009: Modelagem e Seed dos 14 Badges de Sistema Pré-definidos

- **Status**: APPROVED
- **Épico**: [Épico 3 — Gestão de Badges de Tarefas e Limitações](file:///c:/projetos/limpex/.agents/backlog/backlog.md)
- **Tarefas**: `TSK-301` (modelo + seed); TSK-303/TSK-305 herdam RN-10 a RN-15
- **Autor**: Arquiteto AI
- **Data de Criação**: 2026-09-14
- **Última Atualização**: 2026-09-14 (TSK-301)

---

## 1. Contexto e Objetivo
O Limpex usa **badges** como etiquetas de tarefas de faxina vinculadas a cada casa (janelas, portas, cômodos, etc.). NN-10 exige que **toda casa nasça com exatamente 14 badges pré-definidos do sistema**. Esta spec consolida a fonte única de verdade (RN-10..RN-15) e o **seed automático** dos 14 badges na criação de cada casa — espelhando o trigger `handle_new_house` no banco, o `dbService.createHouse` no mock e as constantes compartilhadas usadas pela UI.

Esta é a **spec base do Épico 3 (TSK-301)**. As demais regras (teto de customizados RN-11/RN-12, edição RN-13, exclusão com auditoria RN-14/RN-15) são tarefas subsequentes (TSK-303..305) que herdam este modelo.

---

## 2. Regras de Negócio Envolvidas (RN-10 a RN-15)
- **RN-10 (14 Badges Pré-definidos)**: Toda casa é inicializada com **exatamente 14 badges do sistema**, nesta ordem fixa (`displayOrder` 1..14):
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
- **RN-11 (Badges Customizados)**: O criador pode adicionar **até 20 badges customizados** por casa.
- **RN-12 (Teto de 34 Badges)**: Cada casa pode possuir **no máximo 34 badges no total** (14 do sistema + até 20 customizados). Restrição Inegociável nº 3.
- **RN-13 (Edição restrita)**: Apenas o criador da casa pode editar badges (padrão ou customizado).
- **RN-14 (Exclusão restrita)**: Apenas o criador da casa pode excluir badges.
- **RN-15 (Auditoria de Exclusão)**: A exclusão de qualquer badge gera obrigatoriamente um log de auditoria (imutável). Restrição Inegociável nº 5.

---

## 3. Cenários de Aceite BDD (Gherkin)

### Cenário 1: Seed dos 14 Badges na Criação da Casa
- **Dado** que um usuário autenticado cria uma nova casa
- **Quando** a criação é confirmada
- **Então** o sistema persiste a casa
- **E** seeda **exatamente 14 badges** do sistema (`isSystem = true`)
- **E** cada badge possui `displayOrder` de 1 a 14 na ordem fixa da RN-10
- **E** cada badge é único por casa (constraint `UNIQUE(house_id, name)`).

### Cenário 2: Isolamento por Casa
- **Dado** que as casas A e B pertencem ao mesmo mock
- **Quando** ambas foram criadas
- **Então** a casa A possui seus próprios 14 badges
- **E** a casa B possui seus próprios 14 badges
- **E** each conjunto é independente (nenhum badge é compartilhado).

### Cenário 3: Teto de 34 Badges (RN-12)
- **Dado** que uma casa já possui 34 badges (14 + 20 customizados)
- **Quando** o criador tenta adicionar o 35º badge
- **Então** a operação é rejeitada com código `BADGE_LIMIT_REACHED`
- **E** nenhuma linha é persistida.

### Cenário 4: Teto de Customizados (RN-11)
- **Dado** que uma casa já possui 20 badges customizados
- **Quando** o criador tenta adicionar o 21º customizado
- **Então** a operação é rejeitada com código `BADGE_CUSTOM_LIMIT_REACHED`.

---

## 4. Contratos de Interface e Dados

### 4.1. PostgreSQL (Supabase)
**Tabela `public.badges`** (criada na [SPEC-002](file:///c:/projetos/limpex/.agents/specs/SPEC-002-database-schema-supabase.md)):
```sql
CREATE TABLE IF NOT EXISTS public.badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_system BOOLEAN NOT NULL DEFAULT false,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_badge_name_per_house UNIQUE (house_id, name) -- RN-12
);
```
O seed dos 14 badges é feito pelo **trigger `handle_new_house`**:
```sql
CREATE OR REPLACE FUNCTION public.handle_new_house()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.house_members (house_id, user_id, role)
    VALUES (NEW.id, NEW.creator_id, 'CREATOR');

    INSERT INTO public.badges (house_id, name, is_system, display_order)
    VALUES
        (NEW.id, 'Janelas', true, 1),
        (NEW.id, 'Portas', true, 2),
        (NEW.id, 'Quarto 1', true, 3),
        (NEW.id, 'Quarto 2', true, 4),
        (NEW.id, 'Quarto 3', true, 5),
        (NEW.id, 'Banheiro', true, 6),
        (NEW.id, 'Varanda', true, 7),
        (NEW.id, 'Cozinha', true, 8),
        (NEW.id, 'Sala', true, 9),
        (NEW.id, 'Casa completa', true, 10),
        (NEW.id, 'Garagem', true, 11),
        (NEW.id, 'Calçada', true, 12),
        (NEW.id, 'Área gourmet', true, 13),
        (NEW.id, 'Mobília', true, 14);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4.2. TypeScript — Fonte Única de Verdade
Para eliminar a duplicação dos 14 nomes (hoje espelhados em 4 lugares: SQL, mock seed do `createHouse`, seed inicial do mock e lista da UI), o Épico 3 centraliza tudo em um módulo de domínio **`src/services/badgeDefinitions.ts`** que exporta:

```typescript
// RN-10: Ordem fixa é a mesma do trigger handle_new_house
export const SYSTEM_BADGE_NAMES: readonly string[] = [
  'Janelas', 'Portas', 'Quarto 1', 'Quarto 2', 'Quarto 3',
  'Banheiro', 'Varanda', 'Cozinha', 'Sala', 'Casa completa',
  'Garagem', 'Calçada', 'Área gourmet', 'Mobília'
] as const; // exatamente 14

export const SYSTEM_BADGE_COUNT = 14;          // RN-10
export const MAX_CUSTOM_BADGES = 20;            // RN-11
export const MAX_TOTAL_BADGES = 34;             // RN-12
```

---

## 5. Especificação de UX/UI Mobile
TSK-301 é 100% modelo/seed — **não introduz telas novas**. As telas da aba de Badges (TSK-302) e a gestão completa (TSK-303..305) herdam este modelo. Contrato visual futuro: seleção múltipla de badges no registro de faxina (RN-09), ordem estável por `displayOrder`, targets de toque ≥ 44px.

---

## 6. Plano de Testes
- **Seed (TSK-301)**: validar que a criação de uma casa seeda **exatamente 14 badges** do sistema (`isSystem = true`) com `displayOrder` 1..14 na ordem fixa RN-10; unicidade `UNIQUE(house_id, name)`; e **isolamento** entre casas (dois conjuntos independentes de 14).
- **Teto RN-11/RN-12 (TSK-303/305)**: rejeição do 35º badge (`BADGE_LIMIT_REACHED`) e do 21º customizado (`BADGE_CUSTOM_LIMIT_REACHED`), com auditoria de exclusão.
- **Consolidado (TSK-306)**: runner do Épico 3 agregando todos os gates.

---

## 7. Rastreabilidade
- **SPEC-009** → **Épico 3** → TSK-301 (seed), TSK-302..TSK-306.
- **RN-10 a RN-15** (ver [business-rules.md](file:///c:/projetos/limpex/.agents/references/business-rules.md)).
