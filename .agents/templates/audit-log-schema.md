# Esquema e Contrato de Dados: Logs de Exclusão (Audit Logs)

Este documento define o contrato estrito para os logs de auditoria gerados sempre que uma **casa** ou um **badge** for excluído no Limpex.

---

## 1. Modelo Relacional SQL (PostgreSQL / Supabase)

```sql
CREATE TABLE IF NOT EXISTS public.exclusion_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deleted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    user_name TEXT NOT NULL,
    user_email TEXT,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('HOUSE', 'BADGE')),
    entity_id UUID NOT NULL,
    entity_name TEXT NOT NULL,
    house_id UUID, -- Casa onde o evento ocorreu (relevante para badges ou casas)
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Proibir mutação ou exclusão dos registros de log
CREATE OR REPLACE RULE prevent_delete_exclusion_logs AS
    ON DELETE TO public.exclusion_logs DO INSTEAD NOTHING;

CREATE OR REPLACE RULE prevent_update_exclusion_logs AS
    ON UPDATE TO public.exclusion_logs DO INSTEAD NOTHING;
```

---

## 2. Interface TypeScript

```typescript
export type AuditEntityType = 'HOUSE' | 'BADGE';

export interface ExclusionLog {
  id: string;
  deletedAt: string; // ISO-8601 UTC
  userId: string;
  userName: string;
  userEmail?: string;
  entityType: AuditEntityType;
  entityId: string;
  entityName: string;
  houseId?: string;
  metadata?: {
    badgesDeletedCount?: number;
    membersCount?: number;
    cleaningRecordsCount?: number;
    customData?: Record<string, unknown>;
  };
}
```

---

## 3. Exemplo de Registro de Log de Exclusão de Badge

```json
{
  "id": "7b2e9d24-348f-43b9-a9a5-48b4e7233df8",
  "deletedAt": "2026-09-12T03:15:00.000Z",
  "userId": "d98129a0-c3d5-4523-bf7b-23fbe9871144",
  "userName": "Carlos Silva",
  "userEmail": "carlos@exemplo.com",
  "entityType": "BADGE",
  "entityId": "14f08e55-6ea1-460d-a342-99042b5a1928",
  "entityName": "Garagem Subterrânea",
  "houseId": "8f30c9a1-0987-4aa1-9e12-32b09a1288cc",
  "metadata": {
    "isCustom": true,
    "activeRecordsAssociated": 3
  }
}
```

---

## 4. Exemplo de Registro de Log de Exclusão de Casa

```json
{
  "id": "e21c810d-77bb-41a4-9271-8b0933d59e33",
  "deletedAt": "2026-09-12T03:30:00.000Z",
  "userId": "d98129a0-c3d5-4523-bf7b-23fbe9871144",
  "userName": "Carlos Silva",
  "userEmail": "carlos@exemplo.com",
  "entityType": "HOUSE",
  "entityId": "8f30c9a1-0987-4aa1-9e12-32b09a1288cc",
  "entityName": "Casa de Praia - Guaratuba",
  "houseId": "8f30c9a1-0987-4aa1-9e12-32b09a1288cc",
  "metadata": {
    "membersCount": 4,
    "totalBadgesArchived": 22,
    "totalCleaningRecordsArchived": 115
  }
}
```
