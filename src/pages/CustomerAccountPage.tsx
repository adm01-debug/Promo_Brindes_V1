import { ArrowRight, CalendarDays, LogOut, PackageOpen, Search, Sparkles } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CustomerRoute } from '../components/CustomerRoute';
import { Seo } from '../components/Seo';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { customerStatusLabel, customerStatusOptions, customerStatusTone, fetchMyQuoteRequests, type CustomerQuotePage, type CustomerQuoteStatus } from '../lib/customerAccount';
import { trackFunnelEvent } from '../lib/analytics';

const PAGE_SIZE = 12;

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(value));
}

function AccountContent() {
  const auth = useCustomerAuth();
  const [params, setParams] = useSearchParams();
  const query = (params.get('q') || '').slice(0, 80);
  const statusValue = params.get('status') || '';
  const status = customerStatusOptions.some((option) => option.value === statusValue) ? statusValue as CustomerQuoteStatus | '' : '';
  const page = Math.max(1, Math.min(1000, Number(params.get('page')) || 1));
  const [search, setSearch] = useState(query);
  const [result, setResult] = useState<CustomerQuotePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => setSearch(query), [query]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    void auth.claimHistory()
      .then(() => fetchMyQuoteRequests({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, status, search: query }))
      .then((data) => { if (active) { setResult(data); trackFunnelEvent('customer_history_viewed', { result_count: data.items.length, has_filter: Boolean(query || status) }); } })
      .catch(() => { if (active) setError('Não conseguimos carregar seus orçamentos agora.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [auth, page, query, retryKey, status]);

  function apply(next: { q?: string; status?: string; page?: number }) {
    const updated = new URLSearchParams(params);
    if (next.q !== undefined) next.q ? updated.set('q', next.q) : updated.delete('q');
    if (next.status !== undefined) next.status ? updated.set('status', next.status) : updated.delete('status');
    if (next.page !== undefined && next.page > 1) updated.set('page', String(next.page)); else updated.delete('page');
    setParams(updated, { replace: true });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    apply({ q: search.trim().slice(0, 80), page: 1 });
  }

  const totalPages = Math.max(1, Math.ceil((result?.total || 0) / PAGE_SIZE));

  return (
    <>
      <Seo title="Meus orçamentos" description="Consulte e reaproveite suas solicitações de orçamento na Área do Cliente Promo Brindes." path="/minha-conta" noIndex />
      <header className="customer-dashboard-hero">
        <div className="container customer-dashboard-hero__inner"><div><span className="section-kicker">Área do Cliente</span><h1>Suas campanhas<br /><em>continuam daqui.</em></h1><p>Consulte briefings enviados, acompanhe o que já está disponível e reutilize boas escolhas.</p></div><div className="customer-dashboard-hero__account"><span>ACESSO VERIFICADO</span><strong>{auth.user?.email}</strong><button type="button" onClick={() => void auth.signOut()}><LogOut size={16} /> Sair</button></div></div>
      </header>
      <section className="customer-dashboard section" aria-labelledby="my-quotes-title">
        <div className="container">
          <div className="customer-dashboard__heading"><div><span className="section-kicker">Histórico</span><h2 id="my-quotes-title">Meus orçamentos</h2></div><Link className="button button--green" to="/catalogo">Criar novo briefing <ArrowRight size={17} /></Link></div>
          <div className="customer-dashboard__filters">
            <form role="search" onSubmit={submit}><label htmlFor="customer-quote-search">Buscar por protocolo, empresa ou produto</label><div><Search size={18} /><input id="customer-quote-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ex.: onboarding ou PB-100" maxLength={80} /><button type="submit">Buscar</button></div></form>
            <div className="form-field"><label htmlFor="customer-status">Status</label><select id="customer-status" value={status} onChange={(event) => apply({ status: event.target.value, page: 1 })}>{customerStatusOptions.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}</select></div>
          </div>
          {loading && <div className="customer-results-state" role="status">Carregando seus orçamentos…</div>}
          {error && <div className="customer-results-state customer-results-state--error" role="alert">{error}<button type="button" onClick={() => setRetryKey((current) => current + 1)}>Tentar novamente</button></div>}
          {!loading && !error && result?.items.length === 0 && <div className="customer-empty"><PackageOpen size={42} /><span>{query || status ? 'NENHUM RESULTADO' : 'PRIMEIRO BRIEFING'}</span><h2>{query || status ? 'Nenhum orçamento combina com estes filtros.' : 'Seu histórico começa com uma boa ideia.'}</h2><p>{query || status ? 'Limpe a busca ou escolha outro status.' : 'Explore o catálogo, salve seus favoritos e envie uma solicitação sem precisar comprar online.'}</p>{query || status ? <button className="button button--dark" type="button" onClick={() => { setSearch(''); setParams({}, { replace: true }); }}>Limpar filtros</button> : <Link className="button button--green" to="/catalogo">Explorar o radar</Link>}</div>}
          {!loading && !error && Boolean(result?.items.length) && <div className="customer-quote-grid">{result?.items.map((quote) => <article className="customer-quote-card" key={quote.id}><div className="customer-quote-card__top"><span className={`customer-status customer-status--${customerStatusTone(quote.status)}`}>{customerStatusLabel(quote.status)}</span><span>#{quote.protocol}</span></div><h2>{quote.company}</h2><p>{quote.productNames.slice(0, 3).join(' · ')}</p><dl><div><dt><CalendarDays size={15} /> Enviado</dt><dd>{dateLabel(quote.createdAt)}</dd></div><div><dt><Sparkles size={15} /> Seleção</dt><dd>{quote.itemCount} {quote.itemCount === 1 ? 'produto' : 'produtos'} · {quote.totalUnits.toLocaleString('pt-BR')} un.</dd></div></dl><Link to={`/minha-conta/orcamentos/${quote.id}`}>Ver solicitação <ArrowRight size={17} /></Link></article>)}</div>}
          {!loading && !error && totalPages > 1 && <nav className="customer-pagination" aria-label="Páginas do histórico"><button type="button" disabled={page <= 1} onClick={() => apply({ page: page - 1 })}>Anterior</button><span>Página {page} de {totalPages}</span><button type="button" disabled={page >= totalPages} onClick={() => apply({ page: page + 1 })}>Próxima</button></nav>}
        </div>
      </section>
    </>
  );
}

export default function CustomerAccountPage() { return <CustomerRoute><AccountContent /></CustomerRoute>; }
