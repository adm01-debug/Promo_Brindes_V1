import { ArrowLeft, Check, Download, MessageCircleMore, PackageOpen, RefreshCw, Send } from 'lucide-react';
import { type FormEvent, type MouseEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CustomerRoute } from '../components/CustomerRoute';
import { Seo } from '../components/Seo';
import { useQuoteCart } from '../context/quoteCart';
import { useCustomerAuth } from '../context/customerAuth';
import { customerStatusLabel, customerStatusTone, fetchMyQuoteRequest, isProposalExpired, requestMyQuoteAdjustment, type CustomerProposal, type CustomerQuoteDetail } from '../lib/customerAccount';
import { siteSupabase } from '../lib/siteSupabase';
import { trackFunnelEvent } from '../lib/analytics';
import { campaignBriefLabels, normalizeCampaignBrief } from '../lib/campaignBrief';
import { normalizeQuoteBriefing, quoteBriefingSummary } from '../lib/quoteBriefing';
import { saveQuoteRepeat } from '../lib/quoteRepeat';
import { clearSubmissionAttempt, getOrCreateSubmissionAttempt } from '../lib/http';
import { customerAdjustmentsEnabled, quoteDecisionGroupsEnabled } from '../lib/siteFeatureFlags';
import { fetchProductsByIds } from '../lib/catalog';
import { reconcileHistoricalQuoteItems } from '../lib/quoteItems';

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(value));
}

