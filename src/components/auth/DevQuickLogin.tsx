import React from 'react';
import { signIn } from '../../data/auth';
import { toAppError } from '../../lib/appError';
import styles from './AuthScreen.module.css';

/**
 * SPEC-022 Cenário 11: atalhos para as contas de supabase/seed.sql.
 * Renderizado só quando import.meta.env.DEV — o build de produção remove este
 * módulo, e em produção essas contas não existem.
 */
const DEV_SEED_PASSWORD = 'limpex123';

const DEV_ACCOUNTS = [
  { name: 'Luiz Otávio', email: 'luiz@exemplo.com' },
  { name: 'Carlos Oliveira', email: 'carlos@exemplo.com' },
  { name: 'Mariana Silva', email: 'mariana@exemplo.com' }
];

interface DevQuickLoginProps {
  disabled: boolean;
  onError: (message: string) => void;
}

export const DevQuickLogin: React.FC<DevQuickLoginProps> = ({ disabled, onError }) => (
  <div className={styles.quickAccessSection}>
    <span className={styles.quickAccessTitle}>Contas de teste (só em desenvolvimento):</span>
    <div className={styles.quickChips}>
      {DEV_ACCOUNTS.map((account) => (
        <button
          key={account.email}
          type="button"
          className={styles.quickChip}
          disabled={disabled}
          onClick={() => signIn(account.email, DEV_SEED_PASSWORD).catch((err) => onError(toAppError(err).message))}
        >
          {account.name}
        </button>
      ))}
    </div>
  </div>
);
