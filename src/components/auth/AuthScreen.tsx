import React, { useState } from 'react';
import { useSystemCapacity } from '../../hooks/useSystemCapacity';
import { authService } from '../../services/authService';
import { User } from '../../types';
import { 
  Sparkles, 
  AlertTriangle, 
  Mail, 
  User as UserIcon, 
  Lock,
  Eye,
  EyeOff,
  ArrowRight, 
  CheckCircle2, 
  Loader2,
  Users
} from 'lucide-react';
import styles from './AuthScreen.module.css';

interface AuthScreenProps {
  onAuthSuccess: (user: User) => void;
}

type AuthMode = 'login' | 'register';

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const { totalUsers, isRegistrationAllowed, isLoading: isCapacityLoading, refetch } = useSystemCapacity();
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Se a capacidade estiver cheia, forçar modo de login
  const isRegistrationBlocked = !isCapacityLoading && !isRegistrationAllowed;
  const currentMode = isRegistrationBlocked ? 'login' : mode;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Por favor, informe seu endereço de e-mail.');
      return;
    }

    if (currentMode === 'register' && !name.trim()) {
      setError('Por favor, informe seu nome completo.');
      return;
    }

    if (currentMode === 'register' && password.trim().length < 6) {
      setError('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (currentMode === 'register') {
        const res = await authService.register(name, email, password);
        if (!res.success || !res.user) {
          setError(res.error || 'Não foi possível concluir o cadastro.');
          await refetch();
          return;
        }
        onAuthSuccess(res.user);
      } else {
        const res = await authService.login(email, password);
        if (!res.success || !res.user) {
          setError(res.error || 'Credenciais inválidas. Verifique seu e-mail e senha.');
          return;
        }
        onAuthSuccess(res.user);
      }
    } catch (err: any) {
      setError(err?.message || 'Ocorreu um erro inesperado ao autenticar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await authService.loginWithGoogle();
      if (!res.success || !res.user) {
        setError(res.error || 'Falha na autenticação via Google.');
        await refetch();
        return;
      }
      onAuthSuccess(res.user);
    } catch (err: any) {
      setError(err?.message || 'Erro ao conectar com conta Google.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper para agilizar testes locais
  const handleQuickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    authService.login(demoEmail).then((res) => {
      if (res.success && res.user) onAuthSuccess(res.user);
    });
  };

  return (
    <div className={styles.authContainer}>
      {/* 1. Header com Logo e Apresentação */}
      <div className={styles.brandHero}>
        <div className={styles.logoBadge}>
          <Sparkles size={30} className={styles.logoIcon} />
        </div>
        <h1 className={styles.brandTitle}>Limpex</h1>
        <p className={styles.brandSubtitle}>
          Gerenciamento compartilhado de faxinas residenciais
        </p>

        {/* Indicador de Capacidade em Pílula */}
        <div className={styles.capacityBadge}>
          <Users size={14} className={styles.capacityIcon} />
          {isCapacityLoading ? (
            <span>Verificando disponibilidade...</span>
          ) : (
            <span>
              {totalUsers} / 100 usuários cadastrados
            </span>
          )}
        </div>
      </div>

      {/* 2. Banner de Aviso de Limite Atingido (RN-03) */}
      {isRegistrationBlocked && (
        <aside className={styles.warningBanner} role="alert">
          <div className={styles.warningIconWrapper}>
            <AlertTriangle size={20} />
          </div>
          <div className={styles.warningText}>
            <h2 className={styles.warningTitle}>Limite de Cadastros Atingido</h2>
            <p className={styles.warningDescription}>
              O Limpex atingiu o teto global de 100 usuários. Novos cadastros estão temporariamente suspensos. Apenas usuários já cadastrados podem fazer login.
            </p>
          </div>
        </aside>
      )}

      {/* 3. Seletor de Abas (Entrar / Cadastrar) - Apenas se < 100 usuários */}
      {!isRegistrationBlocked && (
        <div className={styles.segmentedControl} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            className={`${styles.tabButton} ${mode === 'login' ? styles.tabActive : ''}`}
            onClick={() => { setMode('login'); setError(null); }}
          >
            Entrar
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'register'}
            className={`${styles.tabButton} ${mode === 'register' ? styles.tabActive : ''}`}
            onClick={() => { setMode('register'); setError(null); }}
          >
            Criar Conta
          </button>
        </div>
      )}

      {/* 4. Formulário de Acesso Manual */}
      <form className={styles.authForm} onSubmit={handleSubmit} noValidate>
        {currentMode === 'register' && (
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel} htmlFor="name">Seu Nome</label>
            <div className={styles.inputWrapper}>
              <UserIcon size={18} className={styles.fieldIcon} />
              <input
                id="name"
                type="text"
                className={styles.textInput}
                placeholder="Ex: Carlos Oliveira"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
                autoComplete="name"
              />
            </div>
          </div>
        )}

        <div className={styles.inputGroup}>
          <label className={styles.inputLabel} htmlFor="email">Endereço de E-mail</label>
          <div className={styles.inputWrapper}>
            <Mail size={18} className={styles.fieldIcon} />
            <input
              id="email"
              type="email"
              className={styles.textInput}
              placeholder="seu.email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              autoComplete="email"
            />
          </div>
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.inputLabel} htmlFor="password">
            {currentMode === 'register' ? 'Criar Senha (mín. 6 caracteres)' : 'Sua Senha'}
          </label>
          <div className={styles.inputWrapper}>
            <Lock size={18} className={styles.fieldIcon} />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              className={`${styles.textInput} ${styles.passwordInput}`}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              autoComplete={currentMode === 'register' ? 'new-password' : 'current-password'}
            />
            <button
              type="button"
              className={styles.toggleVisibilityButton}
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
              title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {error && (
          <div className={styles.errorMessage} role="alert">
            <span>{error}</span>
          </div>
        )}

        <button 
          type="submit" 
          className={styles.primaryButton}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 size={18} className={styles.spinner} />
          ) : (
            <>
              <span>{currentMode === 'register' ? 'Criar Cadastro' : 'Entrar no Limpex'}</span>
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>

      {/* 5. Separador e Login Social Google */}
      <div className={styles.divider}>
        <span>ou acesse com</span>
      </div>

      <button
        type="button"
        className={styles.googleButton}
        onClick={handleGoogleLogin}
        disabled={isSubmitting}
      >
        <svg className={styles.googleSvg} viewBox="0 0 24 24" width="20" height="20">
          <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.4 8.9 5 12 5z" />
          <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z" />
          <path fill="#FBBC05" d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.7s.1-2 .4-2.7L1.6 6.4C.6 8.3 0 10.1 0 12s.6 3.7 1.6 5.6l3.7-2.9z" />
          <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.4-6.7-5.3L1.6 16C3.5 19.8 7.4 23 12 23z" />
        </svg>
        <span>
          {isRegistrationBlocked ? 'Entrar com Google (contas cadastradas)' : 'Continuar com o Google'}
        </span>
      </button>

      {/* 6. Atalhos Rápidos para Demonstração */}
      <div className={styles.quickAccessSection}>
        <span className={styles.quickAccessTitle}>Contas Rápidas de Teste:</span>
        <div className={styles.quickChips}>
          <button 
            type="button" 
            className={styles.quickChip} 
            onClick={() => handleQuickLogin('luiz@exemplo.com')}
          >
            Luiz Otávio
          </button>
          <button 
            type="button" 
            className={styles.quickChip} 
            onClick={() => handleQuickLogin('carlos@exemplo.com')}
          >
            Carlos Oliveira
          </button>
          <button 
            type="button" 
            className={styles.quickChip} 
            onClick={() => handleQuickLogin('mariana@exemplo.com')}
          >
            Mariana Silva
          </button>
        </div>
      </div>
    </div>
  );
};
