import { ChevronLeft, ChevronRight, Filter, Search, SlidersHorizontal, X } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CatalogFilterPanel } from '../components/CatalogFilterPanel';
import { CatalogEmpty, CatalogError, ProductGridSkeleton } from '../components/CatalogFeedback';
import { ProductCard } from '../components/ProductCard';
import { Seo } from '../components/Seo';
import {
  categoryQueryIds,
  colorFilterIds,
  filterLabel,
  materialFilterIds,
  parseCatalogPage,
  parseCategoryIds,
  parseFilterIds,
  PROFILE_OPTIONS,
  serializeFilterIds,
  type ProfileParam,
} from '../lib/catalogFilters';
import { useAllCategories, useCatalog } from '../lib/hooks';
import { sanitizeSearch } from '../lib/catalog';

const quickSearches = ['camiseta', 'kit', 'squeeze', 'carregador', 'reciclado'];

function validProfile(value: string | null): ProfileParam {
  return value === 'destaques' || value === 'novos' || value === 'kits' ? value : 'todos';
}

function validSort(value: string | null): 'curadoria' | 'recentes' | 'nome' {
  return value === 'recentes' || value === 'nome' ? value : 'curadoria';
}

export default function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const rawQuery = params.get('q') || '';
  const query = sanitizeSearch(rawQuery);
  const legacyCategoryId = params.get('categoria') || '';
  const categoryNameParam = params.get('nome') || '';
  const selectedCategoryIds = parseCategoryIds(params.get('categorias') || legacyCategoryId);
  const selectedColors = parseFilterIds(params.get('cores'), colorFilterIds);
  const selectedMaterials = parseFilterIds(params.get('materiais'), materialFilterIds);
  const personalizable = params.get('personalizavel') === '1';
  const giftPackaging = params.get('embalagem') === '1';
  const profile = validProfile(params.get('perfil'));
  const sort = validSort(params.get('ordem'));
  const page = parseCatalogPage(params.get('pagina'));
  const [searchInput, setSearchInput] = useState(query);
  const [retryKey, setRetryKey] = useState(0);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileDialogRef = useRef<HTMLDivElement>(null);
  const mobileCloseRef = useRef<HTMLButtonElement>(null);
  const categories = useAllCategories(retryKey);
  const catalogCategoryIds = useMemo(
    () => categoryQueryIds(categories.data, selectedCategoryIds),
    [categories.data, selectedCategoryIds],
  );
  const catalog = useCatalog(
    {
      page,
      pageSize: 24,
      search: query,
      categoryIds: catalogCategoryIds,
      colors: selectedColors,
      materials: selectedMaterials,
      personalizable,
      giftPackaging,
      profile: profile === 'destaques' ? 'featured' : profile === 'novos' ? 'new' : profile === 'kits' ? 'kits' : 'all',
      sort: sort === 'recentes' ? 'newest' : sort === 'nome' ? 'name' : 'curated',
    },
    retryKey,
  );
  const categoryNameById = useMemo(() => new Map(categories.data.map((item) => [item.id, item.name])), [categories.data]);
  const selectedCategoryName = selectedCategoryIds.length === 1
    ? categoryNameById.get(selectedCategoryIds[0]) || categoryNameParam
    : '';
  const totalPages = Math.max(1, Math.ceil(catalog.data.total / catalog.data.pageSize));
  const activeFilterCount = (
    Number(Boolean(query)) + selectedCategoryIds.length + selectedColors.length + selectedMaterials.length +
    Number(profile !== 'todos') + Number(personalizable) + Number(giftPackaging)
  );

  useEffect(() => setSearchInput(query), [query]);

  useEffect(() => {
    if (rawQuery === query) return;
    const next = new URLSearchParams(params);
    if (query) next.set('q', query);
    else next.delete('q');
    setParams(next, { replace: true });
  }, [params, query, rawQuery, setParams]);

  useEffect(() => {
    if (catalog.loading || catalog.error || page <= totalPages) return;
    const next = new URLSearchParams(params);
    if (totalPages > 1) next.set('pagina', String(totalPages));
    else next.delete('pagina');
    setParams(next, { replace: true });
  }, [catalog.error, catalog.loading, page, params, setParams, totalPages]);

  useEffect(() => {
    if (!mobileFiltersOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    mobileCloseRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMobileFiltersOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !mobileDialogRef.current) return;
      const focusable = [...mobileDialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      )].filter((element) => element.offsetParent !== null);
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

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      mobileTriggerRef.current?.focus();
    };
  }, [mobileFiltersOpen]);

  function updateParams(values: Record<string, string | null>, scroll = false) {
    const next = new URLSearchParams(params);
    Object.entries(values).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
    if (!('pagina' in values)) next.delete('pagina');
    setParams(next);
    if (scroll) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    updateParams({ q: searchInput.trim() || null }, true);
  }

  function clearAll() {
    setSearchInput('');
    setParams({});
  }

  function toggleParamValue(key: 'cores' | 'materiais', current: string[], value: string) {
    const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
    updateParams({ [key]: serializeFilterIds(next) });
  }

  function toggleCategory(id: string) {
    const next = selectedCategoryIds.includes(id)
      ? selectedCategoryIds.filter((item) => item !== id)
      : [...selectedCategoryIds, id];
    updateParams({ categorias: serializeFilterIds(next), categoria: null, nome: null });
  }

  const filterPanel = (instanceId: 'desktop' | 'mobile') => (
    <CatalogFilterPanel
      instanceId={instanceId}
      categories={categories.data}
      categoriesLoading={categories.loading}
      categoriesError={categories.error}
      profile={profile}
      selectedCategoryIds={selectedCategoryIds}
      selectedColors={selectedColors}
      selectedMaterials={selectedMaterials}
      personalizable={personalizable}
      giftPackaging={giftPackaging}
      onProfileChange={(value) => updateParams({ perfil: value === 'todos' ? null : value })}
      onToggleCategory={toggleCategory}
      onClearCategories={() => updateParams({ categorias: null, categoria: null, nome: null })}
      onRetryCategories={() => setRetryKey((key) => key + 1)}
      onToggleColor={(value) => toggleParamValue('cores', selectedColors, value)}
      onToggleMaterial={(value) => toggleParamValue('materiais', selectedMaterials, value)}
      onPersonalizableChange={(value) => updateParams({ personalizavel: value ? '1' : null })}
      onGiftPackagingChange={(value) => updateParams({ embalagem: value ? '1' : null })}
    />
  );

  return (
    <>
      <Seo title="Radar de brindes corporativos" description="Descubra produtos, kits e ideias com potencial para sua próxima campanha e monte um briefing visual." path="/catalogo" />
      <header className="catalog-hero">
        <div className="container">
          <span className="section-kicker">Busca visual · curadoria humana</span>
          <h1>Seu moodboard começa aqui.</h1>
          <p>Explore sem login, salve o que conversa com a campanha e deixe valores, personalização e prazo para a proposta.</p>
          <form className="catalog-search" role="search" onSubmit={submitSearch}>
            <Search size={21} aria-hidden="true" />
            <label className="sr-only" htmlFor="catalog-search">Buscar no catálogo</label>
            <input id="catalog-search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Camiseta, kit, squeeze, tech ou código…" />
            {searchInput && <button className="catalog-search__clear" type="button" aria-label="Limpar busca" onClick={() => { setSearchInput(''); updateParams({ q: null }); }}><X size={18} /></button>}
            <button className="catalog-search__submit" type="submit">Buscar</button>
          </form>
          <div className="catalog-quick-searches" aria-label="Buscas rápidas">
            <span>Em alta agora:</span>
            {quickSearches.map((term) => <button key={term} type="button" onClick={() => { setSearchInput(term); updateParams({ q: term }, true); }}>{term}</button>)}
          </div>
        </div>
      </header>

      <div className="container catalog-layout">
        <aside className="catalog-filters" aria-label="Filtros do catálogo">
          <div className="catalog-filters__title"><SlidersHorizontal size={18} /><strong>Afine o radar</strong>{activeFilterCount > 0 && <button type="button" onClick={clearAll}>Limpar tudo</button>}</div>
          {filterPanel('desktop')}
        </aside>

        <section className="catalog-results" aria-labelledby="catalog-results-title">
          <button ref={mobileTriggerRef} className="mobile-filter-trigger" type="button" aria-haspopup="dialog" onClick={() => setMobileFiltersOpen(true)}>
            <Filter size={18} /> Afinar o radar
            {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
          </button>

          {mobileFiltersOpen && (
            <div className="filter-drawer-backdrop" onMouseDown={(event) => {
              if (event.target === event.currentTarget) setMobileFiltersOpen(false);
            }}>
              <div ref={mobileDialogRef} className="filter-drawer" role="dialog" aria-modal="true" aria-labelledby="mobile-filter-title">
                <header className="filter-drawer__header">
                  <div><span>Superfiltro</span><h2 id="mobile-filter-title">Afine seu radar</h2></div>
                  <button ref={mobileCloseRef} type="button" aria-label="Fechar filtros" onClick={() => setMobileFiltersOpen(false)}><X /></button>
                </header>
                <div className="filter-drawer__body">{filterPanel('mobile')}</div>
                <footer className="filter-drawer__footer">
                  {activeFilterCount > 0 && <button className="filter-drawer__clear" type="button" onClick={clearAll}>Limpar tudo</button>}
                  <button className="filter-drawer__apply" type="button" onClick={() => setMobileFiltersOpen(false)}>
                    {catalog.loading ? 'Atualizando produtos…' : `Ver ${catalog.data.total.toLocaleString('pt-BR')} ${catalog.data.total === 1 ? 'produto' : 'produtos'}`}
                  </button>
                </footer>
              </div>
            </div>
          )}

          <div className="catalog-toolbar">
            <div>
              <h2 id="catalog-results-title">{query ? `Matchs para “${query}”` : selectedCategoryIds.length > 1 ? 'Seu recorte de campanha' : selectedCategoryName || (profile === 'kits' ? 'Kits & combos' : profile === 'novos' ? 'Novos drops' : profile === 'destaques' ? 'Em alta' : 'Radar completo')}</h2>
              <p aria-live="polite" aria-atomic="true">{catalog.loading ? 'Buscando produtos…' : `${catalog.data.total.toLocaleString('pt-BR')} ${catalog.data.total === 1 ? 'produto encontrado' : 'produtos encontrados'}`}</p>
            </div>
            <label className="sort-control">Ordenar por
              <select value={sort} onChange={(event) => updateParams({ ordem: event.target.value === 'curadoria' ? null : event.target.value }, true)}>
                <option value="curadoria">Curadoria Promo</option>
                <option value="recentes">Mais recentes</option>
                <option value="nome">Nome A–Z</option>
              </select>
            </label>
          </div>

          {activeFilterCount > 0 && (
            <div className="active-filters" aria-label="Filtros aplicados">
              <span>Filtros:</span>
              {query && <button type="button" onClick={() => { setSearchInput(''); updateParams({ q: null }); }}>Busca: {query} <X size={14} /></button>}
              {selectedCategoryIds.map((id) => <button key={id} type="button" onClick={() => toggleCategory(id)}>{categoryNameById.get(id) || 'Categoria'} <X size={14} /></button>)}
              {profile !== 'todos' && <button type="button" onClick={() => updateParams({ perfil: null })}>{PROFILE_OPTIONS.find((item) => item.value === profile)?.label} <X size={14} /></button>}
              {selectedColors.map((id) => <button key={id} type="button" onClick={() => toggleParamValue('cores', selectedColors, id)}>Cor: {filterLabel('color', id)} <X size={14} /></button>)}
              {selectedMaterials.map((id) => <button key={id} type="button" onClick={() => toggleParamValue('materiais', selectedMaterials, id)}>Material: {filterLabel('material', id)} <X size={14} /></button>)}
              {personalizable && <button type="button" onClick={() => updateParams({ personalizavel: null })}>Personalizável <X size={14} /></button>}
              {giftPackaging && <button type="button" onClick={() => updateParams({ embalagem: null })}>Com embalagem <X size={14} /></button>}
              <button className="active-filters__clear" type="button" onClick={clearAll}>Limpar todos</button>
            </div>
          )}

          {catalog.loading && <ProductGridSkeleton count={12} />}
          {catalog.error && <CatalogError message={catalog.error} onRetry={() => setRetryKey((key) => key + 1)} />}
          {!catalog.loading && !catalog.error && catalog.data.products.length === 0 && <CatalogEmpty onClear={clearAll} />}
          {!catalog.loading && !catalog.error && catalog.data.products.length > 0 && (
            <>
              <div className="product-grid">
                {catalog.data.products.map((product, index) => (
                  <ProductCard key={product.id} product={product} priority={index < 4} categoryName={categoryNameById.get(product.mainCategoryId || '')} />
                ))}
              </div>
              {totalPages > 1 && (
                <nav className="pagination" aria-label="Paginação do catálogo">
                  <button type="button" disabled={page <= 1} onClick={() => updateParams({ pagina: String(page - 1) }, true)}><ChevronLeft size={18} /> Anterior</button>
                  <span>Página <strong>{page}</strong> de {totalPages}</span>
                  <button type="button" disabled={page >= totalPages} onClick={() => updateParams({ pagina: String(page + 1) }, true)}>Próxima <ChevronRight size={18} /></button>
                </nav>
              )}
            </>
          )}
        </section>
      </div>
    </>
  );
}
