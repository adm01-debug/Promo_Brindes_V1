import { ArrowRight, BookOpen, Check, Copy, FileText, Search, Share2, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { type CSSProperties, type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Seo } from '../components/Seo';
import { trackFunnelEvent } from '../lib/analytics';
import {
  catalogCollections,
  catalogFormatLabel,
  catalogThemeOptions,
  filterCatalogCollections,
  type CatalogCollection,
  type CatalogCollectionTheme,
} from '../lib/catalogLibrary';
import { useCatalog } from '../lib/hooks';
import { replaceBrokenProductImage } from '../lib/images';

type CatalogThemeFilter = 'all' | CatalogCollectionTheme;
type ShareState = 'idle' | 'copied' | 'shared' | 'error';

function validTheme(value: string | null): CatalogThemeFilter {
  return catalogThemeOptions.some((option) => option.id === value) ? value as CatalogThemeFilter : 'all';
}

function coverStyle(collection: CatalogCollection) {
  return {
    '--catalog-cover': collection.palette.background,
    '--catalog-accent': collection.palette.accent,
    '--catalog-ink': collection.palette.ink,
  } as CSSProperties;
}

function CatalogCover({ collection, index }: { collection: CatalogCollection; index: number }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const cover = useCatalog(collection.coverQuery, 0, visible);
  const product = cover.data.products[0];

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !('IntersectionObserver' in window)) { setVisible(true); return; }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      setVisible(true);
      observer.disconnect();
    }, { rootMargin: '180px 0px' });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={rootRef} className="catalog-cover" style={coverStyle(collection)} aria-hidden="true">
      {product && <img className="catalog-cover__product" src={product.imageUrl} alt="" width="280" height="280" loading="lazy" referrerPolicy="no-referrer" onError={replaceBrokenProductImage} />}
      <span className="catalog-cover__brand">PROMO / BRINDES</span>
      <span className="catalog-cover__edition">{collection.edition}</span>
      <span className="catalog-cover__orb" />
      <strong>{collection.title}</strong>
      <span className="catalog-cover__index">PB—{String(index + 1).padStart(2, '0')}</span>
    </div>
  );
}

function actionLabel(collection: CatalogCollection) {
  if (collection.format === 'pdf') return 'Abrir PDF';
  if (collection.format === 'digital') return 'Abrir revista';
  return 'Explorar coleção';
}