function QuoteContent() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const cart = useQuoteCart();
  const auth = useCustomerAuth();
  const contextKey = `${auth.user?.id || 'anonymous'}:${auth.identityEpoch}:${id}`;
  const [quote, setQuote] = useState<CustomerQuoteDetail | null>(null);
  const [quoteContextKey, setQuoteContextKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [proposalError, setProposalError] = useState('');
  const [downloading, setDownloading] = useState('');
  const [repeatConfirmationOpen, setRepeatConfirmationOpen] = useState(false);
  const [repeating, setRepeating] = useState(false);
  const [repeatError, setRepeatError] = useState('');
  const [adjustmentMessage, setAdjustmentMessage] = useState('');
  const [adjustmentState, setAdjustmentState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [adjustmentError, setAdjustmentError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const adjustmentAttemptRef = useRef<{ id: string; submittedAt: string } | null>(null);
  const cancelRepeatRef = useRef<HTMLButtonElement>(null);
  const repeatConfirmationRef = useRef<HTMLElement>(null);
  const repeatTriggerRef = useRef<HTMLButtonElement | null>(null);
  const currentContextRef = useRef(contextKey);
  const loadedQuoteIdRef = useRef('');
  const repeatAbortRef = useRef<AbortController | null>(null);
  const proposalAbortRef = useRef<AbortController | null>(null);
  currentContextRef.current = contextKey;

  function closeRepeatConfirmation() {
    setRepeatConfirmationOpen(false);
    window.requestAnimationFrame(() => repeatTriggerRef.current?.focus());
  }

  useEffect(() => {
    repeatAbortRef.current?.abort();
    proposalAbortRef.current?.abort();
    if (loadedQuoteIdRef.current) clearSubmissionAttempt(`promo-brindes:quote-adjustment:${loadedQuoteIdRef.current}`);
    loadedQuoteIdRef.current = '';
    adjustmentAttemptRef.current = null;
    let active = true;
    setQuote(null);
    setQuoteContextKey('');
    setLoading(true);
    setError('');
    setProposalError('');
    setDownloading('');
    setRepeatConfirmationOpen(false);
    setRepeating(false);
    setRepeatError('');
    setAdjustmentMessage('');
    setAdjustmentState('idle');
    setAdjustmentError('');
    repeatTriggerRef.current = null;
    void fetchMyQuoteRequest(id).then((data) => {
      if (!active || currentContextRef.current !== contextKey) return;
      loadedQuoteIdRef.current = data?.id || '';
      setQuote(data);
      setQuoteContextKey(contextKey);
    }).catch(() => {
      if (active && currentContextRef.current === contextKey) {
        setQuoteContextKey(contextKey);
        setError('Não conseguimos abrir esta solicitação.');
      }
    }).finally(() => {
      if (active && currentContextRef.current === contextKey) setLoading(false);
    });
    return () => {
      active = false;
      repeatAbortRef.current?.abort();
      proposalAbortRef.current?.abort();
    };
  }, [contextKey, id, retryKey]);

  useEffect(() => {
    if (!repeatConfirmationOpen) return;
    cancelRepeatRef.current?.focus();
    function keepFocusInConfirmation(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRepeatConfirmation();
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(repeatConfirmationRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])') || []);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener('keydown', keepFocusInConfirmation);
    return () => window.removeEventListener('keydown', keepFocusInConfirmation);
  }, [repeatConfirmationOpen]);

  async function continueRepeatQuote() {
    if (!quote || repeating) return;
    const operationContext = contextKey;
    const sourceQuote = quote;
    const controller = new AbortController();
    repeatAbortRef.current?.abort();
    repeatAbortRef.current = controller;
    setRepeating(true);
    setRepeatError('');
    try {
      const products = await fetchProductsByIds(sourceQuote.items.map((item) => item.productId), controller.signal, 50);
      if (controller.signal.aborted || currentContextRef.current !== operationContext) return;
      const reconciledItems = reconcileHistoricalQuoteItems(sourceQuote.items, products);
      const campaign = normalizeCampaignBrief(sourceQuote.campaign);
      const briefing = normalizeQuoteBriefing(sourceQuote.briefing);
      cart.replaceItems(reconciledItems);
      cart.setCampaign(campaign);
      cart.setSelectionTitle(briefing?.actionName);
      saveQuoteRepeat({ quoteId: sourceQuote.id, campaign, briefing });
      trackFunnelEvent('customer_quote_repeated', { item_count: reconciledItems.length });
      void navigate(`/orcamento?repetir=${encodeURIComponent(sourceQuote.id)}`);
    } catch {
      if (!controller.signal.aborted && currentContextRef.current === operationContext) setRepeatError('Não conseguimos conferir os produtos atuais. Tente novamente antes de substituir sua seleção.');
    } finally {
      if (repeatAbortRef.current === controller) repeatAbortRef.current = null;
      if (currentContextRef.current === operationContext) setRepeating(false);
    }
  }

  function repeatQuote(event?: MouseEvent<HTMLButtonElement>) {
    if (!quote) return;
    if (cart.itemCount > 0) {
      repeatTriggerRef.current = event?.currentTarget || null;
      setRepeatConfirmationOpen(true);
      return;
    }
    void continueRepeatQuote();
  }

  async function downloadProposal(proposal: CustomerProposal) {
    if (!siteSupabase) return;
    const operationContext = contextKey;
    const controller = new AbortController();
    proposalAbortRef.current?.abort();
    proposalAbortRef.current = controller;
    setDownloading(proposal.id);
    setProposalError('');
    try {
      const { data } = await siteSupabase.auth.getSession();
      if (controller.signal.aborted || currentContextRef.current !== operationContext) return;
      const response = await fetch('/api/customer-proposals', { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token || ''}` }, body: JSON.stringify({ proposalId: proposal.id }) });
      const result = await response.json() as { url?: string; message?: string };
      if (!response.ok || !result.url) throw new Error(result.message);
      if (controller.signal.aborted || currentContextRef.current !== operationContext) return;
      trackFunnelEvent('customer_proposal_opened', { version: proposal.version });
      window.location.assign(result.url);
    } catch { if (!controller.signal.aborted && currentContextRef.current === operationContext) setProposalError('Não conseguimos abrir esta proposta agora. Tente novamente em alguns instantes.'); }
    finally {
      if (proposalAbortRef.current === controller) proposalAbortRef.current = null;
      if (currentContextRef.current === operationContext) setDownloading('');
    }
  }

  async function submitAdjustment(event: FormEvent) {
    event.preventDefault();
    if (!quote || adjustmentState === 'sending') return;
    if (adjustmentMessage.trim().length < 2) {
      setAdjustmentState('error');
      return;
    }
    setAdjustmentState('sending');
    setAdjustmentError('');
    const operationContext = contextKey;
    const sourceQuote = quote;
    const sourceMessage = adjustmentMessage;
    try {
      const attemptKey = `promo-brindes:quote-adjustment:${sourceQuote.id}`;
      const attempt = adjustmentAttemptRef.current || getOrCreateSubmissionAttempt(attemptKey);
      adjustmentAttemptRef.current = attempt;
      await requestMyQuoteAdjustment(sourceQuote.id, sourceMessage, attempt.id);
      if (currentContextRef.current !== operationContext) return;
      adjustmentAttemptRef.current = null;
      clearSubmissionAttempt(attemptKey);
      setAdjustmentMessage('');
      setAdjustmentState('success');
      trackFunnelEvent('customer_adjustment_requested', { item_count: sourceQuote.items.length });
      setRetryKey((current) => current + 1);
    } catch (error) {
      if (currentContextRef.current !== operationContext) return;
      setAdjustmentState('error');
      setAdjustmentError(error instanceof Error ? error.message : 'Não conseguimos enviar o pedido de ajuste agora. Tente novamente em alguns instantes.');
    }
  }

  if (loading || quoteContextKey !== contextKey) return <div className="customer-state container" role="status">Carregando solicitação…</div>;
  if (error && !quote) return <div className="customer-state container"><span>SOLICITAÇÃO</span><h1>Não foi possível abrir.</h1><p>{error}</p><button className="button button--green" type="button" onClick={() => setRetryKey((current) => current + 1)}>Tentar novamente</button><Link className="button button--dark" to="/minha-conta">Voltar ao histórico</Link></div>;
  if (!quote) return <div className="customer-state container"><span>SOLICITAÇÃO</span><h1>Orçamento não encontrado.</h1><p>Ele pode pertencer a outro acesso ou não estar mais disponível.</p><Link className="button button--dark" to="/minha-conta">Voltar ao histórico</Link></div>;
  const campaign = normalizeCampaignBrief(quote.campaign);
  const briefing = normalizeQuoteBriefing(quote.briefing);
  const campaignContext = campaignBriefLabels(campaign);
  const briefingContext = quoteBriefingSummary(briefing);
  const curationContext = [...campaignContext, ...briefingContext];

  return <>
    <Seo title={`Orçamento ${quote.protocol}`} path={`/minha-conta/orcamentos/${quote.id}`} noIndex />
    <header className="customer-quote-hero"><div className="container"><Link className="back-link" to="/minha-conta"><ArrowLeft size={17} /> Meus orçamentos</Link><div className="customer-quote-hero__meta"><span className={`customer-status customer-status--${customerStatusTone(quote.status)}`}>{customerStatusLabel(quote.status)}</span><span>Protocolo #{quote.protocol}</span></div><h1>{briefing?.actionName || quote.company}</h1>{briefing?.actionName && <p>{quote.company} · enviado em {dateLabel(quote.submittedAt)}</p>}{!briefing?.actionName && <p>Enviado em {dateLabel(quote.submittedAt)}</p>}<button className="button button--green" type="button" onClick={repeatQuote}><RefreshCw size={17} /> Solicitar novamente</button></div></header>
    <div className="container customer-quote-layout">
      <div className="customer-quote-main">
        <section className="customer-detail-section" aria-labelledby="quote-products-title"><div className="customer-detail-section__heading"><span>01</span><div><h2 id="quote-products-title">Seleção enviada</h2><p>Retrato dos produtos e quantidades no momento do briefing.</p></div></div><div className="customer-detail-items">{quote.items.map((item) => <article key={item.key}><img src={item.imageUrl || '/images/product-placeholder.svg'} alt="" width="92" height="92" referrerPolicy="no-referrer" /><div><h3>{item.name}</h3><p>Cód. {item.sku}{item.colorName ? ` · ${item.colorName}` : ''}</p>{quoteDecisionGroupsEnabled && item.decisionGroup && <small className={item.decisionGroup === 'alternative' ? 'customer-item-priority is-alternative' : 'customer-item-priority'}>{item.decisionGroup === 'alternative' ? 'Alternativa para comparar' : 'Referência principal'}</small>}</div><strong>{item.quantity.toLocaleString('pt-BR')} un.</strong></article>)}</div></section>
        <section className="customer-detail-section" aria-labelledby="quote-briefing-title"><div className="customer-detail-section__heading"><span>02</span><div><h2 id="quote-briefing-title">Briefing original</h2><p>Os dados abaixo não mudam depois do envio.</p></div></div><dl className="customer-briefing-data"><div><dt>Contato</dt><dd>{quote.contactName}<br />{quote.email}<br />{quote.phone}</dd></div><div><dt>Local e recebimento</dt><dd>{quote.city || 'Local não informado'}<br />{quote.desiredDeadline ? `Recebimento desejado: ${new Intl.DateTimeFormat('pt-BR').format(new Date(`${quote.desiredDeadline}T12:00:00`))}` : 'Data de recebimento a combinar'}</dd></div>{curationContext.length > 0 && <div className="customer-briefing-data__wide"><dt>Direção de curadoria</dt><dd>{curationContext.join(' · ')}</dd></div>}<div className="customer-briefing-data__wide"><dt>Contexto da ação</dt><dd>{quote.notes || 'Nenhuma observação adicional foi informada.'}</dd></div></dl></section>
        {quote.proposals.length > 0 && <section className="customer-detail-section" aria-labelledby="quote-proposals-title"><div className="customer-detail-section__heading"><span>03</span><div><h2 id="quote-proposals-title">Propostas</h2><p>Versões disponibilizadas pelo nosso time de especialistas.</p></div></div><div className="customer-proposals">{quote.proposals.map((proposal) => { const expired = isProposalExpired(proposal); return <article key={proposal.id} className={`${proposal.isCurrent && !expired ? 'is-current' : ''}${expired ? ' is-expired' : ''}`.trim()}><Download /><div><strong>{proposal.title}</strong><span>{proposal.isCurrent ? expired ? 'Versão mais recente' : 'Versão atual' : 'Versão anterior'} · v{proposal.version} · publicada em {dateLabel(proposal.publishedAt)}</span>{proposal.validUntil && <small className={expired ? 'customer-proposal-expired' : undefined}>{expired ? 'Validade encerrada em' : 'Válida até'} {new Intl.DateTimeFormat('pt-BR').format(new Date(`${proposal.validUntil}T12:00:00`))}</small>}{expired && <small>Você ainda pode consultar o arquivo e pedir uma versão atualizada.</small>}</div><button type="button" disabled={downloading === proposal.id} onClick={() => void downloadProposal(proposal)}>{downloading === proposal.id ? 'Abrindo…' : 'Abrir proposta'}</button></article>; })}</div>{proposalError && <p className="customer-proposal-error" role="alert">{proposalError}</p>}</section>}
        {customerAdjustmentsEnabled && <section className="customer-detail-section customer-adjustment" aria-labelledby="quote-adjustment-title"><div className="customer-detail-section__heading"><span>04</span><div><h2 id="quote-adjustment-title">Precisa ajustar algo?</h2><p>Conte o que mudou. O pedido fica vinculado a esta solicitação e entra no acompanhamento.</p></div></div><form onSubmit={(event) => void submitAdjustment(event)}><label htmlFor="customer-adjustment-message">O que você gostaria de revisar?</label><textarea id="customer-adjustment-message" disabled={adjustmentState === 'sending'} maxLength={800} rows={4} value={adjustmentMessage} onChange={(event) => { setAdjustmentMessage(event.target.value); adjustmentAttemptRef.current = null; clearSubmissionAttempt(`promo-brindes:quote-adjustment:${quote.id}`); if (adjustmentState !== 'idle') setAdjustmentState('idle'); setAdjustmentError(''); }} placeholder="Ex.: a quantidade mudou, preciso de outra opção de cor ou quero considerar uma embalagem diferente." /><div><span>{adjustmentMessage.length}/800</span><button type="submit" className="button button--dark" disabled={adjustmentState === 'sending'}><Send size={16} /> {adjustmentState === 'sending' ? 'Enviando…' : 'Enviar pedido de ajuste'}</button></div>{adjustmentState === 'success' && <p className="customer-adjustment__message is-success" role="status"><Check size={16} /> Pedido de ajuste enviado. Ele aparecerá na linha do tempo.</p>}{adjustmentState === 'error' && <p className="customer-adjustment__message is-error" role="alert"><MessageCircleMore size={16} /> {adjustmentError || 'Não conseguimos enviar o pedido de ajuste agora. Tente novamente em alguns instantes.'}</p>}</form></section>}
      </div>
      <aside className="customer-timeline" aria-labelledby="quote-timeline-title"><span>ACOMPANHAMENTO</span><h2 id="quote-timeline-title">Linha do tempo</h2>{quote.events.length ? <ol>{quote.events.map((event, index) => <li key={event.id} className={index === 0 ? 'is-current' : ''}><i>{index === 0 ? <Check size={14} /> : null}</i><div><strong>{event.title}</strong><time dateTime={event.createdAt}>{dateLabel(event.createdAt)}</time>{event.description && <p>{event.description}</p>}</div></li>)}</ol> : <div className="customer-timeline__empty"><PackageOpen /><p>Recebemos a solicitação. O próximo andamento aparecerá aqui.</p></div>}</aside>
    </div>
    <section className="customer-repeat-cta"><div className="container"><div><span className="section-kicker">Uma boa escolha pode evoluir</span><h2>Use este briefing como ponto de partida.</h2><p>Itens, quantidades e direção de campanha voltam para sua seleção para você revisar antes de enviar uma nova solicitação.</p></div><button className="button button--light button--large" type="button" onClick={repeatQuote}><RefreshCw size={18} /> Solicitar novamente</button></div></section>
    {repeatError && !repeatConfirmationOpen && <p className="customer-repeat-error" role="alert">{repeatError}</p>}
    {repeatConfirmationOpen && <div className="customer-confirmation-backdrop" role="presentation" onMouseDown={(event) => { if (!repeating && event.target === event.currentTarget) closeRepeatConfirmation(); }}><section ref={repeatConfirmationRef} className="customer-confirmation" role="dialog" aria-modal="true" aria-labelledby="replace-selection-title" aria-describedby="replace-selection-description"><span className="section-kicker">SELEÇÃO ATUAL</span><h2 id="replace-selection-title">Trocar sua seleção atual?</h2><p id="replace-selection-description">Você tem {cart.itemCount} {cart.itemCount === 1 ? 'produto' : 'produtos'} ainda não enviado{cart.itemCount === 1 ? '' : 's'}. Ao continuar, eles serão substituídos pelos {quote.items.length} itens deste orçamento para você revisar.</p>{repeatError && <p className="customer-proposal-error" role="alert">{repeatError}</p>}<div><button ref={cancelRepeatRef} className="button button--outline" type="button" disabled={repeating} onClick={closeRepeatConfirmation}>Manter minha seleção</button><button className="button button--green" type="button" disabled={repeating} onClick={() => void continueRepeatQuote()}>{repeating ? 'Conferindo produtos…' : 'Substituir e continuar'} <RefreshCw size={17} /></button></div></section></div>}
  </>;
}

export default function CustomerQuotePage() { return <CustomerRoute><QuoteContent /></CustomerRoute>; }
