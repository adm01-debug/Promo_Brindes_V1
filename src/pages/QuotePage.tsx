import { ArrowLeft, ArrowRight, CheckCircle2, Mail, Minus, Plus, Printer, Send, ShieldCheck, ShoppingBag, Trash2 } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Seo } from '../components/Seo';
import { ContextualFaq } from '../components/ContextualFaq';
import { useQuoteCart } from '../context/QuoteCartContext';
import { buildQuotePayload, submitQuoteRequest } from '../lib/quoteRequest';
import { trackFunnelEvent } from '../lib/analytics';
import { ClientRequestError, clearSubmissionAttempt, getOrCreateSubmissionAttempt } from '../lib/http';
import { replaceBrokenProductImage } from '../lib/images';
import { clearQuoteDraft, EMPTY_QUOTE_CONTACT, loadQuoteDraft, QUOTE_DRAFT_RETENTION_LABEL, saveQuoteDraft } from '../lib/quoteDraft';
import { campaignBriefLabels } from '../lib/campaignBrief';
import { EMPTY_QUOTE_BRIEFING, normalizeQuoteBriefing, quoteBriefingLabels, validateQuoteBriefing } from '../lib/quoteBriefing';
import { clearQuoteRepeat, loadQuoteRepeat } from '../lib/quoteRepeat';
import type { QuoteBriefingForm, QuoteContact } from '../types';
import { quoteDecisionGroupsEnabled } from '../lib/siteFeatureFlags';

