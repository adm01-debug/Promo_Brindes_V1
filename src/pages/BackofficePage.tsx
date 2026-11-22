import { ArrowLeft, ArrowRight, BellRing, Clock, FileText, Mail, PackageOpen, RefreshCw, Search, ShieldAlert, ShieldCheck, Truck, UserRound } from 'lucide-react';
import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CustomerRoute } from '../components/CustomerRoute';
import { Seo } from '../components/Seo';
import {
  SITE_QUOTE_STATUSES,
  SITE_QUOTE_STATUS_LABELS,
  isSiteOperatorError,
  isSiteProposalRejected,
  isSiteQuoteConflict,
  siteOperatorErrorMessage,
  type SiteNotificationDeliveryReport,
  type SiteQuoteDetail,
  type SiteQuoteListPage,
  type SiteQuoteStatus,
} from '../lib/commercialBackofficeContract';
import {
  fetchSiteNotificationDeliveryReport,
  fetchSiteQuoteDetail,
  listSiteQuoteRequests,
  publishSiteQuoteProposal,
  replySiteQuoteAdjustment,
  reprocessSiteNotificationDeliveries,
  updateSiteQuoteStatus,
} from '../lib/commercialBackoffice';

const PAGE_SIZE = 25;

function dateLabel(value: string | null): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(parsed);
}

function dayLabel(value: string | null): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  // `desired_deadline` e `valid_until` sao colunas date: chegam como meia-noite UTC.
  // Sem fixar o fuso, o horario de Brasilia (UTC-3) exibe o dia anterior.
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'UTC' }).format(parsed);
}

/**
 * Os tons existentes no CSS são new/progress/ready/closed. O banco tem seis
 * estados; `triaged` e `in_progress` são ambos "em andamento" do ponto de vista
 * do cliente, e `spam` reaproveita o tom neutro de encerrado.
 */
function statusTone(status: SiteQuoteStatus): 'new' | 'progress' | 'ready' | 'closed' {
  if (status === 'new') return 'new';
  if (status === 'triaged' || status === 'in_progress') return 'progress';
  if (status === 'quoted') return 'ready';
  return 'closed';
}

function validStatus(value: string | null): SiteQuoteStatus | null {
  return value && (SITE_QUOTE_STATUSES as readonly string[]).includes(value) ? (value as SiteQuoteStatus) : null;
}

