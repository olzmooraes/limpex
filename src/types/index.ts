// Identificadores das 5 posições da barra de navegação inferior
export type TabId = 'home' | 'badges' | 'new-cleaning' | 'houses' | 'history';

// Dias da semana padronizados pelo Limpex
export type DayOfWeek = 'dom' | 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface House {
  id: string;
  name: string;
  inviteCode: string;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
}

export type MemberRole = 'CREATOR' | 'MEMBER';

export interface HouseMember {
  id: string;
  houseId: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: MemberRole;
  joinedAt: string;
}

export interface Badge {
  id: string;
  houseId: string;
  name: string;
  isSystem: boolean; // true para os 14 padrões, false para os até 20 customizados
  displayOrder?: number;
  createdAt: string;
}

export interface CleaningRecord {
  id: string;
  houseId: string;
  userId: string;
  userName: string;
  registeredById: string;
  dayOfWeek: DayOfWeek;
  cleaningDate: string; // ISO AAAA-MM-DD
  weekNumber: number; // 1 a 4
  month: number; // 1 a 12
  year: number;
  badgeIds: string[];
  notes?: string;
  createdAt: string;
}

export type AuditEntityType = 'HOUSE' | 'BADGE';

export interface ExclusionLog {
  id: string;
  deletedAt: string;
  userId: string;
  userName: string;
  entityType: AuditEntityType;
  entityId: string;
  entityName: string;
  houseId?: string;
  metadata?: Record<string, unknown>;
}
