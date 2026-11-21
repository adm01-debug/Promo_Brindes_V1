import { ArrowRight, CalendarDays, FileDown, LogOut, PackageOpen, Search, ShieldCheck, Sparkles, UserPen, UserX } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CustomerRoute } from '../components/CustomerRoute';
import { SavedSelections } from '../components/SavedSelections';
import { Seo } from '../components/Seo';
import { useCustomerAuth } from '../context/customerAuth';
import { correctMyData, customerStatusLabel, customerStatusOptions, customerStatusTone, deleteMyData, downloadMyData, fetchMyDataAccess, fetchMyQuoteRequests, normalizeCustomerHistoryPage, type CustomerAccessReport, type CustomerQuotePage, type CustomerQuoteStatus } from '../lib/customerAccount';
import { trackFunnelEvent } from '../lib/analytics';
import { replaceBrokenProductImage } from '../lib/images';

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
  const page = normalizeCustomerHistoryPage(params.get('page'));
  const [search, setSearch] = useState(query);
  const [result, setResult] = useState<CustomerQuotePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => setSearch(query), [query]);
  // A URL é uma interface compartilhável: valores fracionários, negativos e
  // "page=1" não ficam visíveis como se fossem páginas válidas.
  useEffect(() => {
    const raw = params.get('page');
    const canonical = page > 1 ? String(page) : null;
    if (raw === canonical) return;
    const updated = new URLSearchParams(params);
    if (canonical) updated.set('page', canonical); else updated.delete('page');
    setParams(updated, { replace: true });
  }, [page, params, setParams]);
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

  useEffect(() => {
    if (loading || !result || page <= totalPages) return;
    const updated = new URLSearchParams(params);
    if (totalPages > 1) updated.set('page', String(totalPages));
    else updated.delete('page');
    setParams(updated, { replace: true });
  }, [loading, page, params, result, setParams, totalPages]);

  return (
    <>
      <Seo title="Meus orçamentos" description="Consulte e reaproveite suas solicitações de orçamento na Área do Cliente Promo Brindes." path="/minha-conta" noIndex />
      <header className="customer-dashboard-hero">
        <div className="container customer-dashboard-hero__inner"><div><span className="section-kicker">Área do Cliente</span><h1>Suas campanhas<br /><em>continuam daqui.</em></h1><p>Consulte briefings enviados, acompanhe o que já está disponível e reutilize boas escolhas.</p></div><div className="customer-dashboard-hero__account"><span>ACESSO VERIFICADO</span><strong>{auth.user?.email}</strong><button type="button" onClick={() => void auth.signOut()}><LogOut size={16} /> Sair</button></div></div>
      </header>
      <SavedSelections key={`${auth.user?.id || ''}:${auth.identityEpoch}`} />
      <CustomerDataSection key={`${auth.user?.id || ''}:${auth.identityEpoch}`} />
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
          {!loading && !error && Boolean(result?.items.length) && <div className="customer-quote-grid">{result?.items.map((quote) => <article className="customer-quote-card" key={quote.id}><div className="customer-quote-card__top"><span className={`customer-status customer-status--${customerStatusTone(quote.status)}`}>{customerStatusLabel(quote.status)}</span><span>#{quote.protocol}</span></div>{Boolean(quote.productImages?.length) && <div className="customer-quote-card__images" aria-label="Produtos da seleção">{quote.productImages?.slice(0, 3).map((image, index) => <img src={image} alt="" key={`${image}-${index}`} width="54" height="54" loading="lazy" referrerPolicy="no-referrer" onError={replaceBrokenProductImage} />)}</div>}<h2>{quote.actionName || quote.company}</h2><p>{quote.actionName ? `${quote.company} · ${quote.productNames.slice(0, 2).join(' · ')}` : quote.productNames.slice(0, 3).join(' · ')}</p><dl><div><dt><CalendarDays size={15} /> Enviado</dt><dd>{dateLabel(quote.createdAt)}</dd></div><div><dt><Sparkles size={15} /> Última atualização</dt><dd>{dateLabel(quote.lastMovementAt || quote.createdAt)}</dd></div><div><dt><Sparkles size={15} /> Seleção</dt><dd>{quote.itemCount} {quote.itemCount === 1 ? 'produto' : 'produtos'} · {quote.totalUnits.toLocaleString('pt-BR')} un.</dd></div></dl><Link to={`/minha-conta/orcamentos/${quote.id}`}>Ver solicitação <ArrowRight size={17} /></Link></article>)}</div>}
          {!loading && !error && totalPages > 1 && <nav className="customer-pagination" aria-label="Páginas do histórico"><button type="button" disabled={page <= 1} onClick={() => apply({ page: page - 1 })}>Anterior</button><span>Página {page} de {totalPages}</span><button type="button" disabled={page >= totalPages} onClick={() => apply({ page: page + 1 })}>Próxima</button></nav>}
        </div>
      </section>
    </>
  );
}

function CustomerDataSection() {
  const auth = useCustomerAuth();
  const [access, setAccess] = useState<CustomerAccessReport | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [company, setCompany] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState('');
  const [deleted, setDeleted] = useState(false);
  const [loadKey, setLoadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setError('');
    void fetchMyDataAccess()
      .then((report) => {
        if (!active) return;
        setAccess(report);
        setDisplayName(report.profile.displayName || '');
        setCompany(report.profile.company || '');
      })
      .catch(() => { if (active) setError('Não conseguimos carregar seus dados agora.'); });
    return () => { active = false; };
  }, [loadKey, auth.user?.id]);

  function run(action: () => Promise<void>, success: string) {
    setBusy(true);
    setError('');
    setNotice('');
    void action()
      .then(() => { setNotice(success); setLoadKey((key) => key + 1); })
      .catch((failure: unknown) => {
        const message = failure instanceof Error ? failure.message : '';
        if (message === 'invalid_profile_fields') setError('Confira os campos: nome de 2 a 100 caracteres e empresa de 2 a 150.');
        else if (message === 'invalid_email_confirmation') setError('Digite o e-mail da conta exatamente como exibido para confirmar a exclusão.');
        else setError('Não conseguimos concluir esta ação agora.');
      })
      .finally(() => setBusy(false));
  }

  if (deleted) {
    return (
      <section className="customer-dashboard section" aria-labelledby="customer-data-title">
        <div className="container">
          <div className="customer-data-card">
            <ShieldCheck size={34} aria-hidden="true" />
            <h2 id="customer-data-title">Conta encerrada</h2>
            <p>Seus dados foram apagados e esta conta foi encerrada. Obrigado por usar a Promo Brindes.</p>
            <Link to="/privacidade">Saiba mais sobre seus direitos na Área do Cliente</Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="customer-dashboard section" aria-labelledby="customer-data-title">
      <div className="container">
        <div className="customer-dashboard__heading"><div><span className="section-kicker">LGPD · Art. 18</span><h2 id="customer-data-title">Meus dados e direitos</h2><p>Veja o que guardamos, exporte, corrija ou encerre sua conta a qualquer momento.</p></div></div>

        {error && <div className="customer-results-state customer-results-state--error" role="alert">{error}</div>}
        {notice && <p className="customer-data-note" role="status">{notice}</p>}

        <div className="customer-data-grid">
          <article className="customer-data-card">
            <h3><ShieldCheck size={20} aria-hidden="true" /> Acesso aos dados</h3>
            <p>Resumo do que sua conta registra para atendimento do seu pedido.</p>
            {access ? <dl className="customer-data-counts"><div><dt>Orçamentos</dt><dd>{access.counts.quotes}</dd></div><div><dt>Seleções salvas</dt><dd>{access.counts.selections}</dd></div><div><dt>Favoritos</dt><dd>{access.counts.favorites}</dd></div><div><dt>Contatos</dt><dd>{access.counts.contacts}</dd></div></dl> : <p role="status">Carregando…</p>}
          </article>

          <article className="customer-data-card">
            <h3><FileDown size={20} aria-hidden="true" /> Exportar meus dados</h3>
            <p>Baixe um arquivo em formato aberto (JSON) com os registros vinculados a esta conta.</p>
            <button className="button button--green" type="button" disabled={busy} onClick={() => run(downloadMyData, 'Exportação iniciada. Confira o arquivo baixado.')}><FileDown size={17} /> Baixar meus dados</button>
          </article>

          <article className="customer-data-card">
            <h3><UserPen size={20} aria-hidden="true" /> Corrigir perfil</h3>
            <form onSubmit={(event) => { event.preventDefault(); void run(async () => { await correctMyData(displayName, company); }, 'Perfil atualizado.'); }}>
              <div className="form-field"><label htmlFor="customer-data-name">Nome (2–100 caracteres)</label><input id="customer-data-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={100} disabled={busy} /></div>
              <div className="form-field"><label htmlFor="customer-data-company">Empresa (2–150 caracteres)</label><input id="customer-data-company" value={company} onChange={(event) => setCompany(event.target.value)} maxLength={150} disabled={busy} /></div>
              <button className="button button--dark" type="submit" disabled={busy}>Salvar correção</button>
            </form>
          </article>

          <article className="customer-data-card customer-data-card--danger">
            <h3><UserX size={20} aria-hidden="true" /> Encerrar conta e apagar dados</h3>
            <p>Ao confirmar, seus orçamentos são anonimizados, arquivos e seleções são removidos e esta conta é encerrada. Não há como desfazer.</p>
            {confirmingDelete
              ? <form onSubmit={(event) => { event.preventDefault(); void run(async () => { await deleteMyData(deleteEmail); setDeleted(true); }, ''); }}>
                  <div className="form-field"><label htmlFor="customer-data-delete-email">Digite <strong>{auth.user?.email}</strong> para confirmar</label><input id="customer-data-delete-email" value={deleteEmail} onChange={(event) => setDeleteEmail(event.target.value)} autoComplete="off" disabled={busy} /></div>
                  <div className="customer-data-actions"><button className="button button--dark" type="submit" disabled={busy || deleteEmail.trim() !== (auth.user?.email || '')}>Confirmar exclusão</button><button className="button" type="button" disabled={busy} onClick={() => { setConfirmingDelete(false); setDeleteEmail(''); }}>Cancelar</button></div>
                </form>
              : <button className="button button--dark" type="button" disabled={busy} onClick={() => setConfirmingDelete(true)}>Excluir minha conta</button>}
          </article>
        </div>
      </div>
    </section>
  );
}

export default function CustomerAccountPage() { return <CustomerRoute><AccountContent /></CustomerRoute>; }