function BackofficeList({
  page,
  loading,
  error,
  status,
  search,
  searchDraft,
  onSearchDraft,
  onSubmitSearch,
  onStatus,
  onPage,
  onOpen,
  onRetry,
}: {
  page: SiteQuoteListPage | null;
  loading: boolean;
  error: string;
  status: SiteQuoteStatus | null;
  search: string;
  searchDraft: string;
  onSearchDraft: (value: string) => void;
  onSubmitSearch: (event: FormEvent<HTMLFormElement>) => void;
  onStatus: (value: SiteQuoteStatus | null) => void;
  onPage: (offset: number) => void;
  onOpen: (id: string) => void;
  onRetry: () => void;
}) {
  const requests = page?.requests ?? [];
  const total = page?.total ?? 0;
  const offset = page?.offset ?? 0;
  const hasPrevious = offset > 0;
  const hasNext = offset + PAGE_SIZE < total;

  return (
    <>
      <div className="customer-dashboard-hero">
        <span>BACK-OFFICE COMERCIAL</span>
        <h1>Fila de orçamentos</h1>
        <p>
          Acompanhe os pedidos do site, mude o estágio do atendimento e publique a proposta versionada.
          {page?.operator ? ` Operador: ${page.operator}.` : ''}
        </p>
      </div>

      <form className="customer-pagination" onSubmit={onSubmitSearch} role="search">
        <label htmlFor="backoffice-search">Buscar por protocolo, empresa, contato, e-mail ou telefone</label>
        <input
          id="backoffice-search"
          type="search"
          value={searchDraft}
          onChange={(event) => onSearchDraft(event.target.value)}
          maxLength={80}
          placeholder="Ex.: PB26123456 ou Metalúrgica"
        />
        <button type="submit" className="btn btn-outline"><Search aria-hidden="true" size={16} /> Buscar</button>
      </form>

      <div className="customer-data-actions" role="group" aria-label="Filtrar por estágio">
        <button
          type="button"
          className={`btn ${status === null ? 'btn-primary' : 'btn-outline'}`}
          aria-pressed={status === null}
          onClick={() => onStatus(null)}
        >
          Todos
        </button>
        {SITE_QUOTE_STATUSES.map((value) => (
          <button
            key={value}
            type="button"
            className={`btn ${status === value ? 'btn-primary' : 'btn-outline'}`}
            aria-pressed={status === value}
            onClick={() => onStatus(value)}
          >
            {SITE_QUOTE_STATUS_LABELS[value]}
          </button>
        ))}
      </div>

      {error ? (
        <div className="customer-data-error" role="alert">
          <p>{error}</p>
          <button type="button" className="btn btn-outline" onClick={onRetry}>
            <RefreshCw aria-hidden="true" size={16} /> Tentar de novo
          </button>
        </div>
      ) : null}

      {loading ? (
        <p className="customer-data-note" role="status">Carregando a fila…</p>
      ) : requests.length === 0 && !error ? (
        <div className="customer-empty">
          <Mail aria-hidden="true" size={22} />
          <h2>Nenhum pedido {search ? 'para esta busca' : 'neste estágio'}.</h2>
          <p>A fila é alimentada pelos formulários de orçamento do site.</p>
        </div>
      ) : (
        <div className="customer-quote-grid">
          {requests.map((request) => (
            <article key={request.id} className="customer-quote-card">
              <div className="customer-quote-card__top">
                <span className={`customer-status customer-status--${statusTone(request.status)}`}>
                  {SITE_QUOTE_STATUS_LABELS[request.status]}
                </span>
                <span>{request.protocol}</span>
              </div>
              <h2>{request.company}</h2>
              <dl>
                <div><dt><UserRound aria-hidden="true" size={15} /> Contato</dt><dd>{request.contactName}</dd></div>
                <div><dt><Mail aria-hidden="true" size={15} /> E-mail</dt><dd>{request.email}</dd></div>
                <div><dt><PackageOpen aria-hidden="true" size={15} /> Seleção</dt><dd>{request.itemCount} {request.itemCount === 1 ? 'produto' : 'produtos'}</dd></div>
                <div><dt><Clock aria-hidden="true" size={15} /> Recebido</dt><dd>{dateLabel(request.createdAt)}</dd></div>
                {request.desiredDeadline ? <div><dt><Truck aria-hidden="true" size={15} /> Precisa até</dt><dd>{dayLabel(request.desiredDeadline)}</dd></div> : null}
              </dl>
              {request.pendingAdjustments > 0 ? (
                <p className="customer-adjustment">
                  {request.pendingAdjustments} {request.pendingAdjustments === 1 ? 'ajuste aguardando' : 'ajustes aguardando'} resposta
                </p>
              ) : null}
              <button type="button" className="customer-quote-card__open" onClick={() => onOpen(request.id)}>
                Abrir pedido <ArrowRight aria-hidden="true" size={17} />
              </button>
            </article>
          ))}
        </div>
      )}

      {total > 0 ? (
        <nav className="customer-pagination" aria-label="Paginação da fila">
          <button type="button" className="btn btn-outline" disabled={!hasPrevious || loading} onClick={() => onPage(Math.max(offset - PAGE_SIZE, 0))}>
            Anterior
          </button>
          <span role="status">
            {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} de {total}
          </span>
          <button type="button" className="btn btn-outline" disabled={!hasNext || loading} onClick={() => onPage(offset + PAGE_SIZE)}>
            Próxima
          </button>
        </nav>
      ) : null}
    </>
  );
}

