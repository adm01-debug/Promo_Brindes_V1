import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { type FormEvent, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { buildContactPayload, submitContactRequest } from '../lib/contactRequest';
import { createClientRequestId } from '../lib/http';
import type { ContactLead } from '../types';

const initialLead: ContactLead = { name: '', email: '', phone: '', privacyAccepted: false };

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function validate(lead: ContactLead) {
  const errors: Partial<Record<keyof ContactLead, string>> = {};
  if (lead.name.trim().length < 2) errors.name = 'Conte para a gente como chamar você.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) errors.email = 'Informe um e-mail válido.';
  if (lead.phone && lead.phone.replace(/\D/g, '').length < 10) errors.phone = 'Inclua o DDD ou deixe o telefone em branco.';
  if (!lead.privacyAccepted) errors.privacyAccepted = 'Autorize o contato para continuar.';
  return errors;
}

export function ConversationForm() {
  const [lead, setLead] = useState(initialLead);
  const [errors, setErrors] = useState<Partial<Record<keyof ContactLead, string>>>({});
  const [website, setWebsite] = useState('');
  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const submittingRef = useRef(false);
  const requestIdentityRef = useRef<{ fingerprint: string; id: string } | null>(null);

  function updateField<Key extends keyof ContactLead>(key: Key, value: ContactLead[Key]) {
    setLead((current) => ({ ...current, [key]: value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (website || submittingRef.current) return;
    const nextErrors = validate(lead);
    setErrors(nextErrors);
    const firstError = Object.keys(nextErrors)[0] as keyof ContactLead | undefined;
    if (firstError) {
      formRef.current?.querySelector<HTMLElement>(`[name="${firstError}"]`)?.focus();
      return;
    }

    submittingRef.current = true;
    setSending(true);
    setSubmitError('');
    setSuccess('');
    try {
      const fingerprint = JSON.stringify(lead);
      if (requestIdentityRef.current?.fingerprint !== fingerprint) {
        requestIdentityRef.current = { fingerprint, id: createClientRequestId() };
      }
      const result = await submitContactRequest(buildContactPayload(lead, undefined, undefined, requestIdentityRef.current.id));
      if (result.mode === 'email') {
        setSuccess('Seu e-mail foi preparado. Revise a mensagem e envie para concluir.');
        window.location.href = result.href;
      } else {
        requestIdentityRef.current = null;
        setSuccess(result.requestId ? `Mensagem recebida. Protocolo ${result.requestId}.` : 'Mensagem recebida. Nosso time de especialistas vai falar com você.');
        setLead(initialLead);
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Não conseguimos enviar agora.');
    } finally {
      submittingRef.current = false;
      setSending(false);
    }
  }

  return (
    <section id="conversa" className="conversation-section" aria-labelledby="conversation-title">
      <div className="container conversation-section__inner">
        <span className="conversation-section__kicker">Seu próximo case pode começar aqui</span>
        <h2 id="conversation-title">Quer impressionar seu público? <em>Vamos conversar.</em></h2>
        <p className="conversation-section__lead">Traga a intenção da campanha. A gente ajuda a transformar contexto, prazo e verba em uma curadoria com personalidade.</p>

        <form ref={formRef} className="conversation-form" onSubmit={(event) => void submit(event)} noValidate>
          <div className="honeypot" aria-hidden="true"><label>Website<input value={website} onChange={(event) => setWebsite(event.target.value)} autoComplete="off" tabIndex={-1} /></label></div>
          <div className="conversation-form__fields">
            <div className="conversation-field">
              <label htmlFor="conversation-name">Seu nome *</label>
              <input id="conversation-name" name="name" autoComplete="name" maxLength={100} value={lead.name} onChange={(event) => updateField('name', event.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'conversation-name-error' : undefined} />
              {errors.name && <span id="conversation-name-error" className="conversation-field__error">{errors.name}</span>}
            </div>
            <div className="conversation-field">
              <label htmlFor="conversation-email">E-mail *</label>
              <input id="conversation-email" name="email" type="email" inputMode="email" autoComplete="email" maxLength={160} value={lead.email} onChange={(event) => updateField('email', event.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'conversation-email-error' : undefined} />
              {errors.email && <span id="conversation-email-error" className="conversation-field__error">{errors.email}</span>}
            </div>
            <div className="conversation-field">
              <label htmlFor="conversation-phone">Telefone / WhatsApp <span>opcional</span></label>
              <input id="conversation-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={16} value={lead.phone} onChange={(event) => updateField('phone', formatPhone(event.target.value))} aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? 'conversation-phone-error' : undefined} />
              {errors.phone && <span id="conversation-phone-error" className="conversation-field__error">{errors.phone}</span>}
            </div>
          </div>

          <label className={`conversation-consent ${errors.privacyAccepted ? 'has-error' : ''}`}>
            <input name="privacyAccepted" type="checkbox" checked={lead.privacyAccepted} onChange={(event) => updateField('privacyAccepted', event.target.checked)} aria-invalid={Boolean(errors.privacyAccepted)} aria-describedby={errors.privacyAccepted ? 'conversation-privacy-error' : undefined} />
            <span>Li o <Link to="/privacidade" target="_blank" rel="noreferrer">aviso de privacidade</Link> e autorizo o contato da Promo Brindes. *</span>
          </label>
          {errors.privacyAccepted && <span id="conversation-privacy-error" className="conversation-field__error conversation-consent__error">{errors.privacyAccepted}</span>}
          {submitError && <div className="conversation-form__message is-error" role="alert">{submitError}</div>}
          {success && <div className="conversation-form__message" role="status"><CheckCircle2 size={18} /> {success}</div>}
          <button className="conversation-form__submit" type="submit" disabled={sending}>
            {sending ? 'Enviando…' : <>Falar com a Promo <ArrowRight size={17} /></>}
          </button>
        </form>
        <p className="conversation-section__footnote">Coisas incríveis acontecem quando as pessoas certas se encontram.</p>
      </div>
    </section>
  );
}
