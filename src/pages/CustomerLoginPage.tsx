import { ArrowRight, CheckCircle2, Eye, EyeOff, KeyRound, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Seo } from '../components/Seo';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { sanitizeCustomerNextPath } from '../lib/customerAccount';
import { siteSupabase } from '../lib/siteSupabase';
import { trackFunnelEvent } from '../lib/analytics';

type AccessMode = 'email' | 'password' | 'create' | 'recover';

const CANONICAL_PUBLIC_ORIGIN = 'https://promo-brindes-v1.vercel.app';

export function customerAuthRedirect(next: string): string {
  // Auth não herda window.location.origin: previews e hosts inesperados não
  // podem virar destino de magic-link ou recuperação de senha.
  const url = new URL('/auth/confirm', CANONICAL_PUBLIC_ORIGIN);
  url.searchParams.set('next', next);
  return url.href;
}

function authMessage(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes('invalid login')) return 'E-mail ou senha não conferem.';
  if (normalized.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
  if (normalized.includes('rate limit')) return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
  if (normalized.includes('already registered')) return 'Este e-mail já possui acesso. Entre com sua senha ou use a recuperação.';
  return 'Não conseguimos concluir o acesso agora. Tente novamente.';
}

export default function CustomerLoginPage() {
  const auth = useCustomerAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = sanitizeCustomerNextPath(params.get('next'));
  const [mode, setMode] = useState<AccessMode>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  if (auth.user) return <Navigate to={next} replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!siteSupabase || sending) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Informe um e-mail válido para continuar.');
      return;
    }
    setSending(true);
    setError('');
    setMessage('');
    try {
      trackFunnelEvent('customer_access_requested', { method: mode });
      if (mode === 'email' && codeSent && code.trim()) {
        const result = await siteSupabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: 'email' });
        if (result.error) throw result.error;
        await auth.claimHistory();
        void navigate(next, { replace: true });
        return;
      }
      if (mode === 'email') {
        const result = await siteSupabase.auth.signInWithOtp({
          email: email.trim().toLowerCase(),
          options: { emailRedirectTo: customerAuthRedirect(next), shouldCreateUser: true },
        });
        if (result.error) throw result.error;
        setCodeSent(true);
        setMessage('Enviamos um link e, quando disponível, um código para o seu e-mail.');
        return;
      }
      if (mode === 'password') {
        const result = await siteSupabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
        if (result.error) throw result.error;
        await auth.claimHistory();
        void navigate(next, { replace: true });
        return;
      }
      if (mode === 'create') {
        const result = await siteSupabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: { emailRedirectTo: customerAuthRedirect(next) },
        });
        if (result.error) throw result.error;
        setMessage(result.data.session ? 'Acesso criado. Abrindo seus orçamentos…' : 'Conta criada. Confirme o link enviado ao seu e-mail.');
        if (result.data.session) {
          await auth.claimHistory();
          void navigate(next, { replace: true });
        }
        return;
      }
      const result = await siteSupabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: customerAuthRedirect('/definir-senha'),
      });
      if (result.error) throw result.error;
      setMessage('Se houver uma conta com este e-mail, enviaremos as instruções de recuperação.');
    } catch (caught) {
      setError(authMessage(caught instanceof Error ? caught.message : ''));
    } finally {
      setSending(false);
    }
  }

  if (!auth.configured) return <div className="customer-state container"><Seo title="Acessar meus orçamentos" path="/entrar" noIndex /><span>ÁREA DO CLIENTE</span><h1>Acesso em configuração.</h1><p>Seus briefings continuam chegando normalmente enquanto finalizamos esta conexão.</p><Link className="button button--dark" to="/catalogo">Explorar produtos</Link></div>;

  return (
    <div className="customer-auth-page">
      <Seo title="Acessar meus orçamentos" description="Entre na Área do Cliente para consultar e repetir solicitações de orçamento." path="/entrar" noIndex />
      <section className="customer-auth-intro">
        <span className="section-kicker">Sua memória de campanhas</span>
        <h1>Seus briefings.<br /><em>Sempre por perto.</em></h1>
        <p>Acompanhe solicitações, recupere produtos escolhidos e comece a próxima ação com o contexto que você já construiu.</p>
        <ul><li><CheckCircle2 /> Primeiro orçamento sem cadastro obrigatório</li><li><ShieldCheck /> Histórico liberado após verificar o e-mail</li><li><KeyRound /> Acesso por senha, link ou código</li></ul>
      </section>
      <section className="customer-auth-card" aria-labelledby="customer-access-title">
        <div className="customer-auth-card__mark"><LockKeyhole aria-hidden="true" /><span>ACESSO SEGURO</span></div>
        <h2 id="customer-access-title">{mode === 'create' ? 'Criar meu acesso' : mode === 'recover' ? 'Recuperar minha senha' : 'Acessar meus orçamentos'}</h2>
        <p>{mode === 'email' ? 'Use o mesmo e-mail informado nas solicitações.' : mode === 'create' ? 'Você precisará confirmar o e-mail antes de ver o histórico.' : mode === 'recover' ? 'Enviaremos um link seguro para definir uma nova senha.' : 'Entre com o e-mail e a senha cadastrados.'}</p>
        {(mode === 'email' || mode === 'password') && <div className="customer-auth-tabs" aria-label="Forma de acesso"><button type="button" aria-pressed={mode === 'email'} onClick={() => { setMode('email'); setError(''); }}>Link ou código</button><button type="button" aria-pressed={mode === 'password'} onClick={() => { setMode('password'); setError(''); }}>Senha</button></div>}
        <form onSubmit={(event) => void submit(event)} noValidate>
          <div className="form-field"><label htmlFor="customer-email">E-mail</label><input id="customer-email" name="email" type="email" inputMode="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></div>
          {(mode === 'password' || mode === 'create') && <div className="form-field"><label htmlFor="customer-password">Senha</label><div className="password-field"><input id="customer-password" name="password" type={passwordVisible ? 'text' : 'password'} autoComplete={mode === 'create' ? 'new-password' : 'current-password'} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /><button type="button" onClick={() => setPasswordVisible((visible) => !visible)} aria-label={passwordVisible ? 'Ocultar senha' : 'Mostrar senha'}>{passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div><small>Mínimo de 8 caracteres.</small></div>}
          {mode === 'email' && codeSent && <div className="form-field"><label htmlFor="customer-code">Código recebido <span>opcional se usar o link</span></label><input id="customer-code" name="one-time-code" inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} /></div>}
          {error && <div className="submit-error" role="alert">{error}</div>}
          {message && <div className="customer-auth-message" role="status"><Mail aria-hidden="true" /> {message}</div>}
          <button className="button button--green button--large button--wide" type="submit" disabled={sending || !email.trim() || ((mode === 'password' || mode === 'create') && password.length < 8)}>{sending ? 'Aguarde…' : mode === 'email' && codeSent && code ? 'Validar código' : mode === 'email' ? 'Enviar acesso por e-mail' : mode === 'password' ? 'Entrar com senha' : mode === 'create' ? 'Criar acesso' : 'Enviar recuperação'} <ArrowRight size={18} /></button>
        </form>
        <div className="customer-auth-links">
          {mode !== 'create' && <button type="button" onClick={() => { setMode('create'); setCodeSent(false); setError(''); setMessage(''); }}>Prefiro criar uma senha</button>}
          {mode !== 'recover' && <button type="button" onClick={() => { setMode('recover'); setCodeSent(false); setError(''); setMessage(''); }}>Esqueci minha senha</button>}
          {(mode === 'create' || mode === 'recover') && <button type="button" onClick={() => { setMode('email'); setError(''); setMessage(''); }}>Voltar ao acesso por e-mail</button>}
        </div>
      </section>
    </div>
  );
}
