import React from 'react';
import { Loader2 } from 'lucide-react';
import { MobileContainer } from './components/layout/MobileContainer';
import { AuthScreen } from './components/auth/AuthScreen';
import { SetNewPasswordScreen } from './components/auth/SetNewPasswordScreen';
import { ConfigMissingScreen } from './components/auth/ConfigMissingScreen';
import { useSession } from './hooks/useSession';
import { MainShell } from './screens/MainShell';
import styles from './App.module.css';

/**
 * SPEC-022: ponto de entrada. Decide a tela pela sessão do Supabase Auth;
 * o app autenticado vive em MainShell.
 */
export const App: React.FC = () => {
  const { session, completeRecovery } = useSession();

  switch (session.status) {
    case 'unconfigured':
      return (
        <MobileContainer>
          <ConfigMissingScreen />
        </MobileContainer>
      );
    case 'loading':
      return (
        <MobileContainer>
          <div className={styles.loadingState}>
            <Loader2 className={styles.spinner} size={22} />
            <span>Carregando...</span>
          </div>
        </MobileContainer>
      );
    case 'password-recovery':
      return (
        <MobileContainer>
          <SetNewPasswordScreen onDone={completeRecovery} />
        </MobileContainer>
      );
    case 'signed-out':
      // RN-01 a RN-05: login, cadastro e recuperação de senha
      return (
        <MobileContainer>
          <AuthScreen />
        </MobileContainer>
      );
    case 'signed-in':
      // key: trocar de conta recomeça o app do estado inicial
      return <MainShell key={session.user.id} user={session.user} />;
  }
};
