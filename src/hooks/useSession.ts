import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getProfile } from '../data/auth';
import type { User } from '../types';

export type SessionState =
  | { status: 'unconfigured' }
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'password-recovery' }
  | { status: 'signed-in'; user: User };

/**
 * SPEC-022 E2: sessão do Supabase Auth + perfil público do usuário.
 * - Persiste entre recargas (o cliente guarda a sessão).
 * - O link de recuperação de senha abre o modo 'password-recovery', que só
 *   termina com completeRecovery() (nova senha salva) ou com logout.
 */
export const useSession = (): { session: SessionState; completeRecovery: () => void } => {
  const [session, setSession] = useState<SessionState>(supabase ? { status: 'loading' } : { status: 'unconfigured' });
  // PASSWORD_RECOVERY e INITIAL_SESSION podem chegar em qualquer ordem
  const isRecoveringRef = useRef(false);
  const currentSessionRef = useRef<Session | null>(null);

  const loadProfile = useCallback(async (authSession: Session | null) => {
    if (!authSession) {
      setSession({ status: 'signed-out' });
      return;
    }
    try {
      const user = await getProfile(authSession.user.id);
      if (!isRecoveringRef.current) setSession({ status: 'signed-in', user });
    } catch {
      setSession({ status: 'signed-out' });
    }
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event, authSession) => {
      currentSessionRef.current = authSession;
      if (event === 'PASSWORD_RECOVERY') {
        isRecoveringRef.current = true;
        setSession({ status: 'password-recovery' });
        return;
      }
      if (event === 'SIGNED_OUT') isRecoveringRef.current = false;
      if (isRecoveringRef.current || event === 'TOKEN_REFRESHED') return;
      // Chamadas ao Supabase dentro do callback podem travar o cliente: adiar.
      setTimeout(() => loadProfile(authSession), 0);
    });
    return () => data.subscription.unsubscribe();
  }, [loadProfile]);

  const completeRecovery = useCallback(() => {
    isRecoveringRef.current = false;
    setSession({ status: 'loading' });
    loadProfile(currentSessionRef.current);
  }, [loadProfile]);

  return { session, completeRecovery };
};