function CatalogCard({
  collection,
  index,
  featured = false,
  onShare,
  shareState,
}: {
  collection: CatalogCollection;
  index: number;
  featured?: boolean;
  onShare: (collection: CatalogCollection) => void;
  shareState: ShareState;
}) {
  const external = collection.format !== 'online';
  const actionClass = 'catalog-card__open';
  const actionContent = <>{actionLabel(collection)} <ArrowRight size={18} aria-hidden="true" /></>;
  return (
    <article className={`catalog-card ${featured ? 'catalog-card--featured' : ''}`}>
      <CatalogCover collection={collection} index={index} />
      <div className="catalog-card__content">
        <div className="catalog-card__meta">
          <span><BookOpen size={15} aria-hidden="true" /> {catalogFormatLabel(collection.format)}</span>
          <span>{collection.eyebrow}</span>
        </div>
        <h2>{collection.title}</h2>
        <p>{collection.description}</p>
        <ul className="catalog-card__tags" aria-label="Temas da coleção">
          {collection.tags.map((tag) => <li key={tag}>{tag}</li>)}
        </ul>
        <div className="catalog-card__actions">
          {external
            ? <a className={actionClass} href={collection.href} target="_blank" rel="noreferrer" onClick={() => trackFunnelEvent('catalog_collection_opened', { catalog_id: collection.id, format: collection.format })}>{actionContent}</a>
            : <Link className={actionClass} to={collection.href} onClick={() => trackFunnelEvent('catalog_collection_opened', { catalog_id: collection.id, format: collection.format })}>{actionContent}</Link>}
          <button type="button" className="catalog-card__share" onClick={() => onShare(collection)} aria-label={`Compartilhar ${collection.title}`}>
            {(shareState === 'shared' || shareState === 'copied') ? <Check size={17} aria-hidden="true" /> : <Share2 size={17} aria-hidden="true" />}
            {shareState === 'shared' ? 'Compartilhado' : shareState === 'copied' ? 'Link copiado' : shareState === 'error' ? 'Tente novamente' : 'Compartilhar'}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function CatalogsPage() {
  const [params, setParams] = useSearchParams();
  const query = (params.get('q') || '').trim().slice(0, 80);
  const theme = validTheme(params.get('tema'));
  const [searchInput, setSearchInput] = useState(query);
  const [shareStates, setShareStates] = useState<Record<string, Exclude<ShareState, 'idle'>>>({});

  useEffect(() => setSearchInput(query), [query]);

  const results = useMemo(
    () => filterCatalogCollections(catalogCollections, query, theme),
    [query, theme],
  );
  const featured = !query && theme === 'all' ? catalogCollections.find((collection) => collection.featured) : undefined;
  const gridResults = featured ? results.filter((collection) => collection.id !== featured.id) : results;

  function updateParams(next: { q?: string | null; tema?: CatalogThemeFilter }) {
    const updated = new URLSearchParams(params);
    if (next.q !== undefined) next.q ? updated.set('q', next.q) : updated.delete('q');
    if (next.tema !== undefined) next.tema === 'all' ? updated.delete('tema') : updated.set('tema', next.tema);
    updated.delete('page');
    setParams(updated, { replace: true });
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    const nextQuery = searchInput.trim().slice(0, 80);
    updateParams({ q: nextQuery || null });
    trackFunnelEvent('catalog_library_filtered', { theme, has_query: Boolean(nextQuery), result_count: filterCatalogCollections(catalogCollections, nextQuery, theme).length });
  }

  function selectTheme(nextTheme: CatalogThemeFilter) {
    const nextQuery = searchInput.trim().slice(0, 80);
    updateParams({ tema: nextTheme, q: nextQuery || null });
    trackFunnelEvent('catalog_library_filtered', { theme: nextTheme, has_query: Boolean(nextQuery), result_count: filterCatalogCollections(catalogCollections, nextQuery, nextTheme).length });
  }

  async function shareCollection(collection: CatalogCollection) {
    const url = new URL(collection.href, window.location.origin).href;
    let usedNativeShare = false;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${collection.title} | Promo Brindes`, text: collection.description, url });
        usedNativeShare = true;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        try {
          await navigator.clipboard.writeText(url);
        } catch {
          setShareStates((current) => ({ ...current, [collection.id]: 'error' }));
          return;
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        setShareStates((current) => ({ ...current, [collection.id]: 'error' }));
        return;
      }
    }

    setShareStates((current) => ({ ...current, [collection.id]: usedNativeShare ? 'shared' : 'copied' }));
    trackFunnelEvent('catalog_collection_shared', { catalog_id: collection.id, format: collection.format });
  }

  return (
    <>
      <Seo
        title="Catálogos de brindes"
        description="Explore catálogos e coleções de brindes corporativos por campanha, público e objetivo. Encontre referências e monte seu briefing."
        path="/catalogos"
      />

      <header className="catalogs-hero" aria-labelledby="catalogs-title">
        <div className="container catalogs-hero__grid">
          <div className="catalogs-hero__copy">
            <span className="section-kicker">Biblioteca Promo · inspiração aplicada</span>
            <h1 id="catalogs-title">Catálogos para tirar seu briefing <em>do branco.</em></h1>
            <p>Escolha uma ocasião, encontre uma direção e abra uma curadoria de produtos reais. Sem cadastro, sem preço genérico e sem cinquenta abas abertas.</p>
            <a className="button button--green button--large" href="#biblioteca">Explorar catálogos <ArrowRight size={19} aria-hidden="true" /></a>
          </div>
          <div className="catalogs-hero__visual" aria-hidden="true">
            <div className="catalogs-hero__book catalogs-hero__book--back"><span>PB—07</span><strong>Tech<br />útil</strong></div>
            <div className="catalogs-hero__book catalogs-hero__book--middle"><span>PB—04</span><strong>Brand<br />love</strong></div>
            <div className="catalogs-hero__book catalogs-hero__book--front"><span>PB—01</span><strong>People<br />first</strong><small>curadoria viva</small></div>
          </div>
        </div>
        <div className="container catalogs-hero__facts" aria-label="Características dos catálogos">
          <span><Sparkles size={17} aria-hidden="true" /> Curadorias por contexto</span>
          <span><Copy size={17} aria-hidden="true" /> Links fáceis de compartilhar</span>
          <span><FileText size={17} aria-hidden="true" /> Formato sempre identificado</span>
        </div>
      </header>

      <section className="catalog-library section" id="biblioteca" aria-labelledby="catalog-library-title">
        <div className="container">
          <div className="catalog-library__heading">
            <div>
              <span className="section-kicker">Ache seu ponto de partida</span>
              <h2 id="catalog-library-title">Uma estante feita para campanhas reais.</h2>
            </div>
            <p>Coleções online acompanham o catálogo vivo. Quando houver um material fechado, ele aparecerá claramente como PDF ou revista digital.</p>
          </div>

          <div className="catalog-toolbar" aria-label="Filtrar catálogos">
            <form className="catalog-search" role="search" onSubmit={submitSearch}>
              <label htmlFor="catalog-library-search">O que você está planejando?</label>
              <div>
                <Search size={20} aria-hidden="true" />
                <input id="catalog-library-search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Ex.: onboarding, evento, sustentável…" maxLength={80} />
                {searchInput && <button type="button" aria-label="Limpar busca" onClick={() => { setSearchInput(''); updateParams({ q: null }); }}><X size={18} /></button>}
                <button type="submit">Buscar</button>
              </div>
            </form>
            <div className="catalog-theme-filter">
              <span><SlidersHorizontal size={17} aria-hidden="true" /> Filtrar por tema</span>
              <div role="group" aria-label="Temas dos catálogos">
                {catalogThemeOptions.map((option) => (
                  <button key={option.id} type="button" className={theme === option.id ? 'is-active' : ''} aria-pressed={theme === option.id} onClick={() => selectTheme(option.id)}>{option.label}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="catalog-results-summary" aria-live="polite">
            <strong>{results.length}</strong> {results.length === 1 ? 'catálogo encontrado' : 'catálogos encontrados'}
            {(query || theme !== 'all') && <button type="button" onClick={() => { setSearchInput(''); setParams({}, { replace: true }); }}>Limpar filtros</button>}
          </div>

          {featured && (
            <div className="catalog-featured" aria-label="Catálogo em destaque">
              <CatalogCard collection={featured} index={0} featured onShare={(item) => void shareCollection(item)} shareState={shareStates[featured.id] || 'idle'} />
            </div>
          )}

          {gridResults.length > 0 ? (
            <div className="catalog-library__grid">
              {gridResults.map((collection) => (
                <CatalogCard
                  key={collection.id}
                  collection={collection}
                  index={catalogCollections.findIndex((item) => item.id === collection.id)}
                  onShare={(item) => void shareCollection(item)}
                  shareState={shareStates[collection.id] || 'idle'}
                />
              ))}
            </div>
          ) : !featured && (
            <div className="catalog-empty">
              <span>ZERO MATCH</span>
              <h2>Essa estante ainda não tem esse tema.</h2>
              <p>Limpe os filtros ou conte a ideia para nosso time de especialistas montar uma direção.</p>
              <div><button className="button button--dark" type="button" onClick={() => { setSearchInput(''); setParams({}, { replace: true }); }}>Ver todos</button><Link className="text-link" to="/contato">Falar com especialistas <ArrowRight size={17} /></Link></div>
            </div>
          )}
        </div>
      </section>

      <section className="catalog-how section" aria-labelledby="catalog-how-title">
        <div className="container">
          <div className="section-heading"><span className="section-kicker">Do repertório ao pedido</span><h2 id="catalog-how-title">Use como quiser. Continue de onde parou.</h2></div>
          <ol className="catalog-how__steps">
            <li><span>01</span><h3>Encontre uma direção</h3><p>Busque pelo contexto da ação, pelo público ou pelo tipo de produto.</p></li>
            <li><span>02</span><h3>Compartilhe com o time</h3><p>Envie o link da coleção e alinhe referências sem anexos pesados.</p></li>
            <li><span>03</span><h3>Monte sua seleção</h3><p>Abra a coleção, escolha os itens e transforme sua seleção em briefing.</p></li>
          </ol>
        </div>
      </section>

      <section className="catalogs-cta">
        <div className="container catalogs-cta__inner">
          <div><span className="section-kicker section-kicker--light">Não encontrou o que imaginou?</span><h2>Traga a referência.<br />A gente encontra o caminho.</h2><p>Nosso time de especialistas combina contexto, prazo e identidade para sugerir possibilidades.</p></div>
          <Link className="button button--light button--large" to="/contato" onClick={() => trackFunnelEvent('catalog_briefing_started', { source: 'library' })}>Começar uma conversa <ArrowRight size={19} /></Link>
        </div>
      </section>
    </>
  );
}
