import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { hasSiteAuthConfiguration } from '../lib/siteSupabaseConfig';
import { reportClientError } from '../lib/clientObservability';
import { CustomerAuthContext, type CustomerAuthValue } from './customerAuth';

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const configured = hasSiteAuthConfiguration();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(configured);
  const [initializationFailed, setInitializationFailed] = useState(false);
  const [initializationAttempt, setInitializationAttempt] = useState(0);
  const [identityEpoch, setIdentityEpoch] = useState(0);
  const sessionUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      setInitializationFailed(false);
      return;
    }
    let active = true;
    let unsubscribe = () => {};
    setLoading(true);
    setInitializationFailed(false);
    void import('../lib/siteSupabase').then(({ siteSupabase }) => {
      if (!active) return;
      if (!siteSupabase) {
        reportClientError(new Error('Site Supabase client unavailable during auth initialization'));
        setInitializationFailed(true);
        setLoading(false);
        return;
      }
      void siteSupabase.auth.getSession().then(({ data, error }) => {
        if (!active) return;
        if (error) {
          reportClientError(error);
          setInitializationFailed(true);
          setLoading(false);
          return;
        }
        sessionUserId.current = data.session?.user.id || null;
        setSession(data.session);
        setInitializationFailed(false);
        setLoading(false);
      }).catch((error: unknown) => {
        reportClientError(error);
        if (!active) return;
        setInitializationFailed(true);
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
        setInitializationFailed(false);
        setLoading(false);
      });
      unsubscribe = () => subscription.subscription.unsubscribe();
    }).catch((error: unknown) => {
      // A área do cliente continua opcional se o carregamento do SDK falhar,
      // mas a falha não pode desaparecer sem telemetria (Etapa 39).
      reportClientError(error);
      if (active) {
        setInitializationFailed(true);
        setLoading(false);
      }
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [configured, initializationAttempt]);

  const value = useMemo<CustomerAuthValue>(() => ({
    configured,
    loading,
    initializationFailed,
    session,
    identityEpoch,
    user: session?.user ?? null,
    retryInitialization: () => setInitializationAttempt((attempt) => attempt + 1),
    claimHistory: async () => (await import('../lib/customerAccount')).claimMyQuoteRequests(),
    signOut: async () => {
      // Não deixa dados de contato preenchidos por uma conta em um navegador
      // compartilhado. onAuthStateChange também vai disparar e repetir esta
      // limpeza (e incrementar identityEpoch de novo) — redundante e inofensivo.
      //
      // A limpeza local roda ANTES do round-trip de rede ao Supabase, não
      // depois — o comentário original já dizia essa intenção, mas o código
      // esperava `await siteSupabase.auth.signOut()` primeiro. Se quem chama
      // navegar (ou o teste fizer `page.goto`) logo após o clique, a
      // navegação encerra o contexto JS e o `import()` + limpeza pendentes
      // depois do await de rede nunca chegavam a rodar — e-mail/telefone do
      // titular anterior ficavam no rascunho da próxima sessão. Reproduzido
      // em e2e/smoke.spec.ts ("sair encerra a sessão..."), intermitente
      // (corrida, não falha determinística — por isso não aparecia sempre).
      const [{ siteSupabase }, { clearPersonalQuoteStorage }] = await Promise.all([
        import('../lib/siteSupabase'),
        import('../lib/personalDataReset'),
      ]);
      clearPersonalQuoteStorage();
      setIdentityEpoch((epoch) => epoch + 1);
      if (siteSupabase) await siteSupabase.auth.signOut();
    },
  }), [configured, loading, initializationFailed, session, identityEpoch]);

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
}
