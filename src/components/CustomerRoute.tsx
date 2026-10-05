import type { ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useCustomerAuth } from '../context/customerAuth';
import { Seo } from './Seo';

export function CustomerRoute({ children }: { children: ReactNode }) {
  const auth = useCustomerAuth();
  const location = useLocation();
  if (!auth.configured) {
    return <div className="customer-state container"><Seo title="Área do Cliente" path={location.pathname} noIndex /><span>ÁREA DO CLIENTE</span><h1>Acesso em configuração.</h1><p>Estamos terminando a conexão segura do histórico de orçamentos. Suas solicitações continuam registradas normalmente.</p></div>;
  }
  if (auth.loading) return <div className="customer-state container" role="status"><Seo title="Área do Cliente" path={location.pathname} noIndex /><span>ÁREA DO CLIENTE</span><h1>Validando seu acesso…</h1></div>;
  if (auth.initializationFailed) {
    return <div className="customer-state container" role="alert"><Seo title="Área do Cliente" path={location.pathname} noIndex /><span>CONEXÃO INTERROMPIDA</span><h1>Não conseguimos validar seu acesso.</h1><p>Seus dados continuam protegidos. Verifique a conexão e tente novamente; nenhuma solicitação será alterada.</p><div className="customer-state__actions"><button className="button button--dark" type="button" onClick={auth.retryInitialization}>Tentar novamente</button><Link className="button button--outline" to="/catalogo">Ir para o catálogo</Link></div></div>;
  }
  if (!auth.user) return <Navigate to={`/entrar?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return children;
}
