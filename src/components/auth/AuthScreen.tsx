import React, { useState } from 'react';
import { useSystemCapacity } from '../../hooks/useSystemCapacity';
import { PASSWORD_MIN_LENGTH, requestPasswordReset, signIn, signUp } from '../../data/auth';
import { toAppError } from '../../lib/appError';
import { DevQuickLogin } from './DevQuickLogin';
import {
  Sparkles,
  AlertTriangle,
  Mail,
  User as UserIcon,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  Users,
  CheckCircle2
} from 'lucide-react';
import styles from './AuthScreen.module.css';

type AuthMode = 'login' | 'register' | 'forgot';

/**
 * SPEC-005 + SPEC-022 E2: tela de autenticação real (Supabase Auth).
 * A sessão aberta aqui é detectada pelo App via useSession.
 */
export const AuthScreen: React.FC = () => {
  const { totalUsers, maxUsers, isRegistrationAllowed, isLoading: isCapacityLoading, refetch } = useSystemCapacity();

  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // RN-03: com o teto atingido, o cadastro some (só login e recuperação)
  const isRegistrationBlocked = !isCapacityLoading && !isRegistrationAllowed;
  const currentMode: AuthMode = isRegistrationBlocked && mode === 'register' ? 'login' : mode;

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError(null);
    setInfo(null);
  };

  const validate = (): string | null => {
    if (!email.trim()) return 'Por favor, informe seu endereço de e-mail.';
    if (currentMode === 'forgot') return null;
    if (currentMode === 'register' && !name.trim()) return 'Por favor, informe seu nome.';
    if (!password) return 'Por favor, informe sua senha.';
    if (currentMode === 'register' && password.length < PASSWORD_MIN_LENGTH) {
      return `A senha deve ter no mínimo ${PASSWORD_MIN_LENGTH} caracteres.`;
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      if (currentMode === 'register') {
        await signUp(name, email, password);
      } else if (currentMode === 'login') {
        await signIn(email, password);
      } else {
        await requestPasswordReset(email, window.location.origin);
        setInfo('Se houver uma conta com este e-mail, enviamos um link para criar uma nova senha.');
      }
    } catch (err: unknown) {
      const appError = toAppError(err);
      setError(appError.message);
      if (appError.code === 'USERS_CAP_REACHED' || appError.code === 'SIGNUP_FAILED') await refetch();
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitLabel =
    currentMode === 'register' ? 'Criar Cadastro' : currentMode === 'login' ? 'Entrar no Limpex' : 'Enviar link';

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
              {totalUsers} / {maxUsers} usuários cadastrados
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

      {/* 3. Seletor de Abas (Entrar / Cadastrar) */}
      {currentMode === 'forgot' ? (
        <div className={styles.forgotHeader}>
          <h2 className={styles.forgotTitle}>Recuperar senha</h2>
          <p className={styles.forgotDescription}>
            Informe o e-mail da sua conta. Enviaremos um link para você criar uma nova senha.
          </p>
        </div>
      ) : (
        !isRegistrationBlocked && (
          <div className={styles.segmentedControl} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={currentMode === 'login'}
              className={`${styles.tabButton} ${currentMode === 'login' ? styles.tabActive : ''}`}
              onClick={() => switchMode('login')}
            >
              Entrar
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={currentMode === 'register'}
              className={`${styles.tabButton} ${currentMode === 'register' ? styles.tabActive : ''}`}
              onClick={() => switchMode('register')}
            >
              Criar Conta
            </button>
          </div>
        )
      )}

      {/* 4. Formulário */}
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
                maxLength={80}
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

        {currentMode !== 'forgot' && (
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel} htmlFor="password">
              {currentMode === 'register' ? `Criar Senha (mín. ${PASSWORD_MIN_LENGTH} caracteres)` : 'Sua Senha'}
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
            {currentMode === 'login' && (
              <button type="button" className={styles.linkButton} onClick={() => switchMode('forgot')}>
                Esqueci minha senha
              </button>
            )}
          </div>
        )}

        {error && (
          <div className={styles.errorMessage} role="alert">
            <span>{error}</span>
          </div>
        )}

        {info && (
          <div className={styles.infoMessage} role="status">
            <CheckCircle2 size={16} />
            <span>{info}</span>
          </div>
        )}

        <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 size={18} className={styles.spinner} />
          ) : (
            <>
              <span>{submitLabel}</span>
              <ArrowRight size={18} />
            </>
          )}
        </button>

        {currentMode === 'forgot' && (
          <button type="button" className={styles.linkButton} onClick={() => switchMode('login')}>
            Voltar para o login
          </button>
        )}
      </form>

      {/* Login com Google: oculto até a TSK-705 */}

      {/* 5. Contas de teste do seed local — só em desenvolvimento */}
      {import.meta.env.DEV && (
        <DevQuickLogin
          disabled={isSubmitting}
          onError={(message) => {
            setInfo(null);
            setError(message);
          }}
        />
      )}
    </div>
  );
};