const initialContact = EMPTY_QUOTE_CONTACT;

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function localDateInputValue(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function validate(contact: QuoteContact) {
  const errors: Partial<Record<keyof QuoteContact, string>> = {};
  if (contact.name.trim().length < 2) errors.name = 'Informe seu nome.';
  if (contact.company.trim().length < 2) errors.company = 'Informe o nome da empresa.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) errors.email = 'Informe um e-mail válido.';
  if (contact.phone.replace(/\D/g, '').length < 10) errors.phone = 'Informe um telefone com DDD.';
  if (contact.deadline && contact.deadline < localDateInputValue()) errors.deadline = 'Escolha uma data a partir de hoje.';
  if (!contact.privacyAccepted) errors.privacyAccepted = 'Confirme que leu o aviso de privacidade.';
  return errors;
}

export default function QuotePage() {
  const cart = useQuoteCart();
  const [params] = useSearchParams();
  const [savedDraft] = useState(loadQuoteDraft);
  const [repeatContext] = useState(() => loadQuoteRepeat(params.get('repetir')));
  const [contact, setContact] = useState(savedDraft.contact);
  const [briefing, setBriefing] = useState(() => {
    const restored = repeatContext?.briefing ? { ...EMPTY_QUOTE_BRIEFING, ...repeatContext.briefing } : savedDraft.briefing;
    return { ...restored, actionName: restored.actionName || cart.selectionTitle || '' };
  });
  const [errors, setErrors] = useState<Partial<Record<keyof QuoteContact, string>>>({});
  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [draftNotice, setDraftNotice] = useState('');
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<{ mode: 'endpoint' | 'email'; href?: string; requestId?: string } | null>(null);
  const [website, setWebsite] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const submittingRef = useRef(false);
  const requestAttemptRef = useRef<{ id: string; submittedAt: string } | null>(null);
  const cartInitializedRef = useRef(false);
  const briefingTrackedRef = useRef(false);
  const totalUnits = useMemo(() => cart.items.reduce((sum, item) => sum + item.quantity, 0), [cart.items]);
  const campaignLabels = useMemo(() => campaignBriefLabels(cart.campaign), [cart.campaign]);
  const minimumDeadline = localDateInputValue();

  useEffect(() => {
    if (briefingTrackedRef.current || cart.items.length === 0) return;
    briefingTrackedRef.current = true;
    trackFunnelEvent('briefing_started', { item_count: cart.items.length });
  }, [cart.items.length]);

  useEffect(() => {
    saveQuoteDraft({ contact, briefing });
  }, [briefing, contact]);

  function updateField<Key extends keyof QuoteContact>(key: Key, value: QuoteContact[Key]) {
    setContact((current) => ({ ...current, [key]: value }));
    requestAttemptRef.current = null;
    clearSubmissionAttempt('promo-brindes:quote-attempt');
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function updateBriefing<Key extends keyof QuoteBriefingForm>(key: Key, value: QuoteBriefingForm[Key]) {
    setBriefing((current) => ({ ...current, [key]: value }));
    if (key === 'actionName') cart.setSelectionTitle(value as string);
    requestAttemptRef.current = null;
    clearSubmissionAttempt('promo-brindes:quote-attempt');
  }

  function commitItemQuantity(key: string, minimum: number) {
    const draft = quantityDrafts[key];
    if (draft === undefined) return;
    const nextQuantity = draft ? Number(draft) : minimum;
    setQuantityDrafts((drafts) => {
      const { [key]: _draft, ...remaining } = drafts;
      return remaining;
    });
    cart.updateQuantity(key, nextQuantity);
  }

  function adjustItemQuantity(key: string, currentQuantity: number, minimum: number, delta: number) {
    const draft = quantityDrafts[key];
    const parsed = Number(draft);
    const baseQuantity = draft && Number.isFinite(parsed) ? parsed : currentQuantity;
    const nextQuantity = Math.min(999999, Math.max(minimum, Math.round(baseQuantity + delta)));
    setQuantityDrafts((drafts) => {
      const { [key]: _draft, ...remaining } = drafts;
      return remaining;
    });
    cart.updateQuantity(key, nextQuantity);
  }

  function discardDraft() {
    clearQuoteDraft();
    setContact(EMPTY_QUOTE_CONTACT);
    setBriefing(EMPTY_QUOTE_BRIEFING);
    setErrors({});
    setDraftNotice('Rascunho apagado deste navegador. A sua seleção de produtos foi mantida.');
  }

  useEffect(() => {
    if (!cartInitializedRef.current) {
      cartInitializedRef.current = true;
      return;
    }
    requestAttemptRef.current = null;
    clearSubmissionAttempt('promo-brindes:quote-attempt');
  }, [cart.items]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (website || submittingRef.current) return;
    const nextErrors = validate(contact);
    setErrors(nextErrors);
    const firstError = Object.keys(nextErrors)[0] as keyof QuoteContact | undefined;
    if (firstError) {
      formRef.current?.querySelector<HTMLElement>(`[name="${firstError}"]`)?.focus();
      return;
    }
    const briefingError = validateQuoteBriefing(briefing, contact.deadline);
    if (briefingError) {
      setSubmitError(briefingError);
      const field = briefing.budgetRange && briefing.budgetRange !== 'a-definir' && !briefing.budgetScope
        ? 'budgetScope'
        : briefing.budgetScope && !briefing.budgetRange ? 'budgetRange' : 'eventDate';
      formRef.current?.querySelector<HTMLElement>(`[name="${field}"]`)?.focus();
      return;
    }
    if (!cart.items.length) return;
    submittingRef.current = true;
    setSending(true);
    setSubmitError('');
    try {
      const attempt = requestAttemptRef.current || getOrCreateSubmissionAttempt('promo-brindes:quote-attempt');
      requestAttemptRef.current = attempt;
      const payload = buildQuotePayload(contact, cart.items, undefined, attempt.submittedAt, attempt.id, cart.campaign, normalizeQuoteBriefing(briefing));
      const result = await submitQuoteRequest(payload);
      if (result.mode === 'endpoint') {
        trackFunnelEvent('quote_submitted', { item_count: cart.items.length, has_deadline: Boolean(contact.deadline) });
        requestAttemptRef.current = null;
        clearSubmissionAttempt('promo-brindes:quote-attempt');
        setSuccess({ mode: 'endpoint', requestId: result.requestId });
        cart.reset();
        clearQuoteDraft();
        clearQuoteRepeat();
        setBriefing(EMPTY_QUOTE_BRIEFING);
      } else {
        setSuccess({ mode: 'email', href: result.href });
        window.location.href = result.href;
      }
    } catch (error) {
      const reason = error instanceof ClientRequestError
        ? error.status === 429 ? 'rate_limited' : error.status === 409 ? 'conflict' : error.status && error.status < 500 ? 'validation' : 'network'
        : 'unknown';
      trackFunnelEvent('quote_submission_failed', { item_count: cart.items.length, reason });
      setSubmitError(error instanceof Error ? error.message : 'Não conseguimos enviar sua solicitação.');
    } finally {
      submittingRef.current = false;
      setSending(false);
    }
  }

  if (success) {
    return (
      <div className="success-page container">
        <Seo title="Solicitação preparada" path="/orcamento" noIndex />
        <span className="success-page__icon"><CheckCircle2 size={42} /></span>
        <span className="section-kicker">Briefing em movimento</span>
        <h1>{success.mode === 'endpoint' ? 'Sua solicitação chegou.' : 'Seu e-mail está pronto.'}</h1>
        <p>{success.mode === 'endpoint' ? 'Nosso time de especialistas vai analisar os itens e entrar em contato pelos dados informados.' : 'Abrimos seu aplicativo de e-mail com a seleção preenchida. Revise a mensagem e toque em enviar para concluir.'}</p>
        {success.requestId && <span className="success-page__protocol">Protocolo: {success.requestId}</span>}
        <div className="success-page__actions">
          {success.href && <a className="button button--green" href={success.href}><Mail size={18} /> Abrir e-mail novamente</a>}
          {success.mode === 'endpoint' && <Link className="button button--green" to="/entrar?next=/minha-conta">Acompanhar meus orçamentos</Link>}
          <Link className="button button--outline" to="/catalogo">Voltar ao catálogo</Link>
        </div>
        {success.mode === 'endpoint' && <p className="success-page__account-note">Entre com o mesmo e-mail informado no briefing para ver esta solicitação no seu histórico.</p>}
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="empty-quote container">
        <Seo title="Solicitar orçamento" path="/orcamento" noIndex />
        <span className="empty-icon"><ShoppingBag size={34} /></span>
        <span className="section-kicker">Minha seleção</span>
        <h1>Sua seleção ainda está em branco.</h1>
        <p>Salve ao menos um produto. Depois você organiza quantidades, contexto e prazo em um único briefing.</p>
        <Link className="button button--green button--large" to="/catalogo">Abrir radar <ArrowRight size={18} /></Link>
      </div>
    );
  }

  return (
    <>
      <Seo title="Solicitar orçamento" description="Revise sua seleção de brindes e envie um briefing para receber uma proposta personalizada." path="/orcamento" noIndex />
      <header className="quote-page__header">
        <div className="container">
          <div className="quote-print-identity"><img src="/brand/promo-brindes-logo-v2-800.webp" width="800" height="420" alt="Promo Brindes" /><span>Seleção para cotação · {localDateInputValue()}</span></div>
          <Link className="back-link" to="/catalogo"><ArrowLeft size={17} /> Continuar escolhendo</Link>
          <span className="section-kicker">Seleção feita. Contexto agora.</span>
          <h1>Transforme sua seleção em briefing.</h1>
          <p>Revise quantidades e compartilhe o essencial. Não há pagamento nem compromisso nesta etapa.</p>
          <button className="quote-print-button" type="button" onClick={() => { trackFunnelEvent('selection_printed', { item_count: cart.items.length }); window.print(); }}><Printer size={17} /> Imprimir / salvar em PDF</button>
          <ol className="quote-steps" aria-label="Etapas da solicitação"><li className="is-complete"><span><CheckCircle2 /></span>Seleção</li><li className="is-current"><span>2</span>Briefing</li><li><span>3</span>Curadoria</li></ol>
        </div>
      </header>

      <div className="container quote-layout">
        <section className="quote-items" aria-labelledby="selection-title">
          <div className="quote-section-heading"><div><span>01</span><div><h2 id="selection-title">Produtos selecionados</h2><p>{cart.itemCount} {cart.itemCount === 1 ? 'item' : 'itens'} · {totalUnits.toLocaleString('pt-BR')} unidades estimadas</p></div></div><button type="button" onClick={cart.clear}>Limpar seleção</button></div>
          <div className="quote-items__list">
            {cart.items.map((item) => (
              <article className="quote-item" key={item.key}>
                <Link className="quote-item__image" to={`/produto/${item.slug}`} aria-label={`Abrir ${item.name}`}><img src={item.imageUrl} alt="" width="130" height="130" referrerPolicy="no-referrer" onError={replaceBrokenProductImage} /></Link>
                <div className="quote-item__main"><Link to={`/produto/${item.slug}`}>{item.name}</Link><p>Cód. {item.sku}</p>{item.colorName && <span className="quote-item__color"><i style={{ backgroundColor: item.colorHex }} /> {item.colorName}</span>}{quoteDecisionGroupsEnabled && <label className="quote-item__decision"><span>Como considerar</span><select aria-label={`Como considerar ${item.name}`} value={item.decisionGroup || 'primary'} onChange={(event) => cart.setItemDecisionGroup(item.key, event.target.value as 'primary' | 'alternative')}><option value="primary">Referência principal</option><option value="alternative">Alternativa para comparar</option></select></label>}</div>
                <div className="quote-item__quantity"><label htmlFor={`quantity-${item.key}`}>Quantidade</label><div className="quantity-control quantity-control--small"><button type="button" onClick={() => adjustItemQuantity(item.key, item.quantity, item.minQuantity, -10)} aria-label="Diminuir quantidade"><Minus size={15} /></button><input id={`quantity-${item.key}`} type="number" min={item.minQuantity} max="999999" inputMode="numeric" value={quantityDrafts[item.key] ?? item.quantity} onFocus={(event) => event.currentTarget.select()} onChange={(event) => setQuantityDrafts((drafts) => ({ ...drafts, [item.key]: event.target.value.replace(/\D/g, '') }))} onBlur={() => commitItemQuantity(item.key, item.minQuantity)} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} /><button type="button" onClick={() => adjustItemQuantity(item.key, item.quantity, item.minQuantity, 10)} aria-label="Aumentar quantidade"><Plus size={15} /></button></div>{item.minQuantity > 1 && <small>Mín. {item.minQuantity}</small>}</div>
                <button className="quote-item__remove" type="button" onClick={() => cart.removeItem(item.key)} aria-label={`Remover ${item.name}`}><Trash2 size={18} /></button>
              </article>
            ))}
          </div>
          <Link className="add-more-link" to="/catalogo"><Plus size={17} /> Adicionar mais produtos</Link>
        </section>

        <section className="quote-form-section" aria-labelledby="briefing-title">
          <div className="quote-section-heading"><div><span>02</span><div><h2 id="briefing-title">Seu briefing</h2><p>Campos com * são obrigatórios</p></div></div><button type="button" className="text-button" onClick={discardDraft}>Apagar rascunho</button></div>
          <p className="quote-draft-notice" role="status">Seus dados deste formulário ficam salvos por {QUOTE_DRAFT_RETENTION_LABEL} para evitar perda de trabalho. Não use este campo para dados sensíveis.</p>
          {draftNotice && <p className="quote-draft-notice quote-draft-notice--success" role="status">{draftNotice}</p>}
          {campaignLabels.length > 0 && <aside className="quote-campaign-context" aria-label="Contexto recuperado da sua campanha"><div><span>Contexto recuperado</span><strong>Esta seleção já tem uma direção.</strong><p>Você pode complementar no briefing; essas referências acompanham a análise do nosso time de especialistas.</p></div><ul>{campaignLabels.map((label) => <li key={label}>{label}</li>)}</ul></aside>}
          <form ref={formRef} className="quote-form" onSubmit={(event) => void submit(event)} noValidate>
            <div className="honeypot" aria-hidden="true"><label>Website<input value={website} onChange={(event) => setWebsite(event.target.value)} autoComplete="off" tabIndex={-1} /></label></div>
            <div className="form-grid">
              <div className="form-field"><label htmlFor="name">Seu nome *</label><input id="name" name="name" autoComplete="name" maxLength={100} value={contact.name} onChange={(event) => updateField('name', event.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'name-error' : undefined} />{errors.name && <span id="name-error" className="field-error">{errors.name}</span>}</div>
              <div className="form-field"><label htmlFor="company">Empresa *</label><input id="company" name="company" autoComplete="organization" maxLength={150} value={contact.company} onChange={(event) => updateField('company', event.target.value)} aria-invalid={Boolean(errors.company)} aria-describedby={errors.company ? 'company-error' : undefined} />{errors.company && <span id="company-error" className="field-error">{errors.company}</span>}</div>
              <div className="form-field"><label htmlFor="email">Seu e-mail *</label><input id="email" name="email" type="email" inputMode="email" autoComplete="email" maxLength={160} value={contact.email} onChange={(event) => updateField('email', event.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : undefined} />{errors.email && <span id="email-error" className="field-error">{errors.email}</span>}</div>
              <div className="form-field"><label htmlFor="phone">Telefone / WhatsApp *</label><input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={16} placeholder="(11) 99999-9999" value={contact.phone} onChange={(event) => updateField('phone', formatPhone(event.target.value))} aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? 'phone-error' : undefined} />{errors.phone && <span id="phone-error" className="field-error">{errors.phone}</span>}</div>
              <div className="form-field"><label htmlFor="city">Cidade / UF <span>opcional</span></label><input id="city" name="city" autoComplete="address-level2" maxLength={100} placeholder="Ex.: São Paulo / SP" value={contact.city} onChange={(event) => updateField('city', event.target.value)} /></div>
              <div className="form-field"><label htmlFor="deadline">Quando você precisa receber? <span>opcional</span></label><input id="deadline" name="deadline" type="date" min={minimumDeadline} value={contact.deadline} onChange={(event) => updateField('deadline', event.target.value)} aria-invalid={Boolean(errors.deadline)} aria-describedby={errors.deadline ? 'deadline-error' : undefined} />{errors.deadline && <span id="deadline-error" className="field-error">{errors.deadline}</span>}</div>
              <div className="form-field form-field--wide"><label htmlFor="actionName">Como você chama esta ação? <span>opcional</span></label><input id="actionName" name="actionName" maxLength={100} placeholder="Ex.: Kit de boas-vindas do time 2026" value={briefing.actionName} onChange={(event) => updateBriefing('actionName', event.target.value)} /><small>Um nome ajuda nosso time de especialistas a reconhecer este briefing.</small></div>
              <div className="form-field"><label htmlFor="eventDate">Quando é o evento? <span>opcional</span></label><input id="eventDate" name="eventDate" type="date" min={minimumDeadline} value={briefing.eventDate} onChange={(event) => updateBriefing('eventDate', event.target.value)} /><small>Se for diferente da data de recebimento.</small></div>
              <div className="form-field"><label htmlFor="deadlineFlexibility">Recebimento <span>opcional</span></label><select id="deadlineFlexibility" name="deadlineFlexibility" value={briefing.deadlineFlexibility} onChange={(event) => updateBriefing('deadlineFlexibility', event.target.value as QuoteBriefingForm['deadlineFlexibility'])}><option value="">Ainda vou confirmar</option>{Object.entries(quoteBriefingLabels.deadlineFlexibility).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
              <div className="form-field"><label htmlFor="budgetScope">Investimento considerado <span>opcional</span></label><select id="budgetScope" name="budgetScope" value={briefing.budgetScope} onChange={(event) => updateBriefing('budgetScope', event.target.value as QuoteBriefingForm['budgetScope'])}><option value="">Prefiro conversar sobre isso</option>{Object.entries(quoteBriefingLabels.budgetScope).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
              <div className="form-field"><label htmlFor="budgetRange">Faixa de investimento <span>opcional</span></label><select id="budgetRange" name="budgetRange" value={briefing.budgetRange} onChange={(event) => updateBriefing('budgetRange', event.target.value as QuoteBriefingForm['budgetRange'])}><option value="">Prefiro conversar sobre isso</option>{Object.entries(quoteBriefingLabels.budgetRange).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
              <div className="form-field"><label htmlFor="responseChannel">Como prefere continuar a conversa? <span>opcional</span></label><select id="responseChannel" name="responseChannel" value={briefing.responseChannel} onChange={(event) => updateBriefing('responseChannel', event.target.value as QuoteBriefingForm['responseChannel'])}><option value="">Sem preferência</option>{Object.entries(quoteBriefingLabels.responseChannel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
              <div className="form-field form-field--wide"><label htmlFor="brandAssetStatus">Identidade visual <span>opcional</span></label><select id="brandAssetStatus" name="brandAssetStatus" value={briefing.brandAssetStatus} onChange={(event) => updateBriefing('brandAssetStatus', event.target.value as QuoteBriefingForm['brandAssetStatus'])}><option value="">Conte para a gente em que ponto está</option>{Object.entries(quoteBriefingLabels.brandAssetStatus).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><small>Não envie arquivos sensíveis pelo formulário. Se necessário, nosso time de especialistas combinará um canal seguro para receber sua marca.</small></div>
              <div className="form-field form-field--wide"><label htmlFor="notes">Qual é a ideia da ação? <span>opcional</span></label><textarea id="notes" name="notes" rows={5} maxLength={800} placeholder="Ex.: onboarding para 300 pessoas, visual mais street, preferência por materiais reciclados, logo em uma cor…" value={contact.notes} onChange={(event) => updateField('notes', event.target.value)} /><small className="char-count">{contact.notes.length}/800</small></div>
            </div>
            <label className={`privacy-check ${errors.privacyAccepted ? 'has-error' : ''}`}><input name="privacyAccepted" type="checkbox" checked={contact.privacyAccepted} onChange={(event) => updateField('privacyAccepted', event.target.checked)} aria-invalid={Boolean(errors.privacyAccepted)} aria-describedby={errors.privacyAccepted ? 'privacy-error' : undefined} /><span><ShieldCheck size={20} /></span><span>Li o <Link to="/privacidade" target="_blank">aviso de privacidade</Link> e autorizo o contato da Promo Brindes sobre esta solicitação. *</span></label>
            {errors.privacyAccepted && <span id="privacy-error" className="field-error privacy-error">{errors.privacyAccepted}</span>}
            {submitError && <div className="submit-error" role="alert">{submitError}</div>}
            <div className="quote-submit"><div><strong>Pronto para ativar a curadoria?</strong><span>Você alinha todos os detalhes com nosso time de especialistas antes de qualquer decisão.</span></div><button className="button button--green button--large" type="submit" disabled={sending}>{sending ? 'Enviando…' : <><Send size={18} /> Enviar briefing</>}</button></div>
          </form>
        </section>
      </div>
      <div className="container quote-faq-wrap"><ContextualFaq scope="quote" /></div>
    </>
  );
}
