import React from 'react';
import { CloudOff } from 'lucide-react';
import styles from './AuthScreen.module.css';

/**
 * SPEC-022 Cenário 1: o app foi publicado sem VITE_SUPABASE_URL /
 * VITE_SUPABASE_ANON_KEY. Mostra um aviso em vez de quebrar.
 */
export const ConfigMissingScreen: React.FC = () => (
  <div className={styles.authContainer}>
    <div className={styles.brandHero}>
      <div className={styles.logoBadge}>
        <CloudOff size={30} className={styles.logoIcon} />
      </div>
      <h1 className={styles.brandTitle}>Limpex indisponível</h1>
      <p className={styles.brandSubtitle}>
        O aplicativo ainda não está conectado ao servidor. Tente novamente mais tarde.
      </p>
      {import.meta.env.DEV && (
        <p className={styles.forgotDescription}>
          Desenvolvimento: rode <code>npm run db:start</code> e <code>npm run env:local</code>, depois reinicie o{' '}
          <code>npm run dev</code>.
        </p>
      )}
    </div>
  </div>
);
