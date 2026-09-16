import { User, House, HouseMember, Badge, CleaningRecord, ExclusionLog } from '../types';
import { createSystemBadges } from './badgeDefinitions';
import { validateBadgeEditName } from './badgeEdit';
import { validateBadgeDelete } from './badgeDelete';
import { validateCleaningPersistence } from './cleaningPersistence';

// Credenciais lidas do ambiente
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';
const isConfigured = Boolean(supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('seu-projeto'));

/**
 * Indicador se o Supabase em nuvem está devidamente configurado ou se usaremos o mock local.
 */
export const isSupabaseConfigured = (): boolean => isConfigured;

// ==============================================================================
// CÓDIGO DE CONVITE (TSK-202 / SPEC-008)
// Alfabeto amigável: sem caracteres ambíguos (0, O, 1, I) — exatamente 6 posições.
// ==============================================================================
export const INVITE_CODE_LENGTH = 6;
export const INVITE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const isValidInviteCode = (code: string): boolean => {
  if (code.length !== INVITE_CODE_LENGTH) return false;
  return [...code].every((ch) => INVITE_CODE_ALPHABET.includes(ch));
};

// ==============================================================================
// DADOS EMULADOS LOCAIS (MOCK STORAGE PARA DEV OFFLINE / TESTES)
// ==============================================================================
const LOCAL_STORAGE_KEY_USERS = 'limpex_mock_users';
const LOCAL_STORAGE_KEY_HOUSES = 'limpex_mock_houses';
const LOCAL_STORAGE_KEY_HOUSE_MEMBERS = 'limpex_mock_house_members';
const LOCAL_STORAGE_KEY_BADGES = 'limpex_mock_badges';
const LOCAL_STORAGE_KEY_LOGS = 'limpex_mock_exclusion_logs';
const LOCAL_STORAGE_KEY_CLEANING_RECORDS = 'limpex_mock_cleaning_records';