function BackofficeQueuePanel({
  report,
  loading,
  error,
  notice,
  busy,
  selected,
  reason,
  onToggle,
  onReason,
  onReprocess,
  onRetry,
}: {
  report: SiteNotificationDeliveryReport | null;
  loading: boolean;
  error: string;
  notice: string;
  busy: boolean;
  selected: string[];
  reason: string;
  onToggle: (deliveryId: string, checked: boolean) => void;
  onReason: (value: string) => void;
  onReprocess: () => void;
  onRetry: () => void;
}) {
  const exhausted = report?.exhausted ?? [];
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  // O motivo tem piso de 3 caracteres no banco: o botão só habilita quando a
  // entrada passaria na RPC, senão o operador descobre o limite por um erro.
  const canReprocess = !busy
    && selected.length > 0
    && selected.length <= 100
    && reason.trim().length >= 3
    && reason.trim().length <= 200;

  return (
    <section className="customer-detail-section" aria-labelledby="backoffice-queue-title">
      <h2 id="backoffice-queue-title">
        <BellRing aria-hidden="true" size={18} /> Fila de notificações
      </h2>
      <p className="customer-data-note">
        Entregas que esgotaram as tentativas ficam aqui até alguém reprocessar com um motivo registrado.
        O e-mail aparece só como prefixo do hash — o endereço completo nunca sai do banco.
      </p>

      {error ? (
        <div className="customer-data-error" role="alert">
          <p>{error}</p>
          <button type="button" className="btn btn-outline" onClick={onRetry}>
            <RefreshCw aria-hidden="true" size={16} /> Tentar de novo
          </button>
        </div>
      ) : null}

      {notice ? <p className="customer-data-note" role="status">{notice}</p> : null}

      {report ? (
        <>
          <dl className="customer-data-counts">
            <div><dt>Esgotadas</dt><dd>{exhausted.length}</dd></div>
            <div><dt>Eventos órfãos</dt><dd>{report.orphanEventCount}</dd></div>
            <div><dt>Órfãos reconciliáveis</dt><dd>{report.reconcilableOrphanCount}</dd></div>
          </dl>
          {report.orphanEventOldestAt ? (
            <p className="customer-data-note">
              Evento órfão mais antigo: {dateLabel(report.orphanEventOldestAt)}. Os reconciliáveis são
              religados automaticamente pelo cron de retenção; os demais são purgados após o prazo.
            </p>
          ) : null}
        </>
      ) : null}

      {loading ? (
        <p className="customer-data-note" role="status">Carregando a fila de notificações…</p>
      ) : exhausted.length === 0 && !error ? (
        <p className="customer-data-note">
          <ShieldCheck aria-hidden="true" size={16} /> Nenhuma entrega esgotada: toda notificação
          agendada ainda tem tentativa disponível ou já foi confirmada pelo provedor.
        </p>
      ) : (
        <>
          <ul className="customer-proposals">
            {exhausted.map((delivery) => (
              <li key={delivery.deliveryId}>
                <label htmlFor={`delivery-${delivery.deliveryId}`}>
                  <input
                    id={`delivery-${delivery.deliveryId}`}
                    type="checkbox"
                    checked={selectedSet.has(delivery.deliveryId)}
                    onChange={(event) => onToggle(delivery.deliveryId, event.target.checked)}
                  />{' '}
                  {delivery.protocol || delivery.requestId} · {delivery.channel} ·{' '}
                  {delivery.attempts} {delivery.attempts === 1 ? 'tentativa' : 'tentativas'}
                  {delivery.erased ? (
                    <> · <ShieldAlert aria-hidden="true" size={14} /> pedido excluído pelo titular</>
                  ) : delivery.suppressed ? (
                    <> · <ShieldAlert aria-hidden="true" size={14} /> endereço suprimido</>
                  ) : null}
                  {' '}· hash {delivery.emailHashPrefix || '—'} · {delivery.lastErrorCode || 'sem código'} ·{' '}
                  {dateLabel(delivery.lastErrorAt ?? delivery.updatedAt)}
                </label>
              </li>
            ))}
          </ul>

          <div className="customer-password">
            <label htmlFor="backoffice-reprocess-reason">Motivo do reprocessamento</label>
            <input
              id="backoffice-reprocess-reason"
              type="text"
              value={reason}
              onChange={(event) => onReason(event.target.value)}
              minLength={3}
              maxLength={200}
              placeholder="Ex.: provedor restabelecido após incidente de 12/11"
            />
            <button type="button" className="btn btn-primary" disabled={!canReprocess} onClick={onReprocess}>
              <RefreshCw aria-hidden="true" size={16} /> Reprocessar {selected.length > 0 ? `(${selected.length})` : ''}
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function BackofficeDetail({
  detail,
  loading,
  error,
  busy,
  notice,
  formError,
  onBack,
  onStatus,
  onReply,
  onPublish,
  onRetry,
}: {
  detail: SiteQuoteDetail | null;
  loading: boolean;
  error: string;
  busy: boolean;
  notice: string;
  formError: string;
  onBack: () => void;
  onStatus: (value: SiteQuoteStatus) => void;
  onReply: (adjustmentId: string, response: string) => void;
  onPublish: (input: { title: string; storagePath: string; validUntil: string | null }) => void;
  onRetry: () => void;
}) {
  const [proposalTitle, setProposalTitle] = useState('');
  const [proposalPath, setProposalPath] = useState('');
  const [proposalValidUntil, setProposalValidUntil] = useState('');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!detail) return;
    setProposalTitle(`Proposta ${detail.protocol}`);
    setProposalPath('');
    setProposalValidUntil('');
    setReplyDrafts({});
  }, [detail]);

  if (loading) return <p className="customer-data-note" role="status">Carregando o pedido…</p>;

  if (error) {
    return (
      <div className="customer-data-error" role="alert">
        <p>{error}</p>
        <button type="button" className="btn btn-outline" onClick={onRetry}><RefreshCw aria-hidden="true" size={16} /> Tentar de novo</button>
        <button type="button" className="btn btn-outline" onClick={onBack}>Voltar para a fila</button>
      </div>
    );
  }

  if (!detail) return null;

  return (
    <>
      <button type="button" className="btn btn-outline" onClick={onBack}>
        <ArrowLeft aria-hidden="true" size={16} /> Voltar para a fila
      </button>

      <div className="customer-dashboard-hero">
        <span>{detail.protocol}</span>
        <h1>{detail.company}</h1>
        <p>{detail.contactName} · {detail.email} · {detail.phone}</p>
      </div>

      {notice ? <p className="customer-data-note" role="status">{notice}</p> : null}

      <section className="customer-detail-section" aria-labelledby="backoffice-status">
        <h2 id="backoffice-status">Estágio do atendimento</h2>
        <p className="customer-data-note">
          Estágio atual: <strong>{SITE_QUOTE_STATUS_LABELS[detail.status]}</strong>.
          As opções abaixo vêm da máquina de estados do banco — o que não aparece aqui seria recusado pelo servidor.
        </p>
        {detail.allowedStatuses.length === 0 ? (
          <p className="customer-data-note">Este estágio é final: nenhuma mudança é possível.</p>
        ) : (
          <div className="customer-data-actions" role="group" aria-label="Mudar estágio">
            {detail.allowedStatuses.map((value) => (
              <button
                key={value}
                type="button"
                className="btn btn-outline"
                disabled={busy}
                onClick={() => onStatus(value)}
              >
                {SITE_QUOTE_STATUS_LABELS[value]}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="customer-detail-section" aria-labelledby="backoffice-items">
        <h2 id="backoffice-items">Itens solicitados</h2>
        <div className="customer-detail-items">
          {detail.items.length === 0 ? <p>Nenhum item registrado.</p> : (
            <ul>
              {detail.items.map((item) => (
                <li key={item.key}>
                  {item.name} · SKU {item.sku} · {item.quantity} un.
                  {item.colorName ? ` · ${item.colorName}` : ''}
                </li>
              ))}
            </ul>
          )}
        </div>
        {detail.notes ? (
          <div className="customer-briefing-data">
            <h3>Observação do cliente</h3>
            <p>{detail.notes}</p>
          </div>
        ) : null}
      </section>

      <section className="customer-detail-section" aria-labelledby="backoffice-proposals">
        <h2 id="backoffice-proposals">Propostas</h2>
        {detail.proposals.length === 0 ? <p className="customer-data-note">Nenhuma proposta publicada ainda.</p> : (
          <ul className="customer-proposals">
            {detail.proposals.map((proposal) => (
              <li key={proposal.id}>
                <FileText aria-hidden="true" size={16} />
                v{proposal.version} — {proposal.title}
                {proposal.isCurrent ? ' (vigente)' : ' (histórica)'}
                {proposal.validUntil ? ` · válida até ${dayLabel(proposal.validUntil)}` : ''}
              </li>
            ))}
          </ul>
        )}

        {detail.status === 'in_progress' ? (
          <form
            className="customer-password"
            onSubmit={(event) => {
              event.preventDefault();
              onPublish({
                title: proposalTitle,
                storagePath: proposalPath,
                validUntil: proposalValidUntil || null,
              });
            }}
          >
            {formError ? (
              <p className="customer-data-error" role="alert">{formError}</p>
            ) : null}
            <h3>Publicar nova versão</h3>
            <p className="customer-data-note">
              O PDF precisa já estar no bucket privado <code>customer-proposals</code>. O caminho é relativo à raiz do bucket.
            </p>
            <label htmlFor="proposal-title">Título da proposta</label>
            <input id="proposal-title" value={proposalTitle} onChange={(event) => setProposalTitle(event.target.value)} maxLength={160} required />
            <label htmlFor="proposal-path">Caminho do PDF no bucket</label>
            <input id="proposal-path" value={proposalPath} onChange={(event) => setProposalPath(event.target.value)} maxLength={500} required placeholder="00000000/proposta-v1.pdf" />
            <label htmlFor="proposal-valid">Válida até (opcional)</label>
            <input id="proposal-valid" type="date" value={proposalValidUntil} onChange={(event) => setProposalValidUntil(event.target.value)} />
            <button type="submit" className="btn btn-primary" disabled={busy}>Publicar proposta</button>
          </form>
        ) : (
          <p className="customer-data-note">
            Para publicar uma proposta o pedido precisa estar em <strong>Em curadoria</strong>.
          </p>
        )}
      </section>

      {detail.adjustments.length > 0 ? (
        <section className="customer-detail-section" aria-labelledby="backoffice-adjustments">
          <h2 id="backoffice-adjustments">Ajustes pedidos pelo cliente</h2>
          <ul className="customer-proposals">
            {detail.adjustments.map((adjustment) => (
              <li key={adjustment.id}>
                <div>
                  <strong>{adjustment.status}</strong> · {dateLabel(adjustment.createdAt)}
                  <p>{adjustment.message}</p>
                  {adjustment.status === 'new' || adjustment.status === 'triaged' ? (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        onReply(adjustment.id, replyDrafts[adjustment.id] ?? '');
                      }}
                    >
                      <label htmlFor={`reply-${adjustment.id}`}>Resposta ao cliente</label>
                      <input
                        id={`reply-${adjustment.id}`}
                        value={replyDrafts[adjustment.id] ?? ''}
                        onChange={(event) => setReplyDrafts((draft) => ({ ...draft, [adjustment.id]: event.target.value }))}
                        maxLength={500}
                        required
                      />
                      <button type="submit" className="btn btn-outline" disabled={busy}>Registrar resposta</button>
                    </form>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="customer-detail-section" aria-labelledby="backoffice-timeline">
        <h2 id="backoffice-timeline">Linha do tempo</h2>
        <ul className="customer-proposals">
          {detail.events.map((event) => (
            <li key={event.id}>
              <Clock aria-hidden="true" size={15} />
              {dateLabel(event.createdAt)} · {event.title}
              {event.audience === 'internal' ? ' (interno)' : ''}
            </li>
          ))}
        </ul>
      </section>

      {detail.audit.length > 0 ? (
        <section className="customer-detail-section" aria-labelledby="backoffice-audit">
          <h2 id="backoffice-audit">Auditoria do back-office</h2>
          <ul className="customer-proposals">
            {detail.audit.map((entry, index) => (
              <li key={`${entry.createdAt}-${index}`}>
                <ShieldCheck aria-hidden="true" size={15} />
                {dateLabel(entry.createdAt)} · {entry.action} por {entry.actorLabel}
                {typeof entry.detail.response === 'string' ? (
                  <p>Resposta registrada: {entry.detail.response}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

function BackofficeContent() {
  const [params, setParams] = useSearchParams();
  const status = validStatus(params.get('status'));
  const search = (params.get('q') || '').slice(0, 80);
  const requestId = params.get('pedido');
  const offset = Math.max(Number(params.get('pagina')) || 0, 0);

  const [searchDraft, setSearchDraft] = useState(search);
  const [page, setPage] = useState<SiteQuoteListPage | null>(null);
  const [detail, setDetail] = useState<SiteQuoteDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(Boolean(requestId));
  const [listError, setListError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [operatorError, setOperatorError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  // Erro do formulario de publicacao fica separado do erro de carga do detalhe:
  // um caminho recusado nao pode derrubar o pedido da tela e obrigar o operador
  // a redigitar titulo, caminho e validade.
  const [formError, setFormError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const [report, setReport] = useState<SiteNotificationDeliveryReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(true);
  const [reportError, setReportError] = useState('');
  const [reportNotice, setReportNotice] = useState('');
  const [reportBusy, setReportBusy] = useState(false);
  const [selectedDeliveries, setSelectedDeliveries] = useState<string[]>([]);
  const [reprocessReason, setReprocessReason] = useState('');
  const [reportKey, setReportKey] = useState(0);

  useEffect(() => setSearchDraft(search), [search]);

  const patchParams = useCallback((changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === '') next.delete(key); else next.set(key, value);
    }
    setParams(next, { replace: true });
  }, [params, setParams]);

  useEffect(() => {
    if (requestId) return;
    let active = true;
    setLoadingList(true);
    setListError('');
    listSiteQuoteRequests({ status, search, limit: PAGE_SIZE, offset })
      .then((result) => { if (active) setPage(result); })
      .catch((cause) => {
        if (!active) return;
        if (isSiteOperatorError(cause)) setOperatorError(true);
        else setListError(siteOperatorErrorMessage(cause));
      })
      .finally(() => { if (active) setLoadingList(false); });
    return () => { active = false; };
  }, [requestId, status, search, offset, retryKey]);

  // O rascunho de publicacao pertence a um orcamento especifico: trocar de pedido
  // nao pode herdar a recusa do anterior no formulario novo.
  useEffect(() => { setFormError(''); }, [requestId]);

  useEffect(() => {
    if (!requestId) { setDetail(null); setDetailError(''); return; }
    let active = true;
    setLoadingDetail(true);
    setDetailError('');
    fetchSiteQuoteDetail(requestId)
      .then((result) => { if (active) setDetail(result); })
      .catch((cause) => {
        if (!active) return;
        if (isSiteOperatorError(cause)) setOperatorError(true);
        else setDetailError(siteOperatorErrorMessage(cause));
      })
      .finally(() => { if (active) setLoadingDetail(false); });
    return () => { active = false; };
  }, [requestId, retryKey]);

  const reloadDetail = useCallback(() => setRetryKey((key) => key + 1), []);

  // A fila de notificações só importa na lista (o detalhe ocupa a tela inteira),
  // mas a carga é feita sempre que o operador volta para a lista — reprocessar
  // muda os contadores, então o painel precisa refletir o estado do banco.
  useEffect(() => {
    if (requestId) return;
    let active = true;
    setLoadingReport(true);
    setReportError('');
    fetchSiteNotificationDeliveryReport(50)
      .then((result) => {
        if (!active) return;
        setReport(result);
        setSelectedDeliveries((current) => current.filter((id) => result.exhausted.some((item) => item.deliveryId === id)));
      })
      .catch((cause) => {
        if (!active) return;
        if (isSiteOperatorError(cause)) setOperatorError(true);
        else setReportError(siteOperatorErrorMessage(cause));
      })
      .finally(() => { if (active) setLoadingReport(false); });
    return () => { active = false; };
  }, [requestId, reportKey]);

  const toggleDelivery = useCallback((deliveryId: string, checked: boolean) => {
    setSelectedDeliveries((current) => {
      if (checked) return current.includes(deliveryId) ? current : [...current, deliveryId];
      return current.filter((id) => id !== deliveryId);
    });
  }, []);

  const handleReprocess = useCallback(async () => {
    setReportBusy(true);
    setReportNotice('');
    setReportError('');
    try {
      const result = await reprocessSiteNotificationDeliveries(selectedDeliveries, reprocessReason);
      const skippedNote = result.skipped.length > 0
        ? ` ${result.skipped.length} ignorada(s): já não estavam esgotadas ou estavam em uso.`
        : '';
      setReportNotice(
        `${result.reopened} ${result.reopened === 1 ? 'entrega voltou' : 'entregas voltaram'} para a fila com o motivo registrado na auditoria.${skippedNote}`,
      );
      setSelectedDeliveries([]);
      setReprocessReason('');
      setReportKey((key) => key + 1);
    } catch (cause) {
      if (isSiteOperatorError(cause)) setOperatorError(true);
      else setReportError(siteOperatorErrorMessage(cause));
    } finally {
      setReportBusy(false);
    }
  }, [selectedDeliveries, reprocessReason]);

  const handleStatus = useCallback(async (value: SiteQuoteStatus) => {
    if (!requestId) return;
    setBusy(true);
    setNotice('');
    try {
      await updateSiteQuoteStatus(requestId, value);
      setNotice(`Estágio alterado para ${SITE_QUOTE_STATUS_LABELS[value]}.`);
      setRetryKey((key) => key + 1);
    } catch (cause) {
      if (isSiteOperatorError(cause)) setOperatorError(true);
      else setDetailError(siteOperatorErrorMessage(cause));
      // Conflito de concorrência: recarrega o estado real em vez de deixar a aba
      // mostrando um estagio que nao existe mais no banco.
      if (isSiteQuoteConflict(cause)) setRetryKey((key) => key + 1);
    } finally {
      setBusy(false);
    }
  }, [requestId]);

  const handleReply = useCallback(async (adjustmentId: string, response: string) => {
    if (!requestId) return;
    setBusy(true);
    setNotice('');
    try {
      await replySiteQuoteAdjustment(adjustmentId, response);
      setNotice('Resposta registrada no ajuste.');
      setRetryKey((key) => key + 1);
    } catch (cause) {
      if (isSiteOperatorError(cause)) setOperatorError(true);
      else setDetailError(siteOperatorErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }, [requestId]);

  const handlePublish = useCallback(async (input: { title: string; storagePath: string; validUntil: string | null }) => {
    if (!requestId) return;
    setBusy(true);
    setNotice('');
    setFormError('');
    try {
      const publication = await publishSiteQuoteProposal({ requestId, ...input });
      setNotice(`Proposta v${publication.version} publicada. O pedido passou para ${SITE_QUOTE_STATUS_LABELS[publication.status].toLowerCase()}.`);
      setRetryKey((key) => key + 1);
    } catch (cause) {
      if (isSiteOperatorError(cause)) setOperatorError(true);
      else if (isSiteProposalRejected(cause)) setFormError(siteOperatorErrorMessage(cause));
      else setDetailError(siteOperatorErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }, [requestId]);

  const operatorBlocked = useMemo(() => operatorError, [operatorError]);

  if (operatorBlocked) {
    return (
      <div className="customer-state container">
        <span>BACK-OFFICE COMERCIAL</span>
        <h1>Acesso restrito.</h1>
        <p>
          Sua conta está autenticada, mas não está na lista de operadores do comercial. Peça a um
          administrador para incluir seu usuário em <code>commercial_operators</code>.
        </p>
        <Link to="/" className="btn btn-outline">Voltar ao site</Link>
      </div>
    );
  }

  return (
    <section className="container customer-dashboard">
      <Seo title="Back-office comercial" path="/admin/orcamentos" noIndex />
      {requestId ? (
        <BackofficeDetail
          detail={detail}
          loading={loadingDetail}
          error={detailError}
          busy={busy}
          notice={notice}
          formError={formError}
          onBack={() => patchParams({ pedido: null })}
          onStatus={(value) => { void handleStatus(value); }}
          onReply={(adjustmentId, response) => { void handleReply(adjustmentId, response); }}
          onPublish={(input) => { void handlePublish(input); }}
          onRetry={reloadDetail}
        />
      ) : (
        <>
          <BackofficeList
            page={page}
            loading={loadingList}
            error={listError}
            status={status}
            search={search}
            searchDraft={searchDraft}
            onSearchDraft={setSearchDraft}
            onSubmitSearch={(event) => {
              event.preventDefault();
              patchParams({ q: searchDraft.trim() || null, pagina: null });
            }}
            onStatus={(value) => patchParams({ status: value, pagina: null })}
            onPage={(value) => patchParams({ pagina: value > 0 ? String(value) : null })}
            onOpen={(id) => patchParams({ pedido: id })}
            onRetry={() => setRetryKey((key) => key + 1)}
          />
          <BackofficeQueuePanel
            report={report}
            loading={loadingReport}
            error={reportError}
            notice={reportNotice}
            busy={reportBusy}
            selected={selectedDeliveries}
            reason={reprocessReason}
            onToggle={toggleDelivery}
            onReason={setReprocessReason}
            onReprocess={() => { void handleReprocess(); }}
            onRetry={() => setReportKey((key) => key + 1)}
          />
        </>
      )}
    </section>
  );
}

export default function BackofficePage() {
  return (
    <CustomerRoute>
      <BackofficeContent />
    </CustomerRoute>
  );
}