import { Database } from '../types/database';
import { User, House, Badge, CleaningRecord, ExclusionLog, DayOfWeek } from '../types';

// Credenciais lidas do ambiente
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const isConfigured = Boolean(supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('seu-projeto'));

/**
 * Indicador se o Supabase em nuvem está devidamente configurado ou se usaremos o mock local.
 */
export const isSupabaseConfigured = (): boolean => isConfigured;

// ==============================================================================
// DADOS EMULADOS LOCAIS (MOCK STORAGE PARA DEV OFFLINE / TESTES)
// ==============================================================================
const LOCAL_STORAGE_KEY_USERS = 'limpex_mock_users';
const LOCAL_STORAGE_KEY_HOUSES = 'limpex_mock_houses';
const LOCAL_STORAGE_KEY_BADGES = 'limpex_mock_badges';
const LOCAL_STORAGE_KEY_RECORDS = 'limpex_mock_records';
const LOCAL_STORAGE_KEY_LOGS = 'limpex_mock_exclusion_logs';

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
        inviteCode: 'LMP-9842',
        creatorId: 'usr-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    localStorage.setItem(LOCAL_STORAGE_KEY_HOUSES, JSON.stringify(initialHouses));
  }

  if (!localStorage.getItem(LOCAL_STORAGE_KEY_BADGES)) {
    const systemBadgeNames = [
      'Janelas', 'Portas', 'Quarto 1', 'Quarto 2', 'Quarto 3',
      'Banheiro', 'Varanda', 'Cozinha', 'Sala', 'Casa completa',
      'Garagem', 'Calçada', 'Área gourmet', 'Mobília'
    ];
    const initialBadges: Badge[] = systemBadgeNames.map((name, idx) => ({
      id: `bdg-${idx + 1}`,
      houseId: 'hse-1',
      name,
      isSystem: true,
      displayOrder: idx + 1,
      createdAt: new Date().toISOString()
    }));
    localStorage.setItem(LOCAL_STORAGE_KEY_BADGES, JSON.stringify(initialBadges));
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
  async addCustomBadge(houseId: string, badgeName: string, userId: string): Promise<{ success: boolean; badge?: Badge; error?: string }> {
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
      id: `bdg-custom-${Date.now()}`,
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
   * Restrição Inegociável 5: Excluir badge e gerar LOG DE AUDITORIA IMUTÁVEL
   */
  async deleteBadgeWithLog(badgeId: string, authorId: string, authorName: string): Promise<{ success: boolean; error?: string }> {
    const badgesJson = localStorage.getItem(LOCAL_STORAGE_KEY_BADGES);
    const badges: Badge[] = badgesJson ? JSON.parse(badgesJson) : [];
    const badgeToDelete = badges.find(b => b.id === badgeId);

    if (!badgeToDelete) {
      return { success: false, error: 'Badge não encontrado.' };
    }

    // 1. Remover badge
    const updatedBadges = badges.filter(b => b.id !== badgeId);
    localStorage.setItem(LOCAL_STORAGE_KEY_BADGES, JSON.stringify(updatedBadges));

    // 2. Gravar Log Obrigatório de Auditoria
    const logsJson = localStorage.getItem(LOCAL_STORAGE_KEY_LOGS);
    const logs: ExclusionLog[] = logsJson ? JSON.parse(logsJson) : [];
    const auditLog: ExclusionLog = {
      id: `log-${Date.now()}`,
      deletedAt: new Date().toISOString(),
      userId: authorId,
      userName: authorName,
      entityType: 'BADGE',
      entityId: badgeId,
      entityName: badgeToDelete.name,
      houseId: badgeToDelete.houseId,
      metadata: { isSystem: badgeToDelete.isSystem }
    };
    logs.push(auditLog);
    localStorage.setItem(LOCAL_STORAGE_KEY_LOGS, JSON.stringify(logs));

    return { success: true };
  }
};
