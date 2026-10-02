import React, { useState } from 'react';
import { KeyRound, Lock, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { PASSWORD_MIN_LENGTH, signOut, updatePassword } from '../../data/auth';
import { toAppError } from '../../lib/appError';
import styles from './AuthScreen.module.css';

interface SetNewPasswordScreenProps {
  onDone: () => void;
}

/**
 * SPEC-022 Cenário 10: aberta pelo link de recuperação de senha. O link já
 * autentica o usuário; aqui ele define a nova senha e segue para o app.
 */
export const SetNewPasswordScreen: React.FC<SetNewPasswordScreenProps> = ({ onDone }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(`A senha deve ter no mínimo ${PASSWORD_MIN_LENGTH} caracteres.`);
      return;
    }
    setIsSubmitting(true);
    try {
      await updatePassword(password);
      onDone();
    } catch (err: unknown) {
      setError(toAppError(err).message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.brandHero}>
        <div className={styles.logoBadge}>
          <KeyRound size={30} className={styles.logoIcon} />
        </div>
        <h1 className={styles.brandTitle}>Nova senha</h1>
        <p className={styles.brandSubtitle}>Defina a nova senha da sua conta no Limpex.</p>
      </div>

      <form className={styles.authForm} onSubmit={handleSubmit} noValidate>
        <div className={styles.inputGroup}>
          <label className={styles.inputLabel} htmlFor="new-password">
            Nova senha (mín. {PASSWORD_MIN_LENGTH} caracteres)
          </label>
          <div className={styles.inputWrapper}>
            <Lock size={18} className={styles.fieldIcon} />
            <input
              id="new-password"
              type={showPassword ? 'text' : 'password'}
              className={`${styles.textInput} ${styles.passwordInput}`}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              autoComplete="new-password"
              autoFocus
            />
            <button
              type="button"
              className={styles.toggleVisibilityButton}
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
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

        <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 size={18} className={styles.spinner} />
          ) : (
            <>
              <span>Salvar nova senha</span>
              <ArrowRight size={18} />
            </>
          )}
        </button>

        <button type="button" className={styles.linkButton} onClick={() => signOut()} disabled={isSubmitting}>
          Cancelar e voltar ao login
        </button>
      </form>
    </div>
  );
};
