import { ArrowRight, BellRing, Bookmark, BookmarkCheck, CalendarDays, Check, Clock3, Download, Gift, Grid3X3, HeartHandshake, Lightbulb, List, Search, Share2, Sparkles, Users, X } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Seo } from '../components/Seo';
import { trackFunnelEvent } from '../lib/analytics';
import { occasionCatalogUrl } from '../lib/campaignBrief';
import {
  filterOccasions,
  monthNames,
  nextOccasion,
  occasionAudienceOptions,
  occasionCalendarFile,
  occasionsForYear,
  planningDate,
  prioritizeUpcomingOccasions,
  toDateKey,
  type DatedOccasion,
  type OccasionAudience,
  type OccasionKind,
} from '../lib/commemorativeDates';

type CalendarView = 'list' | 'calendar';
type ShareState = 'idle' | 'copied' | 'shared' | 'error';

const FAVORITES_KEY = 'promo-brindes:occasion-favorites:v1';
const kindLabels: Record<OccasionKind, string> = { relacionamento: 'Relacionamento', cultura: 'Pessoas & cultura', impacto: 'Causas & impacto', sazonal: 'Sazonal' };
const audienceLabels: Record<OccasionAudience, string> = { clientes: 'Clientes & parceiros', colaboradores: 'Colaboradores', eventos: 'Eventos & comunidades', comunidade: 'Causas & impacto' };

function utcToday(now = new Date()) {
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function formatDate(date: Date, options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'long' }) {
  return new Intl.DateTimeFormat('pt-BR', { ...options, timeZone: 'UTC' }).format(date);
}

function proximityLabel(date: Date) {
  const days = Math.round((date.getTime() - utcToday().getTime()) / 86_400_000);
  if (days === 0) return 'É hoje';
  if (days === 1) return 'É amanhã';
  if (days > 1) return `Faltam ${days} dias`;
  return 'Data realizada neste ano';
}

function planningLabel(occasion: DatedOccasion) {
  const start = planningDate(occasion);
  const today = utcToday();
  if (occasion.date < today) return 'Planeje a próxima edição';
  if (start <= today) return 'Consulte a viabilidade agora';
  return `Comece até ${formatDate(start)}`;
}

function loadFavorites() {
  if (typeof window === 'undefined') return new Set<string>();
  try {
    const value = JSON.parse(window.localStorage.getItem(FAVORITES_KEY) || '[]') as unknown;
    return new Set(Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []);
  } catch {
    return new Set<string>();
  }
}

