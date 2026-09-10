import type { Session, User } from '@supabase/supabase-js';
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { hasSiteAuthConfiguration } from '../lib/siteSupabaseConfig';

interface CustomerAuthValue {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  claimHistory(): Promise<number>;
  signOut(): Promise<void>;
}

const CustomerAuthContext = createContext<CustomerAuthValue | null>(null);

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const configured = hasSiteAuthConfiguration();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(configured);

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
        setSession(data.session);
        setLoading(false);
      });
      const { data: subscription } = siteSupabase.auth.onAuthStateChange((_event, nextSession) => {
        if (!active) return;
        setSession(nextSession);
        setLoading(false);
      });
      unsubscribe = () => subscription.subscription.unsubscribe();
    }).catch(() => { if (active) setLoading(false); });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [configured]);

  const value = useMemo<CustomerAuthValue>(() => ({
    configured,
    loading,
    session,
    user: session?.user ?? null,
    claimHistory: async () => (await import('../lib/customerAccount')).claimMyQuoteRequests(),
    signOut: async () => {
      const { siteSupabase } = await import('../lib/siteSupabase');
      if (siteSupabase) await siteSupabase.auth.signOut();
      // Não deixa dados de contato preenchidos por uma conta em um navegador compartilhado.
      const { clearQuoteDraft } = await import('../lib/quoteDraft');
      clearQuoteDraft();
    },
  }), [configured, loading, session]);

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
}

export function useCustomerAuth(): CustomerAuthValue {
  const value = useContext(CustomerAuthContext);
  if (!value) throw new Error('useCustomerAuth must be used inside CustomerAuthProvider');
  return value;
}
