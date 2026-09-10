import { ArrowLeft, CalendarDays, Check, Download, PackageOpen, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CustomerRoute } from '../components/CustomerRoute';
import { Seo } from '../components/Seo';
import { useQuoteCart } from '../context/QuoteCartContext';
import { customerStatusLabel, customerStatusTone, fetchMyQuoteRequest, type CustomerProposal, type CustomerQuoteDetail } from '../lib/customerAccount';
import { siteSupabase } from '../lib/siteSupabase';
import { trackFunnelEvent } from '../lib/analytics';
import { campaignBriefLabels, normalizeCampaignBrief } from '../lib/campaignBrief';
import { normalizeQuoteBriefing, quoteBriefingSummary } from '../lib/quoteBriefing';

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(value));
}

function QuoteContent() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const cart = useQuoteCart();
  const [quote, setQuote] = useState<CustomerQuoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [proposalError, setProposalError] = useState('');
  const [downloading, setDownloading] = useState('');
  const [repeatConfirmationOpen, setRepeatConfirmationOpen] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const cancelRepeatRef = useRef<HTMLButtonElement>(null);
  const repeatConfirmationRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    void fetchMyQuoteRequest(id).then((data) => { if (active) setQuote(data); }).catch(() => { if (active) setError('Não conseguimos abrir esta solicitação.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, retryKey]);

  useEffect(() => {
    if (!repeatConfirmationOpen) return;
    cancelRepeatRef.current?.focus();
    function keepFocusInConfirmation(event: KeyboardEvent) {
      if (event.key === 'Escape') setRepeatConfirmationOpen(false);
      if (event.key !== 'Tab') return;
      const focusable = Array.from(repeatConfirmationRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])') || []);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
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

  function continueRepeatQuote() {
    if (!quote) return;
    cart.replaceItems(quote.items);
    trackFunnelEvent('customer_quote_repeated', { item_count: quote.items.length });
    navigate(`/orcamento?repetir=${encodeURIComponent(quote.id)}`);
  }

  function repeatQuote() {
    if (!quote) return;
    if (cart.itemCount > 0) {
      setRepeatConfirmationOpen(true);
      return;
    }
    continueRepeatQuote();
  }

  async function downloadProposal(proposal: CustomerProposal) {
    if (!siteSupabase) return;
    setDownloading(proposal.id);
    setProposalError('');
    try {
      const { data } = await siteSupabase.auth.getSession();
      const response = await fetch('/api/customer-proposals', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token || ''}` }, body: JSON.stringify({ proposalId: proposal.id }) });
      const result = await response.json() as { url?: string; message?: string };
      if (!response.ok || !result.url) throw new Error(result.message);
      trackFunnelEvent('customer_proposal_opened', { version: proposal.version });
      window.location.assign(result.url);
    } catch { setProposalError('Não conseguimos abrir esta proposta agora. Tente novamente em alguns instantes.'); }
    finally { setDownloading(''); }
  }

  if (loading) return <div className="customer-state container" role="status">Carregando solicitação…</div>;
  if (error && !quote) return <div className="customer-state container"><span>SOLICITAÇÃO</span><h1>Não foi possível abrir.</h1><p>{error}</p><button className="button button--green" type="button" onClick={() => setRetryKey((current) => current + 1)}>Tentar novamente</button><Link className="button button--dark" to="/minha-conta">Voltar ao histórico</Link></div>;
  if (!quote) return <div className="customer-state container"><span>SOLICITAÇÃO</span><h1>Orçamento não encontrado.</h1><p>Ele pode pertencer a outro acesso ou não estar mais disponível.</p><Link className="button button--dark" to="/minha-conta">Voltar ao histórico</Link></div>;
  const campaignContext = campaignBriefLabels(normalizeCampaignBrief(quote.campaign));
  const briefingContext = quoteBriefingSummary(normalizeQuoteBriefing(quote.briefing));
  const curationContext = [...campaignContext, ...briefingContext];

  return <>
    <Seo title={`Orçamento ${quote.protocol}`} path={`/minha-conta/orcamentos/${quote.id}`} noIndex />
    <header className="customer-quote-hero"><div className="container"><Link className="back-link" to="/minha-conta"><ArrowLeft size={17} /> Meus orçamentos</Link><div className="customer-quote-hero__meta"><span className={`customer-status customer-status--${customerStatusTone(quote.status)}`}>{customerStatusLabel(quote.status)}</span><span>Protocolo #{quote.protocol}</span></div><h1>{quote.company}</h1><p>Enviado em {dateLabel(quote.submittedAt)}</p><button className="button button--green" type="button" onClick={repeatQuote}><RefreshCw size={17} /> Solicitar novamente</button></div></header>
    <div className="container customer-quote-layout">
      <div className="customer-quote-main">
        <section className="customer-detail-section" aria-labelledby="quote-products-title"><div className="customer-detail-section__heading"><span>01</span><div><h2 id="quote-products-title">Seleção enviada</h2><p>Retrato dos produtos e quantidades no momento do briefing.</p></div></div><div className="customer-detail-items">{quote.items.map((item) => <article key={item.key}><img src={item.imageUrl || '/images/product-placeholder.svg'} alt="" width="92" height="92" referrerPolicy="no-referrer" /><div><h3>{item.name}</h3><p>Cód. {item.sku}{item.colorName ? ` · ${item.colorName}` : ''}</p></div><strong>{item.quantity.toLocaleString('pt-BR')} un.</strong></article>)}</div></section>
        <section className="customer-detail-section" aria-labelledby="quote-briefing-title"><div className="customer-detail-section__heading"><span>02</span><div><h2 id="quote-briefing-title">Briefing original</h2><p>Os dados abaixo não mudam depois do envio.</p></div></div><dl className="customer-briefing-data"><div><dt>Contato</dt><dd>{quote.contactName}<br />{quote.email}<br />{quote.phone}</dd></div><div><dt>Local e prazo</dt><dd>{quote.city || 'Local não informado'}<br />{quote.desiredDeadline ? `Prazo desejado: ${new Intl.DateTimeFormat('pt-BR').format(new Date(`${quote.desiredDeadline}T12:00:00`))}` : 'Prazo a combinar'}</dd></div>{curationContext.length > 0 && <div className="customer-briefing-data__wide"><dt>Direção de curadoria</dt><dd>{curationContext.join(' · ')}</dd></div>}<div className="customer-briefing-data__wide"><dt>Contexto da ação</dt><dd>{quote.notes || 'Nenhuma observação adicional foi informada.'}</dd></div></dl></section>
        {quote.proposals.length > 0 && <section className="customer-detail-section" aria-labelledby="quote-proposals-title"><div className="customer-detail-section__heading"><span>03</span><div><h2 id="quote-proposals-title">Propostas</h2><p>Versões disponibilizadas pelo nosso time de especialistas.</p></div></div><div className="customer-proposals">{quote.proposals.map((proposal) => <article key={proposal.id}><Download /><div><strong>{proposal.title}</strong><span>Versão {proposal.version} · publicada em {dateLabel(proposal.publishedAt)}</span>{proposal.validUntil && <small>Válida até {new Intl.DateTimeFormat('pt-BR').format(new Date(`${proposal.validUntil}T12:00:00`))}</small>}</div><button type="button" disabled={downloading === proposal.id} onClick={() => void downloadProposal(proposal)}>{downloading === proposal.id ? 'Abrindo…' : 'Abrir proposta'}</button></article>)}</div>{proposalError && <p className="customer-proposal-error" role="alert">{proposalError}</p>}</section>}
      </div>
      <aside className="customer-timeline" aria-labelledby="quote-timeline-title"><span>ACOMPANHAMENTO</span><h2 id="quote-timeline-title">Linha do tempo</h2>{quote.events.length ? <ol>{quote.events.map((event, index) => <li key={event.id} className={index === 0 ? 'is-current' : ''}><i>{index === 0 ? <Check size={14} /> : null}</i><div><strong>{event.title}</strong><time dateTime={event.createdAt}>{dateLabel(event.createdAt)}</time>{event.description && <p>{event.description}</p>}</div></li>)}</ol> : <div className="customer-timeline__empty"><PackageOpen /><p>Recebemos a solicitação. O próximo andamento aparecerá aqui.</p></div>}</aside>
    </div>
    <section className="customer-repeat-cta"><div className="container"><div><span className="section-kicker">Uma boa escolha pode evoluir</span><h2>Use este briefing como ponto de partida.</h2><p>Itens e quantidades voltam para o moodboard para você revisar antes de enviar uma nova solicitação.</p></div><button className="button button--light button--large" type="button" onClick={repeatQuote}><RefreshCw size={18} /> Solicitar novamente</button></div></section>
    {repeatConfirmationOpen && <div className="customer-confirmation-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setRepeatConfirmationOpen(false); }}><section ref={repeatConfirmationRef} className="customer-confirmation" role="dialog" aria-modal="true" aria-labelledby="replace-saves-title" aria-describedby="replace-saves-description"><span className="section-kicker">SELEÇÃO ATUAL</span><h2 id="replace-saves-title">Trocar seus saves atuais?</h2><p id="replace-saves-description">Você tem {cart.itemCount} {cart.itemCount === 1 ? 'save' : 'saves'} não enviado{cart.itemCount === 1 ? '' : 's'}. Ao continuar, eles serão substituídos pelos {quote.items.length} itens deste orçamento para você revisar.</p><div><button ref={cancelRepeatRef} className="button button--outline" type="button" onClick={() => setRepeatConfirmationOpen(false)}>Manter seleção atual</button><button className="button button--green" type="button" onClick={continueRepeatQuote}>Substituir seleção e continuar <RefreshCw size={17} /></button></div></section></div>}
  </>;
}

export default function CustomerQuotePage() { return <CustomerRoute><QuoteContent /></CustomerRoute>; }