// Inicializar dados mock se não existirem
const initializeMockData = () => {
  if (typeof window === 'undefined') return;

  if (!localStorage.getItem(LOCAL_STORAGE_KEY_USERS)) {
    const initialUsers: User[] = [
      { id: 'usr-1', name: 'Luiz Otávio', email: 'luiz@exemplo.com', createdAt: new Date().toISOString() },
      { id: 'usr-2', name: 'Carlos Oliveira', email: 'carlos@exemplo.com', createdAt: new Date().toISOString() },
      { id: 'usr-3', name: 'Mariana Silva', email: 'mariana@exemplo.com', createdAt: new Date().toISOString() }
    ];
    localStorage.setItem(LOCAL_STORAGE_KEY_USERS, JSON.stringify(initialUsers));
  }

  if (!localStorage.getItem(LOCAL_STORAGE_KEY_HOUSES)) {
    const initialHouses: House[] = [
      {
        id: 'hse-1',
        name: 'Ap 402 - Família',
        inviteCode: 'QR6K9X',
        creatorId: 'usr-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    localStorage.setItem(LOCAL_STORAGE_KEY_HOUSES, JSON.stringify(initialHouses));
  }

  if (!localStorage.getItem(LOCAL_STORAGE_KEY_BADGES)) {
    const initialBadges: Badge[] = createSystemBadges('hse-1', new Date().toISOString());
    localStorage.setItem(LOCAL_STORAGE_KEY_BADGES, JSON.stringify(initialBadges));
  }

  if (!localStorage.getItem(LOCAL_STORAGE_KEY_HOUSE_MEMBERS)) {
    const initialMembers: HouseMember[] = [
      { id: 'hm-1', houseId: 'hse-1', userId: 'usr-1', userName: 'Luiz Otávio', userEmail: 'luiz@exemplo.com', role: 'CREATOR', joinedAt: new Date().toISOString() }
    ];
    localStorage.setItem(LOCAL_STORAGE_KEY_HOUSE_MEMBERS, JSON.stringify(initialMembers));
  }
};

initializeMockData();

// ==============================================================================
// SERVIÇOS DO BANCO DE DADOS (ABSTRAÇÃO COM CONTROLE DE REGRAS)
// ==============================================================================
export const dbService = {
  /**
   * Restrição Inegociável 2: Verifica capacidade global (< 100 usuários)
   * Espelha a função RPC public.get_system_capacity() do PostgreSQL
   */
  async getSystemCapacity(): Promise<{ total_users: number; max_users: number; is_registration_allowed: boolean }> {
    const usersJson = localStorage.getItem(LOCAL_STORAGE_KEY_USERS);
    const users: User[] = usersJson ? JSON.parse(usersJson) : [];
    const total_users = users.length;
    const max_users = 100;
    return {
      total_users,
      max_users,
      is_registration_allowed: total_users < max_users
    };
  },

  /**
   * Restrição Inegociável 2: Cadastro de novo usuário
   * Dispara erro USERS_CAP_REACHED caso o total atinja ou supere 100
   */
  async registerUser(name: string, email: string, avatarUrl?: string): Promise<{ success: boolean; user?: User; error?: string; errorCode?: string }> {
    const usersJson = localStorage.getItem(LOCAL_STORAGE_KEY_USERS);
    const users: User[] = usersJson ? JSON.parse(usersJson) : [];

    // Verificação da barreira estrita de 100 usuários
    if (users.length >= 100) {
      return {
        success: false,
        errorCode: 'USERS_CAP_REACHED',
        error: 'USERS_CAP_REACHED: O limite máximo de 100 usuários cadastrados no Limpex foi atingido. Novos cadastros estão temporariamente suspensos.'
      };
    }

    // Verificar unicidade de e-mail
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return {
        success: false,
        errorCode: 'EMAIL_ALREADY_EXISTS',
        error: 'Este endereço de e-mail já está cadastrado no sistema.'
      };
    }

    const newUser: User = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      avatarUrl,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    localStorage.setItem(LOCAL_STORAGE_KEY_USERS, JSON.stringify(users));

    return {
      success: true,
      user: newUser
    };
  },

  /**
   * Compatibilidade com versão anterior
   */
  async getCapacityStatus(): Promise<{ totalUsers: number; isRegistrationAllowed: boolean }> {
    const cap = await this.getSystemCapacity();
    return {
      totalUsers: cap.total_users,
      isRegistrationAllowed: cap.is_registration_allowed
    };
  },

  // ============================================================================
  // SERVIÇOS DE CASAS E MEMBROS (TSK-201 / Épico 2)
  // Espelham as tabelas public.houses e public.house_members e a restrição
  // inegociável de 1 casa por criador (RN-18 / Restrição 3).
  // ============================================================================

  /**
   * Restrição 3 / RN-18: Obtém a casa criada por um usuário, se existir.
   */
  getCreatedHouseByUser(creatorId: string): House | null {
    const housesJson = localStorage.getItem(LOCAL_STORAGE_KEY_HOUSES);
    const houses: House[] = housesJson ? JSON.parse(housesJson) : [];
    return houses.find(h => h.creatorId === creatorId) ?? null;
  },

  /**
   * Restrição 3 / RN-19: Lista todas as casas em que o usuário participa
   * (como criador ou como membro), espelhando house_members + houses.
   */
  async getUserHouses(userId: string): Promise<House[]> {
    const membersJson = localStorage.getItem(LOCAL_STORAGE_KEY_HOUSE_MEMBERS);
    const members: HouseMember[] = membersJson ? JSON.parse(membersJson) : [];
    const housesJson = localStorage.getItem(LOCAL_STORAGE_KEY_HOUSES);
    const houses: House[] = housesJson ? JSON.parse(housesJson) : [];
    const houseIds = new Set(members.filter(m => m.userId === userId).map(m => m.houseId));
    return houses.filter(h => houseIds.has(h.id));
  },

  /**
   * Restrição 4 / RLS: Lista os membros de uma casa com nome e e-mail (join users).
   */
  async getHouseMembers(houseId: string): Promise<HouseMember[]> {
    const membersJson = localStorage.getItem(LOCAL_STORAGE_KEY_HOUSE_MEMBERS);
    const members: HouseMember[] = membersJson ? JSON.parse(membersJson) : [];
    return members.filter(m => m.houseId === houseId);
  },

  /**
   * Restrição 3 / RN-18: Cria uma casa vinculando o criador como 'CREATOR'.
   * Rejeita com HOUSE_LIMIT_REACHED se o usuário já for dono de uma casa
   * (espelho da constraint UNIQUE(creator_id) do banco de dados).
   * Também espelha o trigger handle_new_house: seed dos 14 badges + membro.
   */
  async createHouse(
    name: string,
    creatorId: string,
    creatorName?: string,
    creatorEmail?: string
  ): Promise<{ success: boolean; house?: House; error?: string; errorCode?: string }> {
    // Defesa em profundidade: espelha a constraint unique_house_creator
    if (this.getCreatedHouseByUser(creatorId)) {
      return {
        success: false,
        errorCode: 'HOUSE_LIMIT_REACHED',
        error: 'HOUSE_LIMIT_REACHED: Você já é criador de uma casa. Cada usuário pode criar no máximo 1 casa no Limpex.'
      };
    }

    // Código de convite único de 6 caracteres (TSK-202 / SPEC-008, Cenário 6)
    let inviteCode = this.generateInviteCode();
    while (this.findHouseByInviteCode(inviteCode)) {
      inviteCode = this.generateInviteCode();
    }

    const now = new Date().toISOString();
    const newHouse: House = {
      id: `hse-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim(),
      inviteCode,
      creatorId,
      createdAt: now,
      updatedAt: now
    };

    // 1. Persistir a casa
    const housesJson = localStorage.getItem(LOCAL_STORAGE_KEY_HOUSES);
    const houses: House[] = housesJson ? JSON.parse(housesJson) : [];
    houses.push(newHouse);
    localStorage.setItem(LOCAL_STORAGE_KEY_HOUSES, JSON.stringify(houses));

    // 2. Espelhar trigger handle_new_house: vincular criador como 'CREATOR'
    const membersJson = localStorage.getItem(LOCAL_STORAGE_KEY_HOUSE_MEMBERS);
    const members: HouseMember[] = membersJson ? JSON.parse(membersJson) : [];
    members.push({
      id: `hm-${Date.now()}`,
      houseId: newHouse.id,
      userId: creatorId,
      userName: creatorName || 'Criador',
      userEmail: creatorEmail || '',
      role: 'CREATOR',
      joinedAt: now
    });
    localStorage.setItem(LOCAL_STORAGE_KEY_HOUSE_MEMBERS, JSON.stringify(members));

    // 3. Espelhar trigger handle_new_house: seed dos 14 badges do sistema
    // (fonte única: badgeDefinitions.ts / RN-10)
    const badgesJson = localStorage.getItem(LOCAL_STORAGE_KEY_BADGES);
    const badges: Badge[] = badgesJson ? JSON.parse(badgesJson) : [];
    badges.push(...createSystemBadges(newHouse.id, now));
    localStorage.setItem(LOCAL_STORAGE_KEY_BADGES, JSON.stringify(badges));

    return { success: true, house: newHouse };
  },

  /**
   * RN-17 / RN-19: Entrada em casa existente via código de convite como 'MEMBER'.
   */
  async joinHouseByInviteCode(
    inviteCode: string,
    userId: string,
    userName?: string,
    userEmail?: string
  ): Promise<{ success: boolean; house?: House; error?: string; errorCode?: string }> {
    const house = this.findHouseByInviteCode(inviteCode.trim().toUpperCase());
    if (!house) {
      return { success: false, errorCode: 'INVALID_INVITE_CODE', error: 'Código de convite inválido ou casa inexistente.' };
    }

    const membersJson = localStorage.getItem(LOCAL_STORAGE_KEY_HOUSE_MEMBERS);
    const members: HouseMember[] = membersJson ? JSON.parse(membersJson) : [];

    if (members.some(m => m.houseId === house.id && m.userId === userId)) {
      return { success: false, errorCode: 'ALREADY_MEMBER', error: 'Você já é membro desta casa.' };
    }

    members.push({
      id: `hm-${Date.now()}`,
      houseId: house.id,
      userId,
      userName: userName || 'Membro',
      userEmail: userEmail || '',
      role: 'MEMBER',
      joinedAt: new Date().toISOString()
    });
    localStorage.setItem(LOCAL_STORAGE_KEY_HOUSE_MEMBERS, JSON.stringify(members));

    return { success: true, house };
  },

  /**
   * TSK-202 / SPEC-008: Gera um código de convite único e amigável com
   * exatamente 6 caracteres do alfabeto sem ambíguos (A-Z + 2-9, sem 0/O/1/I).
   */
  generateInviteCode(): string {
    let code = '';
    for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
      code += INVITE_CODE_ALPHABET.charAt(Math.floor(Math.random() * INVITE_CODE_ALPHABET.length));
    }
    return code;
  },

  findHouseByInviteCode(inviteCode: string): House | null {
    const housesJson = localStorage.getItem(LOCAL_STORAGE_KEY_HOUSES);
    const houses: House[] = housesJson ? JSON.parse(housesJson) : [];
    return houses.find(h => h.inviteCode.toUpperCase() === inviteCode.toUpperCase()) ?? null;
  },

  /**
   * Restrição Inegociável 3: Buscar badges de uma casa (respeitando teto de 34)
   */
  async getHouseBadges(houseId: string): Promise<Badge[]> {
    const badgesJson = localStorage.getItem(LOCAL_STORAGE_KEY_BADGES);
    const badges: Badge[] = badgesJson ? JSON.parse(badgesJson) : [];
    return badges.filter(b => b.houseId === houseId);
  },

  /**
   * Adicionar badge customizado (Restrição 3 e 4: máx 20 customizados e 34 totais; apenas dono)
   */
  async addCustomBadge(houseId: string, badgeName: string): Promise<{ success: boolean; badge?: Badge; error?: string }> {
    const badgesJson = localStorage.getItem(LOCAL_STORAGE_KEY_BADGES);
    const badges: Badge[] = badgesJson ? JSON.parse(badgesJson) : [];
    const houseBadges = badges.filter(b => b.houseId === houseId);

    if (houseBadges.length >= 34) {
      return { success: false, error: 'Teto de 34 badges por casa atingido.' };
    }

    const customCount = houseBadges.filter(b => !b.isSystem).length;
    if (customCount >= 20) {
      return { success: false, error: 'Limite de 20 badges customizados atingido.' };
    }

    const newBadge: Badge = {
      id: `bdg-custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      houseId,
      name: badgeName.trim(),
      isSystem: false,
      displayOrder: houseBadges.length + 1,
      createdAt: new Date().toISOString()
    };

    badges.push(newBadge);
    localStorage.setItem(LOCAL_STORAGE_KEY_BADGES, JSON.stringify(badges));
    return { success: true, badge: newBadge };
  },

  /**
   * TSK-304 / SPEC-012 / RN-13 / RN-21: Renomear badge (sistema ou customizado).
   * Restrição 4 (RN-21): apenas o criador da casa pode renomear.
   */
  async renameBadge(
    houseId: string,
    badgeId: string,
    newName: string,
    requesterId: string
  ): Promise<{ success: boolean; badge?: Badge; error?: string; errorCode?: string }> {
    const badgesJson = localStorage.getItem(LOCAL_STORAGE_KEY_BADGES);
    const badges: Badge[] = badgesJson ? JSON.parse(badgesJson) : [];
    const houseBadges = badges.filter(b => b.houseId === houseId);
    const badgeToEdit = houseBadges.find(b => b.id === badgeId);

    if (!badgeToEdit) {
      return { success: false, errorCode: 'BADGE_NOT_FOUND', error: 'Badge não encontrado na casa.' };
    }

    const housesJson = localStorage.getItem(LOCAL_STORAGE_KEY_HOUSES);
    const houses: House[] = housesJson ? JSON.parse(housesJson) : [];
    const house = houses.find(h => h.id === houseId);
    if (!house || house.creatorId !== requesterId) {
      return {
        success: false,
        errorCode: 'BADGE_EDIT_FORBIDDEN',
        error: 'BADGE_EDIT_FORBIDDEN: Apenas o proprietário (criador) pode renomear badges.'
      };
    }

    const validation = validateBadgeEditName(newName, badgeId, houseBadges);
    if (!validation.valid) {
      return {
        success: false,
        errorCode: validation.errorCode,
        error: validation.errorMessage
      };
    }

    const trimmed = newName.trim();
    const updatedBadges = badges.map(b =>
      b.id === badgeId ? { ...b, name: trimmed } : b
    );
    localStorage.setItem(LOCAL_STORAGE_KEY_BADGES, JSON.stringify(updatedBadges));

    return { success: true, badge: { ...badgeToEdit, name: trimmed } };
  },

  /**
   * TSK-305 / SPEC-013 / RN-14 / RN-15 / RN-21: Excluir badge (sistema ou customizado).
   * Restrição Inegociável 4 (RN-21): apenas o criador da casa pode excluir.
   * Restrição Inegociável 5 (RN-15): grava log obrigatório e imutável em exclusion_logs,
   * espelhando a política RLS "Apenas criador da casa pode deletar badges".
   * RN-19: o badge é buscado (e removido) exclusivamente dentro da casa informada.
   */
  async deleteBadgeWithLog(
    houseId: string,
    badgeId: string,
    requesterId: string,
    requesterName: string
  ): Promise<{ success: boolean; badge?: Badge; error?: string; errorCode?: string }> {
    const badgesJson = localStorage.getItem(LOCAL_STORAGE_KEY_BADGES);
    const badges: Badge[] = badgesJson ? JSON.parse(badgesJson) : [];
    const houseBadges = badges.filter(b => b.houseId === houseId);
    const badgeToDelete = houseBadges.find(b => b.id === badgeId);

    if (!badgeToDelete) {
      return { success: false, errorCode: 'BADGE_NOT_FOUND', error: 'Badge não encontrado na casa.' };
    }

    const housesJson = localStorage.getItem(LOCAL_STORAGE_KEY_HOUSES);
    const houses: House[] = housesJson ? JSON.parse(housesJson) : [];
    const house = houses.find(h => h.id === houseId);

    const validation = validateBadgeDelete(houseId, badgeId, houseBadges, house?.creatorId, requesterId);
    if (!validation.valid) {
      return {
        success: false,
        errorCode: validation.errorCode,
        error: validation.errorMessage
      };
    }

    // Contabiliza vínculos afetados (registros de faxina que referenciam o badge) — RN-15
    const recordsJson = localStorage.getItem(LOCAL_STORAGE_KEY_CLEANING_RECORDS);
    const records: CleaningRecord[] = recordsJson ? JSON.parse(recordsJson) : [];
    const affectedRegisters = records.filter(r => r.badgeIds.includes(badgeId)).length;

    // 1. Remover badge (espelha ON DELETE CASCADE de cleaning_badges)
    localStorage.setItem(
      LOCAL_STORAGE_KEY_BADGES,
      JSON.stringify(badges.filter(b => b.id !== badgeId))
    );

    // 2. Remover referências do badge nos registros de faxina do mock (CASCADE)
    if (affectedRegisters > 0) {
      const updatedRecords = records.map(r =>
        r.badgeIds.includes(badgeId)
          ? { ...r, badgeIds: r.badgeIds.filter(id => id !== badgeId) }
          : r
      );
      localStorage.setItem(LOCAL_STORAGE_KEY_CLEANING_RECORDS, JSON.stringify(updatedRecords));
    }

    // 3. Gravar Log Obrigatório de Auditoria (Restrição Inegociável 5 / RN-15)
    const logsJson = localStorage.getItem(LOCAL_STORAGE_KEY_LOGS);
    const logs: ExclusionLog[] = logsJson ? JSON.parse(logsJson) : [];
    const auditLog: ExclusionLog = {
      id: `log-${Date.now()}`,
      deletedAt: new Date().toISOString(),
      userId: requesterId,
      userName: requesterName,
      entityType: 'BADGE',
      entityId: badgeId,
      entityName: badgeToDelete.name,
      houseId,
      metadata: { isSystem: badgeToDelete.isSystem, affectedRegisters }
    };
    logs.push(auditLog);
    localStorage.setItem(LOCAL_STORAGE_KEY_LOGS, JSON.stringify(logs));

    return { success: true, badge: badgeToDelete };
  },

  /**
   * Restrição Inegociável 4 / RN-21: Exclusão de casa restrita exclusivamente
   * ao proprietário (criador). Espelha a política RLS de DELETE em public.houses
   * com `auth.uid() = creator_id`.
   * - Casa inexistente → erro HOUSE_NOT_FOUND.
   * - Solicitante que não é o criador → erro NOT_HOUSE_OWNER (nenhuma linha é removida).
   * - Em caso de sucesso: remove a casa em cascata (house_members, badges) e grava
   *   log obrigatório de auditoria em exclusion_logs (Restrição Obrigatória nº 5).
   */
  async deleteHouseWithLog(
    houseId: string,
    requesterId: string,
    requesterName: string
  ): Promise<{ success: boolean; house?: House; error?: string; errorCode?: string }> {
    const housesJson = localStorage.getItem(LOCAL_STORAGE_KEY_HOUSES);
    const houses: House[] = housesJson ? JSON.parse(housesJson) : [];
    const houseToDelete = houses.find(h => h.id === houseId);

    if (!houseToDelete) {
      return { success: false, errorCode: 'HOUSE_NOT_FOUND', error: 'Casa não encontrada.' };
    }

    // Apenas o proprietário (creator_id) pode excluir a casa (Restrição 4)
    if (houseToDelete.creatorId !== requesterId) {
      return {
        success: false,
        errorCode: 'NOT_HOUSE_OWNER',
        error: 'NOT_HOUSE_OWNER: Apenas o proprietário (criador) pode excluir a casa.'
      };
    }

    // Contabiliza vínculos e badges afetados antes da remoção (auditoria)
    const membersJson = localStorage.getItem(LOCAL_STORAGE_KEY_HOUSE_MEMBERS);
    const members: HouseMember[] = membersJson ? JSON.parse(membersJson) : [];
    const badgesJson = localStorage.getItem(LOCAL_STORAGE_KEY_BADGES);
    const badges: Badge[] = badgesJson ? JSON.parse(badgesJson) : [];
    const recordsJson = localStorage.getItem(LOCAL_STORAGE_KEY_CLEANING_RECORDS);
    const records: CleaningRecord[] = recordsJson ? JSON.parse(recordsJson) : [];
    const affectedMemberCount = members.filter(m => m.houseId === houseId).length;
    const affectedBadgeCount = badges.filter(b => b.houseId === houseId).length;
    const affectedCleaningCount = records.filter(r => r.houseId === houseId).length;

    // 1. Remover a casa e seus vínculos/badges/registros (ON DELETE CASCADE espelhado)
    localStorage.setItem(
      LOCAL_STORAGE_KEY_HOUSES,
      JSON.stringify(houses.filter(h => h.id !== houseId))
    );
    localStorage.setItem(
      LOCAL_STORAGE_KEY_HOUSE_MEMBERS,
      JSON.stringify(members.filter(m => m.houseId !== houseId))
    );
    localStorage.setItem(
      LOCAL_STORAGE_KEY_BADGES,
      JSON.stringify(badges.filter(b => b.houseId !== houseId))
    );
    if (affectedCleaningCount > 0) {
      localStorage.setItem(
        LOCAL_STORAGE_KEY_CLEANING_RECORDS,
        JSON.stringify(records.filter(r => r.houseId !== houseId))
      );
    }

    // 2. Gravar Log Obrigatório de Auditoria (Restrição 5)
    const logsJson = localStorage.getItem(LOCAL_STORAGE_KEY_LOGS);
    const logs: ExclusionLog[] = logsJson ? JSON.parse(logsJson) : [];
    const auditLog: ExclusionLog = {
      id: `log-${Date.now()}`,
      deletedAt: new Date().toISOString(),
      userId: requesterId,
      userName: requesterName,
      entityType: 'HOUSE',
      entityId: houseId,
      entityName: houseToDelete.name,
      houseId,
      metadata: {
        inviteCode: houseToDelete.inviteCode,
        affectedMemberCount,
        affectedBadgeCount,
        affectedCleaningCount
      }
    };
    logs.push(auditLog);
    localStorage.setItem(LOCAL_STORAGE_KEY_LOGS, JSON.stringify(logs));

    return { success: true, house: houseToDelete };
  },

  // ============================================================================
  // SERVIÇOS DE PERSISTÊNCIA DE FAXINA (TSK-403 / SPEC-016)
  // Espelham as tabelas public.cleaning_records e public.cleaning_badges e as
  // políticas RLS da migração 20260915000000_cleaning_persistence_rls.sql
  // (RN-19 isolamento por casa / RN-20 qualquer membro pode registrar).
  // ============================================================================

  /**
   * TSK-403 / SPEC-016 / RN-20: Persiste um registro de faxina no mock local
   * (cabeçalho em cleaning_records + associações em cleaning_badges). Rejeita
   * com CLEANING_HOUSE_NOT_FOUND / CLEANING_MEMBERSHIP_REQUIRED /
   * CLEANING_RESPONSIBLE_NOT_IN_HOUSE / CLEANING_BADGE_NOT_IN_HOUSE sem
   * persistência parcial, espelhando a RLS e os triggers da migração.
   */
  async createCleaningRecord(
    record: CleaningRecord
  ): Promise<{ success: boolean; record?: CleaningRecord; error?: string; errorCode?: string }> {
    const housesJson = localStorage.getItem(LOCAL_STORAGE_KEY_HOUSES);
    const houses: House[] = housesJson ? JSON.parse(housesJson) : [];
    const house = houses.find(h => h.id === record.houseId) ?? null;

    const membersJson = localStorage.getItem(LOCAL_STORAGE_KEY_HOUSE_MEMBERS);
    const members: HouseMember[] = membersJson ? JSON.parse(membersJson) : [];
    const badgesJson = localStorage.getItem(LOCAL_STORAGE_KEY_BADGES);
    const badges: Badge[] = badgesJson ? JSON.parse(badgesJson) : [];

    const validation = validateCleaningPersistence(record, house, members, badges);
    if (!validation.valid) {
      return {
        success: false,
        errorCode: validation.errorCode,
        error: validation.errorMessage
      };
    }

    const recordsJson = localStorage.getItem(LOCAL_STORAGE_KEY_CLEANING_RECORDS);
    const records: CleaningRecord[] = recordsJson ? JSON.parse(recordsJson) : [];

    // Rejeita id duplicado (idempotência de escrita defensiva)
    if (records.some(r => r.id === record.id)) {
      return {
        success: false,
        errorCode: 'CLEANING_RECORD_DUPLICATE',
        error: 'Este registro de faxina já foi persistido anteriormente.'
      };
    }

    records.push({ ...record, badgeIds: [...record.badgeIds] });
    localStorage.setItem(LOCAL_STORAGE_KEY_CLEANING_RECORDS, JSON.stringify(records));

    return { success: true, record: { ...record, badgeIds: [...record.badgeIds] } };
  },

  /**
   * TSK-403 / SPEC-016 / RN-19: Consulta registros de faxina de uma casa
   * (isolamento total por houseId), opcionalmente filtrando por semana
   * (year/month/weekNumber) ou responsável (userId) — base das TSK-404/TSK-501.
   */
  async getCleaningRecords(
    houseId: string,
    filters?: { year?: number; month?: number; weekNumber?: number; userId?: string }
  ): Promise<CleaningRecord[]> {
    const recordsJson = localStorage.getItem(LOCAL_STORAGE_KEY_CLEANING_RECORDS);
    const records: CleaningRecord[] = recordsJson ? JSON.parse(recordsJson) : [];
    return records
      .filter(r => r.houseId === houseId)
      .filter(r => filters?.year === undefined || r.year === filters.year)
      .filter(r => filters?.month === undefined || r.month === filters.month)
      .filter(r => filters?.weekNumber === undefined || r.weekNumber === filters.weekNumber)
      .filter(r => filters?.userId === undefined || r.userId === filters.userId)
      .sort((a, b) => (a.cleaningDate < b.cleaningDate ? -1 : a.cleaningDate > b.cleaningDate ? 1 : 0));
  }
};