function downloadCalendar(occasion: DatedOccasion, planning: boolean) {
  const pageUrl = `${window.location.origin}/datas-comemorativas?ano=${occasion.date.getUTCFullYear()}&data=${encodeURIComponent(occasion.id)}`;
  const blob = new Blob([occasionCalendarFile(occasion, pageUrl, planning)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${planning ? 'planejar-' : ''}${occasion.id}-${occasion.date.getUTCFullYear()}.ics`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function CalendarGrid({ year, month, occasions, onOpen }: { year: number; month: number; occasions: DatedOccasion[]; onOpen: (occasion: DatedOccasion) => void }) {
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const dayCount = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const weeks = Math.ceil((firstWeekday + dayCount) / 7) * 7;
  const todayKey = toDateKey(utcToday());
  const byDay = new Map<number, DatedOccasion[]>();
  occasions.forEach((occasion) => {
    const day = occasion.date.getUTCDate();
    byDay.set(day, [...(byDay.get(day) || []), occasion]);
  });

  return (
    <div className="dates-calendar" aria-label={`${monthNames[month]} de ${year}`}>
      <div className="dates-calendar__weekdays" aria-hidden="true">{['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => <span key={day}>{day}</span>)}</div>
      <div className="dates-calendar__days">
        {Array.from({ length: weeks }, (_, index) => {
          const day = index - firstWeekday + 1;
          if (day < 1 || day > dayCount) return <span className="dates-calendar__blank" aria-hidden="true" key={`blank-${index}`} />;
          const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const events = byDay.get(day) || [];
          return (
            <div className={`dates-calendar__day ${dateKey === todayKey ? 'is-today' : ''} ${events.length ? 'has-events' : ''}`} key={dateKey}>
              <span className="dates-calendar__number">{day}</span>
              {events.map((occasion) => <button key={occasion.id} type="button" className={`is-${occasion.kind}`} onClick={() => onOpen(occasion)}>{occasion.name}</button>)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OccasionCard({ occasion, favorite, onFavorite, onOpen }: { occasion: DatedOccasion; favorite: boolean; onFavorite: () => void; onOpen: () => void }) {
  return (
    <article className={`commemorative-card commemorative-card--${occasion.kind}`}>
      <div className="commemorative-card__date"><strong>{String(occasion.date.getUTCDate()).padStart(2, '0')}</strong><span>{(monthNames[occasion.date.getUTCMonth()] || '').slice(0, 3)}</span></div>
      <div className="commemorative-card__content">
        <div className="commemorative-card__meta"><span>{kindLabels[occasion.kind]}</span><span><Clock3 size={14} /> {planningLabel(occasion)}</span></div>
        <h2>{occasion.name}</h2>
        <p>{occasion.description}</p>
        <blockquote>“{occasion.concept}”</blockquote>
        <div className="commemorative-card__actions">
          <button type="button" className="commemorative-card__open" onClick={onOpen}>Ver ideias <ArrowRight size={17} /></button>
          <button type="button" className={`commemorative-card__favorite ${favorite ? 'is-active' : ''}`} onClick={onFavorite} aria-pressed={favorite} aria-label={`${favorite ? 'Remover' : 'Salvar'} ${occasion.name} em Minhas datas`}>{favorite ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}{favorite ? 'Salva' : 'Salvar'}</button>
        </div>
      </div>
    </article>
  );
}

export default function CommemorativeDatesPage() {
  const now = new Date();
  // Chave estável de granularidade diária: prioritizeUpcomingOccasions e
  // nextOccasion truncam `now` para o dia internamente, então esta chave capta
  // exatamente a precisão de que precisam, sem recalcular a cada render (now
  // é um objeto novo sempre) nem ficar presa por até um ano (currentYear sozinho
  // não refletiria a virada do dia).
  const today = now.toDateString();
  const currentYear = now.getFullYear();
  const availableYears = [currentYear, currentYear + 1];
  const [params, setParams] = useSearchParams();
  const paramYear = Number(params.get('ano'));
  const year = availableYears.includes(paramYear) ? paramYear : currentYear;
  const paramMonth = Number(params.get('mes'));
  const month = params.has('mes') && paramMonth >= 1 && paramMonth <= 12 ? paramMonth - 1 : null;
  const audienceParam = params.get('publico');
  const audience = occasionAudienceOptions.some((option) => option.id === audienceParam && option.id !== 'todos') ? audienceParam as OccasionAudience : null;
  const query = (params.get('q') || '').slice(0, 80);
  const view: CalendarView = params.get('visualizacao') === 'calendario' ? 'calendar' : 'list';
  const [search, setSearch] = useState(query);
  const [favorites, setFavorites] = useState(loadFavorites);
  const [lastRemovedFavorite, setLastRemovedFavorite] = useState<DatedOccasion | null>(null);
  const [shareState, setShareState] = useState<ShareState>('idle');
  const [storageMessage, setStorageMessage] = useState('');
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const allOccasions = useMemo(() => occasionsForYear(year), [year]);
  const results = useMemo(() => filterOccasions(allOccasions, { month, audience, query }), [allOccasions, audience, month, query]);
  // today (toDateString) é a chave estável derivada de `now` na granularidade
  // que prioritizeUpcomingOccasions/nextOccasion realmente usam (dia). `now` é
  // um Date novo a cada render; incluí-lo aqui anularia a memoização por
  // completo, recalculando em toda renderização.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const prioritizedResults = useMemo(() => prioritizeUpcomingOccasions(results, now), [results, today]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const next = useMemo(() => nextOccasion(now), [today]);
  const selected = allOccasions.find((occasion) => occasion.id === params.get('data')) || null;
  const favoriteOccasions = allOccasions.filter((occasion) => favorites.has(occasion.id));
  const monthCounts = useMemo(() => {
    const filtered = filterOccasions(allOccasions, { month: null, audience, query });
    return monthNames.map((_, index) => filtered.filter((occasion) => occasion.date.getUTCMonth() === index).length);
  }, [allOccasions, audience, query]);

  useEffect(() => setSearch(query), [query]);
  useEffect(() => {
    try {
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
    } catch {
      setStorageMessage('Seu navegador não permitiu salvar esta seleção neste dispositivo.');
    }
  }, [favorites]);

  useEffect(() => {
    if (!lastRemovedFavorite) return;
    const timeout = window.setTimeout(() => setLastRemovedFavorite(null), 8_000);
    return () => window.clearTimeout(timeout);
  }, [lastRemovedFavorite]);

  useEffect(() => {
    if (!selected) return;
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    function handleKeyboard(event: KeyboardEvent) {
      if (event.key === 'Escape') closeDetail();
      if (event.key !== 'Tab') return;
      const focusable = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') || []);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    window.addEventListener('keydown', handleKeyboard);
    return () => {
      document.body.style.overflow = priorOverflow;
      window.removeEventListener('keydown', handleKeyboard);
      returnFocusRef.current?.focus();
    };
  // closeDetail é recriada a cada render, mas só limpa o parâmetro `data` da
  // URL — não lê nem captura `selected`, então é seguro chamá-la via closure
  // sem incluí-la aqui. O corpo do efeito só verifica a presença de `selected`
  // (guard no início); nunca lê seu conteúdo, então o id já é suficiente para
  // saber quando reabrir o painel — incluir o objeto inteiro dispararia o
  // efeito por qualquer mudança de referência, não só por troca de ocasião.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  function updateParams(updates: Record<string, string | number | null>, replace = true) {
    const nextParams = new URLSearchParams(params);
    Object.entries(updates).forEach(([key, value]) => value === null || value === '' ? nextParams.delete(key) : nextParams.set(key, String(value)));
    setParams(nextParams, { replace });
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    const value = search.trim().slice(0, 80);
    updateParams({ q: value || null });
    trackFunnelEvent('occasion_filtered', { has_query: Boolean(value), audience: audience || 'todos', month: month === null ? 0 : month + 1, result_count: filterOccasions(allOccasions, { month, audience, query: value }).length });
  }

  function openDetail(occasion: DatedOccasion) {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setShareState('idle');
    updateParams({ ano: occasion.date.getUTCFullYear(), data: occasion.id }, false);
    trackFunnelEvent('occasion_opened', { occasion_id: occasion.id, year: occasion.date.getUTCFullYear() });
  }

  function closeDetail() {
    updateParams({ data: null });
  }

  function toggleFavorite(occasion: DatedOccasion) {
    setStorageMessage('');
    const saved = favorites.has(occasion.id);
    setFavorites((current) => {
      const nextFavorites = new Set(current);
      saved ? nextFavorites.delete(occasion.id) : nextFavorites.add(occasion.id);
      return nextFavorites;
    });
    setLastRemovedFavorite(saved ? occasion : null);
    trackFunnelEvent('occasion_saved', { occasion_id: occasion.id, saved: !saved });
  }

  function restoreLastFavorite() {
    if (!lastRemovedFavorite) return;
    setFavorites((current) => new Set([...current, lastRemovedFavorite.id]));
    trackFunnelEvent('occasion_saved', { occasion_id: lastRemovedFavorite.id, saved: true });
    setLastRemovedFavorite(null);
  }

  async function shareOccasion(occasion: DatedOccasion) {
    const url = `${window.location.origin}/datas-comemorativas?ano=${year}&data=${encodeURIComponent(occasion.id)}`;
    let mode: 'native' | 'copy' = 'copy';
    try {
      if (navigator.share) {
        await navigator.share({ title: `${occasion.name} | Promo Brindes`, text: occasion.concept, url });
        mode = 'native';
        setShareState('shared');
      } else {
        await navigator.clipboard.writeText(url);
        setShareState('copied');
      }
      trackFunnelEvent('occasion_shared', { occasion_id: occasion.id, mode });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setShareState('error');
    }
  }

  function exportOccasion(occasion: DatedOccasion, planning: boolean) {
    downloadCalendar(occasion, planning);
    trackFunnelEvent('occasion_exported', { occasion_id: occasion.id, type: planning ? 'planning' : 'occasion' });
  }

  const jsonLd = useMemo(() => ({
    '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Agenda de conexões — datas comemorativas',
    description: 'Calendário editorial de datas comemorativas para campanhas de brindes corporativos.',
    mainEntity: { '@type': 'ItemList', itemListElement: allOccasions.map((occasion, index) => ({ '@type': 'ListItem', position: index + 1, name: occasion.name, url: `https://promo-brindes-v1.vercel.app/datas-comemorativas?ano=${year}&data=${occasion.id}` })) },
  }), [allOccasions, year]);

  return (
    <>
      <Seo
        title={selected ? `${selected.name} ${year}` : 'Datas comemorativas para campanhas'}
        description={selected?.description || 'Planeje campanhas de brindes por data, público e objetivo. Explore ideias, salve ocasiões e comece seu briefing com antecedência.'}
        path={selected ? `/datas-comemorativas?ano=${year}&data=${encodeURIComponent(selected.id)}` : '/datas-comemorativas'}
        jsonLd={jsonLd}
      />

      <header className="dates-hero">
        <div className="container dates-hero__grid">
          <div className="dates-hero__copy">
            <span className="section-kicker">Agenda de conexões · {currentYear}/{currentYear + 1}</span>
            <h1>Marque a data.<br /><em>Deixe sua marca.</em></h1>
            <p>Um calendário para transformar ocasiões em histórias, presentes em vínculos e briefings em campanhas que as pessoas lembram.</p>
            <a className="button button--green button--large" href="#agenda">Explorar oportunidades <ArrowRight size={19} /></a>
          </div>
          <div className="dates-hero__calendar" aria-hidden="true">
            <span className="dates-hero__pin dates-hero__pin--one" /><span className="dates-hero__pin dates-hero__pin--two" />
            <div className="dates-hero__sheet dates-hero__sheet--back"><span>IDEIAS</span><strong>12</strong></div>
            <div className="dates-hero__sheet"><span>{monthNames[next.date.getUTCMonth()]}</span><strong>{String(next.date.getUTCDate()).padStart(2, '0')}</strong><small>{next.name}</small></div>
            <div className="dates-hero__note">Conectar.<br />Encantar.<br /><strong>Ser lembrado.</strong></div>
          </div>
        </div>
        <div className="container dates-next">
          <div><span>PRÓXIMA NO RADAR</span><strong>{next.name}</strong><small>{formatDate(next.date, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })} · {proximityLabel(next.date)}</small></div>
          <button type="button" onClick={() => openDetail(next)}>Abrir oportunidade <ArrowRight size={18} /></button>
        </div>
      </header>

      <section className="dates-planner section" id="agenda" aria-labelledby="dates-planner-title">
        <div className="container">
          <div className="dates-planner__heading"><div><span className="section-kicker">Seu ano, com intenção</span><h2 id="dates-planner-title">Encontre a ocasião certa para cada conexão.</h2></div><p>Filtre pelo público, abra as ideias e salve o que merece entrar no calendário do seu time.</p></div>

          <div className="dates-toolbar">
            <form role="search" onSubmit={submitSearch} className="dates-search">
              <label htmlFor="dates-search">Buscar ocasião ou intenção</label>
              <div><Search size={19} /><input id="dates-search" value={search} maxLength={80} onChange={(event) => setSearch(event.target.value)} placeholder="Ex.: cliente, sustentabilidade, reconhecimento…" />{search && <button type="button" aria-label="Limpar busca" onClick={() => { setSearch(''); updateParams({ q: null }); }}><X size={17} /></button>}<button type="submit">Buscar</button></div>
            </form>
            <div className="dates-year"><label htmlFor="dates-year">Ano da campanha</label><select id="dates-year" value={year} onChange={(event) => updateParams({ ano: event.target.value, data: null })}>{availableYears.map((option) => <option key={option}>{option}</option>)}</select></div>
            <div className="dates-view" role="group" aria-label="Visualização da agenda"><button type="button" className={view === 'list' ? 'is-active' : ''} aria-pressed={view === 'list'} onClick={() => updateParams({ visualizacao: null })}><List size={17} /> Lista</button><button type="button" className={view === 'calendar' ? 'is-active' : ''} aria-pressed={view === 'calendar'} onClick={() => updateParams({ visualizacao: 'calendario', mes: month === null ? now.getMonth() + 1 : month + 1 })}><Grid3X3 size={17} /> Calendário</button></div>
          </div>

          <div className="dates-audiences" role="group" aria-label="Filtrar por público">{occasionAudienceOptions.map((option) => { const active = option.id === (audience || 'todos'); return <button key={option.id} type="button" aria-pressed={active} className={active ? 'is-active' : ''} onClick={() => { updateParams({ publico: option.id === 'todos' ? null : option.id }); trackFunnelEvent('occasion_filtered', { has_query: Boolean(query), audience: option.id, month: month === null ? 0 : month + 1, result_count: filterOccasions(allOccasions, { month, audience: option.id === 'todos' ? null : option.id, query }).length }); }}>{option.label}</button>; })}</div>

          <div className="dates-months" aria-label="Meses do ano"><button type="button" aria-pressed={month === null} className={month === null ? 'is-active' : ''} onClick={() => updateParams({ mes: null, visualizacao: view === 'calendar' ? null : params.get('visualizacao') })}><span>ANO</span><strong>{allOccasions.length}</strong></button>{monthNames.map((name, index) => <button type="button" key={name} aria-pressed={month === index} className={month === index ? 'is-active' : ''} onClick={() => updateParams({ mes: index + 1 })}><span>{name.slice(0, 3)}</span><strong>{monthCounts[index]}</strong></button>)}</div>

          <div className="dates-results-meta" aria-live="polite"><p><strong>{results.length}</strong> {results.length === 1 ? 'oportunidade encontrada' : 'oportunidades encontradas'}{month !== null ? ` em ${monthNames[month]}` : ` em ${year}`}</p>{(query || audience || month !== null) && <button type="button" onClick={() => { setSearch(''); setParams({ ano: String(year) }, { replace: true }); }}>Limpar filtros</button>}</div>

          {view === 'calendar' && month !== null ? <CalendarGrid year={year} month={month} occasions={results} onOpen={openDetail} /> : results.length ? <div className="occasion-list">{prioritizedResults.map((occasion) => <OccasionCard key={occasion.id} occasion={occasion} favorite={favorites.has(occasion.id)} onFavorite={() => toggleFavorite(occasion)} onOpen={() => openDetail(occasion)} />)}</div> : <div className="dates-empty"><CalendarDays size={42} /><span>AGENDA ABERTA</span><h2>Nenhuma data combina com esses filtros.</h2><p>Experimente outro público, navegue por todo o ano ou conte sua ocasião para nosso time de especialistas.</p><div><button className="button button--dark" type="button" onClick={() => { setSearch(''); setParams({ ano: String(year) }, { replace: true }); }}>Ver o ano inteiro</button><Link className="text-link" to="/contato">Planejar uma data própria <ArrowRight size={17} /></Link></div></div>}
        </div>
      </section>

      <section className="saved-dates section" aria-labelledby="saved-dates-title">
        <div className="container saved-dates__grid">
          <div><span className="section-kicker">Seu shortlist</span><h2 id="saved-dates-title">Minhas datas</h2><p>Guarde oportunidades para revisar com seu time. Elas ficam salvas neste dispositivo.</p></div>
          <div className="saved-dates__content">
            {storageMessage && <p className="saved-dates__error" role="alert">{storageMessage}</p>}
            {lastRemovedFavorite && <div className="saved-dates__undo" role="status"><span>{lastRemovedFavorite.name} removida.</span><button type="button" onClick={restoreLastFavorite}>Desfazer</button><button type="button" aria-label="Fechar aviso" onClick={() => setLastRemovedFavorite(null)}><X size={15} /></button></div>}
            {favoriteOccasions.length ? <ul>{favoriteOccasions.map((occasion) => <li key={occasion.id}><button type="button" onClick={() => openDetail(occasion)}><span>{formatDate(occasion.date, { day: '2-digit', month: 'short' })}</span><strong>{occasion.name}</strong><ArrowRight size={17} /></button><button type="button" aria-label={`Remover ${occasion.name} de Minhas datas`} onClick={() => toggleFavorite(occasion)}><X size={16} /></button></li>)}</ul> : <div className="saved-dates__empty"><Bookmark size={27} /><p>Use “Salvar” nas ocasiões que merecem entrar no seu radar.</p></div>}
          </div>
        </div>
      </section>

      <section className="own-date section" aria-labelledby="own-date-title"><div className="container own-date__grid"><div className="own-date__number">365</div><div><span className="section-kicker">Sua data também importa</span><h2 id="own-date-title">A melhor ocasião pode existir só dentro da sua empresa.</h2><p>Aniversário da marca, onboarding, tempo de casa, metas alcançadas ou o lançamento que todo mundo esperou. A gente transforma o contexto em uma curadoria própria.</p><div><Link className="button button--green button--large" to="/contato">Criar uma campanha exclusiva <ArrowRight size={18} /></Link><Link className="text-link text-link--light" to="/catalogos">Explorar catálogos</Link></div></div></div></section>

      <section className="dates-method section" aria-labelledby="dates-method-title"><div className="container"><div className="section-heading"><span className="section-kicker">Da data à entrega</span><h2 id="dates-method-title">Antecedência cria espaço para boas escolhas.</h2><p>Uma orientação editorial para organizar a conversa. Prazo, personalização e disponibilidade são confirmados na proposta.</p></div><ol><li><span><Lightbulb /></span><strong>Contexto</strong><p>Defina quem recebe e o que a campanha precisa fazer sentir.</p></li><li><span><Users /></span><strong>Público</strong><p>Considere quantidade, rotina e diversidade das pessoas.</p></li><li><span><Gift /></span><strong>Curadoria</strong><p>Escolha produtos que prolonguem a experiência da marca.</p></li><li><span><HeartHandshake /></span><strong>Proposta</strong><p>Nosso time de especialistas valida as possibilidades com você.</p></li></ol></div></section>

      <aside className="dates-sources"><div className="container"><Sparkles size={18} /><p>Curadoria editorial baseada em calendários de referência do <a href="https://cliente.sebraees.com.br/calendario-promocional" target="_blank" rel="noreferrer">Sebrae</a> e de observâncias da <a href="https://www.un.org/en/observances/list-days-weeks" target="_blank" rel="noreferrer">ONU</a>. Datas sazonais próprias estão identificadas pelo contexto.</p></div></aside>

      {selected && <div className="occasion-detail-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDetail(); }}><section ref={panelRef} className={`occasion-detail occasion-detail--${selected.kind}`} role="dialog" aria-modal="true" aria-labelledby="occasion-detail-title" aria-describedby="occasion-detail-description"><button ref={closeRef} type="button" className="occasion-detail__close" onClick={closeDetail} aria-label="Fechar detalhes"><X /></button><div className="occasion-detail__header"><div className="occasion-detail__date"><strong>{String(selected.date.getUTCDate()).padStart(2, '0')}</strong><span>{monthNames[selected.date.getUTCMonth()]}</span></div><div><span>{kindLabels[selected.kind]} · {selected.date.getUTCFullYear()}</span><h2 id="occasion-detail-title">{selected.name}</h2><p id="occasion-detail-description">{selected.description}</p></div></div><blockquote>“{selected.concept}”</blockquote><div className="occasion-detail__planning"><BellRing /><div><strong>{planningLabel(selected)}</strong><span>Janela sugerida: {selected.leadWeeks[0]} a {selected.leadWeeks[1]} semanas antes.</span></div></div><div className="occasion-detail__audiences"><span>Boa conexão para</span><ul>{selected.audiences.map((item) => <li key={item}>{audienceLabels[item]}</li>)}</ul></div><div className="occasion-detail__ideas"><span>POR ONDE COMEÇAR</span>{selected.ideas.map((item) => <article key={item.label}><Gift /><div><h3>{item.label}</h3><p>{item.reason}</p><Link to={occasionCatalogUrl({ id: selected.id, name: selected.name, date: toDateKey(selected.date) }, item.query)} onClick={() => trackFunnelEvent('occasion_catalog_opened', { occasion_id: selected.id, idea: item.query })}>Explorar no catálogo <ArrowRight size={16} /></Link></div></article>)}</div><div className="occasion-detail__actions"><button type="button" onClick={() => toggleFavorite(selected)} className={favorites.has(selected.id) ? 'is-active' : ''}>{favorites.has(selected.id) ? <BookmarkCheck /> : <Bookmark />}{favorites.has(selected.id) ? 'Data salva' : 'Salvar data'}</button><button type="button" onClick={() => void shareOccasion(selected)}>{shareState === 'copied' || shareState === 'shared' ? <Check /> : <Share2 />}{shareState === 'copied' ? 'Link copiado' : shareState === 'shared' ? 'Compartilhado' : shareState === 'error' ? 'Tente novamente' : 'Compartilhar'}</button></div><div className="occasion-detail__calendar-actions"><button type="button" onClick={() => exportOccasion(selected, false)}><CalendarDays /> Adicionar a data à agenda</button><button type="button" onClick={() => exportOccasion(selected, true)}><Download /> Lembrar quando começar</button></div>{selected.source && <a className="occasion-detail__source" href={selected.source.href} target="_blank" rel="noreferrer">Fonte da data: {selected.source.label}</a>}</section></div>}
    </>
  );
}
