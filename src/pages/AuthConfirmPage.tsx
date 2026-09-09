import { CheckCircle2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Seo } from '../components/Seo';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { sanitizeCustomerNextPath } from '../lib/customerAccount';

export default function AuthConfirmPage() {
  const auth = useCustomerAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [failed, setFailed] = useState(false);
  const attemptedClaim = useRef(false);
  const nextPath = sanitizeCustomerNextPath(params.get('next'));

  useEffect(() => {
    if (auth.loading) return;
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
  return <div className="customer-state container" role="status"><Seo title="Confirmando acesso" path="/auth/confirm" noIndex />{failed ? <><span>ACESSO NÃO CONCLUÍDO</span><h1>Não conseguimos vincular seu histórico.</h1><p>Entre novamente para repetir a verificação com segurança.</p><Link className="button button--dark" to="/entrar">Voltar ao acesso</Link></> : <><CheckCircle2 size={42} /><span>IDENTIDADE VERIFICADA</span><h1>Preparando seus orçamentos…</h1></>}</div>;
}
