import { Eye, EyeOff } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Seo } from '../components/Seo';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { siteSupabase } from '../lib/siteSupabase';

export default function SetPasswordPage() {
  const auth = useCustomerAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!siteSupabase || password.length < 8 || password !== confirmation) { setError('Use pelo menos 8 caracteres e repita a mesma senha.'); return; }
    const result = await siteSupabase.auth.updateUser({ password });
    if (result.error) setError('Não conseguimos atualizar a senha. Solicite um novo link.');
    else setDone(true);
  }
  if (!auth.loading && !auth.user) return <Navigate to="/entrar" replace />;
  if (done) return <Navigate to="/minha-conta" replace />;
  return <div className="customer-state customer-password container"><Seo title="Definir nova senha" path="/definir-senha" noIndex /><span>ÁREA DO CLIENTE</span><h1>Defina sua nova senha.</h1><p>Use pelo menos 8 caracteres e guarde esta senha em um lugar seguro.</p><form onSubmit={(event) => void submit(event)}><div className="form-field"><label htmlFor="new-password">Nova senha</label><div className="password-field"><input id="new-password" type={passwordVisible ? 'text' : 'password'} autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} /><button type="button" onClick={() => setPasswordVisible((visible) => !visible)} aria-label={passwordVisible ? 'Ocultar senha' : 'Mostrar senha'}>{passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div><div className="form-field"><label htmlFor="confirm-password">Repita a senha</label><div className="password-field"><input id="confirm-password" type={passwordVisible ? 'text' : 'password'} autoComplete="new-password" minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /><button type="button" onClick={() => setPasswordVisible((visible) => !visible)} aria-label={passwordVisible ? 'Ocultar senha' : 'Mostrar senha'}>{passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>{error && <div className="submit-error" role="alert">{error}</div>}<button className="button button--green" type="submit">Salvar nova senha</button></form></div>;
}
