import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useCustomerAuth } from '../context/customerAuth';
import { Seo } from './Seo';

export function CustomerRoute({ children }: { children: ReactNode }) {
  const auth = useCustomerAuth();
  const location = useLocation();
  if (!auth.configured) {
    return <div className="customer-state container"><Seo title="Área do Cliente" path={location.pathname} noIndex /><span>ÁREA DO CLIENTE</span><h1>Acesso em configuração.</h1><p>Estamos terminando a conexão segura do histórico de orçamentos. Suas solicitações continuam registradas normalmente.</p></div>;
  }
  if (auth.loading) return <div className="customer-state container" role="status"><Seo title="Área do Cliente" path={location.pathname} noIndex /><span>ÁREA DO CLIENTE</span><h1>Validando seu acesso…</h1></div>;
  if (!auth.user) return <Navigate to={`/entrar?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return children;
}
