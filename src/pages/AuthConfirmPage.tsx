import { CheckCircle2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Seo } from '../components/Seo';
import { useCustomerAuth } from '../context/customerAuth';
import { sanitizeCustomerNextPath } from '../lib/customerAccount';

export default function AuthConfirmPage() {
  const auth = useCustomerAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [failed, setFailed] = useState(false);
  const attemptedClaim = useRef(false);
  const nextPath = sanitizeCustomerNextPath(params.get('next'));

  useEffect(() => {
    if (auth.loading || auth.initializationFailed) return;
    if (!auth.user) {
      setFailed(true);
      return;
    }
    if (attemptedClaim.current) return;
    attemptedClaim.current = true;
    void auth.claimHistory()
      .then(() => navigate(nextPath, { replace: true }))
      .catch(() => setFailed(true));
  }, [auth, navigate, nextPath]);
  if (auth.loading) {
    return <div className="customer-state container" role="status"><Seo title="Confirmando acesso" path="/auth/confirm" noIndex /><span>VERIFICAÇÃO SEGURA</span><h1>Validando seu acesso…</h1><p>Aguarde enquanto confirmamos sua identidade.</p></div>;
  }
  if (auth.initializationFailed) {
    return <div className="customer-state container" role="alert"><Seo title="Confirmando acesso" path="/auth/confirm" noIndex /><span>CONEXÃO INTERROMPIDA</span><h1>Não conseguimos validar sua identidade.</h1><p>Seus dados continuam protegidos. Verifique a conexão e tente novamente.</p><button className="button button--dark" type="button" onClick={auth.retryInitialization}>Tentar novamente</button></div>;
  }
  if (failed || !auth.user) {
    return <div className="customer-state container" role="alert"><Seo title="Confirmando acesso" path="/auth/confirm" noIndex /><span>ACESSO NÃO CONCLUÍDO</span><h1>Não conseguimos vincular seu histórico.</h1><p>Entre novamente para repetir a verificação com segurança.</p><Link className="button button--dark" to="/entrar">Voltar ao acesso</Link></div>;
  }
  return <div className="customer-state container" role="status"><Seo title="Confirmando acesso" path="/auth/confirm" noIndex /><CheckCircle2 size={42} aria-hidden="true" /><span>IDENTIDADE VERIFICADA</span><h1>Preparando seus orçamentos…</h1></div>;
}
