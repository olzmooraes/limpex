import { dbService, isSupabaseConfigured } from './supabase';
import { User } from '../types';

export interface SystemCapacity {
  totalUsers: number;
  maxUsers: number;
  isRegistrationAllowed: boolean;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
  errorCode?: string;
}

const LOCAL_STORAGE_SESSION_KEY = 'limpex_current_user_session';

/**
 * Serviço de Autenticação e Controle de Acesso do Limpex
 */
export const authService = {
  /**
   * Consulta a capacidade global do sistema (< 100 usuários)
   * Restrição Obrigatória nº 2
   */
  async checkCapacity(): Promise<SystemCapacity> {
    try {
      const capacity = await dbService.getSystemCapacity();
      return {
        totalUsers: capacity.total_users,
        maxUsers: capacity.max_users,
        isRegistrationAllowed: capacity.is_registration_allowed
      };
    } catch (err: any) {
      console.error('[authService] Erro ao consultar capacidade:', err);
      // Fallback seguro em caso de indisponibilidade
      return {
        totalUsers: 0,
        maxUsers: 100,
        isRegistrationAllowed: true
      };
    }
  },

  /**
   * Registro manual de novo usuário com senha
   * Valida previamente se o teto de 100 usuários não foi alcançado e se a senha possui 6+ caracteres
   */
  async register(name: string, email: string, password?: string): Promise<AuthResponse> {
    const capacity = await this.checkCapacity();
    if (!capacity.isRegistrationAllowed) {
      return {
        success: false,
        errorCode: 'USERS_CAP_REACHED',
        error: 'O Limpex atingiu o limite de 100 usuários cadastrados. Novos cadastros estão temporariamente suspensos.'
      };
    }

    if (password !== undefined && password.trim().length < 6) {
      return {
        success: false,
        errorCode: 'WEAK_PASSWORD',
        error: 'A senha deve conter no mínimo 6 caracteres.'
      };
    }

    const result = await dbService.registerUser(name, email);
    if (result.success && result.user) {
      // Salvar credencial de senha local para simulação
      if (password) {
        const credKey = `limpex_pwd_${result.user.id}`;
        localStorage.setItem(credKey, btoa(password));
      }
      this.saveSession(result.user);
    }
    return result;
  },

  /**
   * Login por e-mail e senha (usuários já cadastrados)
   */
  async login(email: string, password?: string): Promise<AuthResponse> {
    const LOCAL_STORAGE_KEY_USERS = 'limpex_mock_users';
    const usersJson = localStorage.getItem(LOCAL_STORAGE_KEY_USERS);
    const users: User[] = usersJson ? JSON.parse(usersJson) : [];

    const existingUser = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!existingUser) {
      return {
        success: false,
        errorCode: 'USER_NOT_FOUND',
        error: 'Nenhum usuário cadastrado encontrado com este endereço de e-mail.'
      };
    }

    // Se a senha foi informada, verificar compatibilidade
    if (password !== undefined && password.trim().length > 0) {
      const credKey = `limpex_pwd_${existingUser.id}`;
      const savedPwdHash = localStorage.getItem(credKey);
      if (savedPwdHash && atob(savedPwdHash) !== password) {
        return {
          success: false,
          errorCode: 'INVALID_PASSWORD',
          error: 'Senha incorreta. Verifique suas credenciais.'
        };
      }
    }

    this.saveSession(existingUser);
    return {
      success: true,
      user: existingUser
    };
  },

  /**
   * Login social via Google OAuth
   * Se o usuário ainda não existir na base e o limite de 100 for atingido, barra o acesso.
   */
  async loginWithGoogle(): Promise<AuthResponse> {
    const capacity = await this.checkCapacity();
    
    // Simulação no ambiente de desenvolvimento/mock
    const mockGoogleEmail = 'usuario_google@exemplo.com';
    const LOCAL_STORAGE_KEY_USERS = 'limpex_mock_users';
    const usersJson = localStorage.getItem(LOCAL_STORAGE_KEY_USERS);
    const users: User[] = usersJson ? JSON.parse(usersJson) : [];

    const existingUser = users.find(u => u.email === mockGoogleEmail);

    if (existingUser) {
      this.saveSession(existingUser);
      return { success: true, user: existingUser };
    }

    // Se é um usuário novo vindo do Google, verificar o teto de 100
    if (!capacity.isRegistrationAllowed) {
      return {
        success: false,
        errorCode: 'USERS_CAP_REACHED',
        error: 'O Limpex atingiu o limite de 100 usuários cadastrados. Novos acessos via Google não puderam ser criados.'
      };
    }

    return this.register('Usuário Google', mockGoogleEmail);
  },

  /**
   * Obtém a sessão do usuário atualmente autenticado
   */
  getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;
    const sessionJson = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
    return sessionJson ? JSON.parse(sessionJson) : null;
  },

  /**
   * Grava a sessão local do usuário
   */
  saveSession(user: User): void {
    localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(user));
  },

  /**
   * Encerra a sessão do usuário (Logout)
   */
  logout(): void {
    localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
  }
};
