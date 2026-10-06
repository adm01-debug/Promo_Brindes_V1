import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { hasSiteAuthConfiguration } from '../lib/siteSupabaseConfig';
import { reportClientError } from '../lib/clientObservability';
import { CustomerAuthContext, type CustomerAuthValue } from './customerAuth';

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const configured = hasSiteAuthConfiguration();
  const [user, setUser] = useState<User | null>(null);
  const [initializationState, setInitializationState] = useState(configured ? 0 : 1);
  const loading = initializationState === 0;
  const initializationFailed = initializationState === 2;
  const [initializationAttempt, setInitializationAttempt] = useState(0);
  const [identityEpoch, setIdentityEpoch] = useState(0);
  const sessionUserId = useRef<string | null>(null);
  const hasResolvedInitialSession = useRef(false);

  useEffect(() => {
    if (!configured) {
      setInitializationState(1);
      return;
    }
    let active = true;
    let unsubscribe = () => {};
    let authEventSettled = false;
    const failInitialization = (error: unknown) => {
      reportClientError(error);
      if (!active || authEventSettled) return;
      setInitializationState(2);
    };
    const acceptSession = (nextSession: Session | null) => {
      const nextUserId = nextSession?.user.id || null;
      // A primeira sessão aceita pode ser uma sessão persistida da própria
      // pessoa e não deve apagar seu rascunho. Depois dela, toda mudança de
      // fronteira de identidade — inclusive anônimo -> autenticado — limpa
      // dados pessoais antes que outro titular possa vê-los.
      if (hasResolvedInitialSession.current && sessionUserId.current !== nextUserId) {
        void import('../lib/personalDataReset').then(({ clearPersonalQuoteStorage }) => clearPersonalQuoteStorage());
        setIdentityEpoch((epoch) => epoch + 1);
      }
      sessionUserId.current = nextUserId;
      hasResolvedInitialSession.current = true;
      setUser(nextSession?.user ?? null);
      setInitializationState(1);
    };
    setInitializationState(0);
    void import('../lib/siteSupabase').then(({ siteSupabase }) => {
      if (!active) return;
      if (!siteSupabase) throw new Error('Site Supabase client unavailable during auth initialization');
      const { data: subscription } = siteSupabase.auth.onAuthStateChange((event, nextSession) => {
        if (!active || (event === 'INITIAL_SESSION' && !nextSession)) return;
        authEventSettled = true;
        acceptSession(nextSession);
      });
      unsubscribe = () => subscription.subscription.unsubscribe();
      void siteSupabase.auth.getSession().then(({ data, error }) => {
        if (!active || authEventSettled) return;
        if (error) throw error;
        acceptSession(data.session);
      }).catch(failInitialization);
    }).catch((error: unknown) => {
      // A área do cliente continua opcional se o carregamento do SDK falhar,
      // mas a falha não pode desaparecer sem telemetria (Etapa 39).
      failInitialization(error);
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
    identityEpoch,
    user,
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
  }), [configured, loading, initializationFailed, user, identityEpoch]);

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
}
