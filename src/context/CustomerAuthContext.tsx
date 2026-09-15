import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { hasSiteAuthConfiguration } from '../lib/siteSupabaseConfig';
import { reportClientError } from '../lib/clientObservability';
import { CustomerAuthContext, type CustomerAuthValue } from './customerAuth';

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const configured = hasSiteAuthConfiguration();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(configured);
  const [identityEpoch, setIdentityEpoch] = useState(0);
  const sessionUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    let active = true;
    let unsubscribe = () => {};
    void import('../lib/siteSupabase').then(({ siteSupabase }) => {
      if (!active || !siteSupabase) return;
      void siteSupabase.auth.getSession().then(({ data }) => {
        if (!active) return;
        sessionUserId.current = data.session?.user.id || null;
        setSession(data.session);
        setLoading(false);
      });
      const { data: subscription } = siteSupabase.auth.onAuthStateChange((_event, nextSession) => {
        if (!active) return;
        const nextUserId = nextSession?.user.id || null;
        if (sessionUserId.current && sessionUserId.current !== nextUserId) {
          void import('../lib/personalDataReset').then(({ clearPersonalQuoteStorage }) => clearPersonalQuoteStorage());
          setIdentityEpoch((epoch) => epoch + 1);
        }
        sessionUserId.current = nextUserId;
        setSession(nextSession);
        setLoading(false);
      });
      unsubscribe = () => subscription.subscription.unsubscribe();
    }).catch((error: unknown) => {
      // A área do cliente continua opcional se o carregamento do SDK falhar,
      // mas a falha não pode desaparecer sem telemetria (Etapa 39).
      reportClientError(error);
      if (active) setLoading(false);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [configured]);

  const value = useMemo<CustomerAuthValue>(() => ({
    configured,
    loading,
    session,
    identityEpoch,
    user: session?.user ?? null,
    claimHistory: async () => (await import('../lib/customerAccount')).claimMyQuoteRequests(),
    signOut: async () => {
      const { siteSupabase } = await import('../lib/siteSupabase');
      if (siteSupabase) await siteSupabase.auth.signOut();
      // Não deixa dados de contato preenchidos por uma conta em um navegador
      // compartilhado. onAuthStateChange também vai disparar e repetir esta
      // limpeza (e incrementar identityEpoch de novo) — redundante e inofensivo;
      // esta chamada direta cobre a própria aba sem esperar o round-trip.
      const { clearPersonalQuoteStorage } = await import('../lib/personalDataReset');
      clearPersonalQuoteStorage();
      setIdentityEpoch((epoch) => epoch + 1);
    },
  }), [configured, loading, session, identityEpoch]);

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
}
