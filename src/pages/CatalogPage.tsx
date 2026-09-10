import { ChevronLeft, ChevronRight, Filter, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CatalogFilterPanel } from '../components/CatalogFilterPanel';
import { CatalogEmpty, CatalogError, ProductGridSkeleton } from '../components/CatalogFeedback';
import { ProductCard } from '../components/ProductCard';
import { ContextualFaq } from '../components/ContextualFaq';
import { SearchAutocomplete } from '../components/SearchAutocomplete';
import { Seo } from '../components/Seo';
import { trackFunnelEvent } from '../lib/analytics';
import { replaceBrokenProductImage } from '../lib/images';
import {
  campaignLabels,
  campaignBriefFromSelection,
  campaignSelectionCount,
  parseCampaignSelection,
  resolveCampaignFilters,
  type CampaignSelection,
} from '../lib/campaignPresets';
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
import { fetchProductsByIds, sanitizeSearch } from '../lib/catalog';
import { loadCatalogComparison, saveCatalogComparison } from '../lib/catalogComparison';
import { normalizeCampaignBrief } from '../lib/campaignBrief';
import { suggestSearchCorrection } from '../lib/search';
import { useQuoteCart } from '../context/QuoteCartContext';
import type { CatalogProduct } from '../types';

const quickSearches = ['camiseta', 'kit', 'squeeze', 'carregador', 'reciclado'];

function validProfile(value: string | null): ProfileParam {
  return value === 'destaques' || value === 'novos' || value === 'kits' ? value : 'todos';
}

function validSort(value: string | null): 'curadoria' | 'recentes' | 'nome' {
  return value === 'recentes' || value === 'nome' ? value : 'curadoria';
}

function comparisonDimensions(product: CatalogProduct): string {
  const values = [product.dimensions.lengthCm, product.dimensions.widthCm, product.dimensions.heightCm]
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return values.length ? `${values.map((value) => value.toLocaleString('pt-BR')).join(' × ')} cm` : 'A confirmar';
}

export default function CatalogPage() {
  const cart = useQuoteCart();
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
  const profileWasExplicitlySet = params.has('perfil');
  const sort = validSort(params.get('ordem'));
  const page = parseCatalogPage(params.get('pagina'));
  const campaignSelection = parseCampaignSelection(params);
  const campaignCount = campaignSelectionCount(campaignSelection);
  const campaignKey = `${campaignSelection.moment || ''}|${campaignSelection.audience || ''}|${campaignSelection.scale || ''}|${campaignSelection.mood || ''}`;
  const occasionCampaign = useMemo(() => normalizeCampaignBrief({
    source: 'commemorative_date',
    occasion: {
      id: params.get('ocasiao'),
      name: params.get('ocasiao_nome'),
      date: params.get('ocasiao_data'),
    },
  }), [params]);
  const [searchInput, setSearchInput] = useState(query);
  const [retryKey, setRetryKey] = useState(0);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [comparison, setComparison] = useState<CatalogProduct[]>(loadCatalogComparison);
  const [comparisonExpanded, setComparisonExpanded] = useState(() => typeof window === 'undefined' || window.innerWidth > 760);
  const [comparisonNotice, setComparisonNotice] = useState('');
  const comparisonControlRefs = useRef(new Map<string, HTMLButtonElement>());
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileDialogRef = useRef<HTMLDivElement>(null);
  const mobileCloseRef = useRef<HTMLButtonElement>(null);
  const trackedCatalogViewsRef = useRef(new Set<string>());
  const categories = useAllCategories(retryKey);
  const campaignFilters = useMemo(
    () => resolveCampaignFilters(campaignSelection, categories.data),
    // A chave estabiliza o objeto lido da URL e evita recalcular por identidade.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [campaignKey, categories.data],
  );
  const campaignNeedsCategories = campaignSelection.mood === 'tech' && selectedCategoryIds.length === 0;
  const campaignCategoryMissing = campaignNeedsCategories && !categories.loading && !categories.error && campaignFilters.categoryIds.length === 0;
  const catalogEnabled = !campaignNeedsCategories || (!categories.loading && !categories.error && !campaignCategoryMissing);
  const effectiveCategoryIds = selectedCategoryIds.length ? selectedCategoryIds : campaignFilters.categoryIds;
  const catalogCategoryIds = useMemo(
    () => categoryQueryIds(categories.data, effectiveCategoryIds),
    [categories.data, effectiveCategoryIds],
  );
  const effectiveColors = [...new Set([...selectedColors, ...campaignFilters.colors])];
  const effectiveMaterials = [...new Set([...selectedMaterials, ...campaignFilters.materials])];
  const effectivePersonalizable = personalizable || Boolean(campaignFilters.personalizable);
  const effectiveProfile = profileWasExplicitlySet
    ? profile === 'destaques' ? 'featured' : profile === 'novos' ? 'new' : profile === 'kits' ? 'kits' : 'all'
    : campaignFilters.profile || (profile === 'destaques' ? 'featured' : profile === 'novos' ? 'new' : profile === 'kits' ? 'kits' : 'all');
  const filterPanelProfile: ProfileParam = effectiveProfile === 'featured'
    ? 'destaques'
    : effectiveProfile === 'new'
      ? 'novos'
      : effectiveProfile === 'kits'
        ? 'kits'
        : 'todos';
  const catalog = useCatalog(
    {
      page,
      pageSize: 24,
      search: query,
      categoryIds: catalogCategoryIds,
      colors: effectiveColors,
      materials: effectiveMaterials,
      personalizable: effectivePersonalizable,
      giftPackaging,
      maxMinQuantity: campaignFilters.maxMinQuantity,
      profile: effectiveProfile,
      sort: sort === 'recentes' ? 'newest' : sort === 'nome' ? 'name' : 'curated',
    },
    retryKey,
    catalogEnabled,
  );
  const catalogError = campaignNeedsCategories
    ? categories.error || (campaignCategoryMissing ? 'Não foi possível localizar a categoria de tecnologia neste momento.' : catalog.error)
    : catalog.error;
  const catalogLoading = !catalogError && ((campaignNeedsCategories && categories.loading) || catalog.loading);
  const categoryNameById = useMemo(() => new Map(categories.data.map((item) => [item.id, item.name])), [categories.data]);
  const selectedCategoryName = selectedCategoryIds.length === 1
    ? categoryNameById.get(selectedCategoryIds[0]) || categoryNameParam
    : '';
  const totalPages = Math.max(1, Math.ceil(catalog.data.total / catalog.data.pageSize));
  const activeFilterCount = (
    Number(Boolean(query)) + selectedCategoryIds.length + selectedColors.length + selectedMaterials.length +
    Number(profileWasExplicitlySet && profile !== 'todos') + Number(effectivePersonalizable) + Number(giftPackaging) + campaignCount
  );
  const selectedCampaignLabels = campaignLabels(campaignSelection);
  const paramsKey = params.toString();
  const searchCorrection = useMemo(() => suggestSearchCorrection(query), [query]);
  const comparisonIds = useMemo(() => comparison.map((product) => product.id).sort().join(','), [comparison]);

  useEffect(() => setSearchInput(query), [query]);

  useEffect(() => {
    const brief = occasionCampaign || campaignBriefFromSelection(campaignSelection);
    if (brief) cart.setCampaign(brief);
  }, [campaignKey, cart, occasionCampaign]);

  useEffect(() => {
    saveCatalogComparison(comparison);
  }, [comparison]);

  useEffect(() => {
    if (!comparisonIds) return;
    const controller = new AbortController();
    void fetchProductsByIds(comparisonIds.split(',').filter(Boolean), controller.signal)
      .then((available) => {
        const byId = new Map(available.map((product) => [product.id, product]));
        setComparison((current) => {
          const next = current.flatMap((product) => byId.has(product.id) ? [byId.get(product.id)!] : []);
          const missing = current.length - next.length;
          setComparisonNotice(missing ? `${missing === 1 ? 'Uma referência não está mais ativa e foi retirada da comparação.' : `${missing} referências não estão mais ativas e foram retiradas da comparação.`}` : '');
          return next;
        });
      })
      .catch(() => {
        // A comparação continua legível com o retrato salvo se a consulta de leitura falhar.
        setComparisonNotice('Não foi possível atualizar as referências agora; os dados exibidos são o último retrato salvo.');
      });
    return () => controller.abort();
  }, [comparisonIds]);

  useEffect(() => {
    if (!catalog.data.products.length) return;
    setComparison((current) => {
      const next = current.map((item) => catalog.data.products.find((product) => product.id === item.id) || item);
      return next.every((item, index) => item === current[index]) ? current : next;
    });
  }, [catalog.data.products]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)');
    const update = () => setComparisonExpanded(!media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (rawQuery === query) return;
    const next = new URLSearchParams(params);
    if (query) next.set('q', query);
    else next.delete('q');
    setParams(next, { replace: true });
  }, [params, query, rawQuery, setParams]);

  useEffect(() => {
    if (catalogLoading || catalogError || page <= totalPages) return;
    const next = new URLSearchParams(params);
    if (totalPages > 1) next.set('pagina', String(totalPages));
    else next.delete('pagina');
    setParams(next, { replace: true });
  }, [catalogError, catalogLoading, page, params, setParams, totalPages]);

  useEffect(() => {
    if (catalogLoading || catalogError) return;
    const viewKey = `${paramsKey}|${catalog.data.total}`;
    if (trackedCatalogViewsRef.current.has(viewKey)) return;
    trackedCatalogViewsRef.current.add(viewKey);
    trackFunnelEvent('catalog_result_viewed', {
      result_count: catalog.data.total,
      page: catalog.data.page,
      active_filters: activeFilterCount,
      campaign: campaignCount > 0,
    });
  }, [activeFilterCount, campaignCount, catalog.data.page, catalog.data.total, catalogError, catalogLoading, paramsKey]);

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

  function submitSearch(value: string, suggestion = false) {
    trackFunnelEvent('search_started', { source: 'catalog', query_length: value.length, suggestion });
    updateParams({ q: value || null }, true);
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

  function removeCampaignFilter(key: keyof CampaignSelection) {
    const paramName = key === 'moment' ? 'momento' : key === 'audience' ? 'publico' : key === 'scale' ? 'escala' : 'clima';
    updateParams({ [paramName]: null });
  }

  function toggleComparison(product: CatalogProduct) {
    setComparison((current) => {
      const exists = current.some((item) => item.id === product.id);
      if (exists) {
        const next = current.filter((item) => item.id !== product.id);
        trackFunnelEvent('comparison_changed', { item_count: next.length, action: 'removed' });
        return next;
      }
      if (current.length >= 3) return current;
      const next = [...current, product];
      trackFunnelEvent('comparison_changed', { item_count: next.length, action: 'added' });
      return next;
    });
  }

  function removeComparison(product: CatalogProduct) {
    toggleComparison(product);
    window.requestAnimationFrame(() => comparisonControlRefs.current.get(product.id)?.focus());
  }

  const filterPanel = (instanceId: 'desktop' | 'mobile') => (
    <CatalogFilterPanel
      instanceId={instanceId}
      categories={categories.data}
      categoriesLoading={categories.loading}
      categoriesError={categories.error}
      profile={filterPanelProfile}
      selectedCategoryIds={selectedCategoryIds}
      selectedColors={effectiveColors}
      selectedMaterials={effectiveMaterials}
      personalizable={personalizable}
      giftPackaging={giftPackaging}
      onProfileChange={(value) => updateParams({ perfil: value === 'todos' && !campaignCount ? null : value })}
      onToggleCategory={toggleCategory}
      onClearCategories={() => updateParams({ categorias: null, categoria: null, nome: null })}
      onRetryCategories={() => setRetryKey((key) => key + 1)}
      onToggleColor={(value) => {
        if (campaignFilters.colors.includes(value) && !selectedColors.includes(value)) removeCampaignFilter('mood');
        else toggleParamValue('cores', selectedColors, value);
      }}
      onToggleMaterial={(value) => {
        if (campaignFilters.materials.includes(value) && !selectedMaterials.includes(value)) removeCampaignFilter('mood');
        else toggleParamValue('materiais', selectedMaterials, value);
      }}
      onPersonalizableChange={(value) => {
        if (campaignFilters.personalizable && !value && !personalizable) removeCampaignFilter('audience');
        else updateParams({ personalizavel: value ? '1' : null });
      }}
      onGiftPackagingChange={(value) => updateParams({ embalagem: value ? '1' : null })}
    />
  );

  return (
    <>
      <Seo title="Radar de brindes corporativos" description="Descubra produtos, kits e ideias com potencial para sua próxima campanha e monte um briefing visual." path="/catalogo" />
      <header className="catalog-hero">
        <div className="container">
          <span className="section-kicker">Busca visual · curadoria humana</span>
          <h1>Sua seleção começa aqui.</h1>
          <p>Explore sem login, adicione o que conversa com a campanha e deixe valores, personalização e prazo para a proposta.</p>
          <SearchAutocomplete
            variant="catalog"
            inputId="catalog-search"
            label="Buscar no catálogo"
            value={searchInput}
            placeholder="Camiseta, kit, squeeze, tech ou código…"
            categories={categories.data}
            onChange={setSearchInput}
            onSubmit={(value) => submitSearch(value)}
            onClear={() => { setSearchInput(''); updateParams({ q: null }); }}
            onSelect={(suggestion) => {
              trackFunnelEvent('search_started', { source: 'catalog', query_length: suggestion.value.length, suggestion: true });
              if (suggestion.kind === 'category' && suggestion.categoryId) {
                setSearchInput('');
                updateParams({ q: null, categorias: suggestion.categoryId, categoria: null, nome: suggestion.label }, true);
              } else {
                setSearchInput(suggestion.value);
                updateParams({ q: suggestion.value }, true);
              }
            }}
          />
          <div className="catalog-quick-searches" aria-label="Sugestões rápidas">
            <span>Sugestões rápidas:</span>
            {quickSearches.map((term) => <button key={term} type="button" onClick={() => { setSearchInput(term); submitSearch(term); }}>{term}</button>)}
          </div>
          {campaignCount > 0 && (
            <div className="campaign-context"><Sparkles aria-hidden="true" /><p><strong>Curadoria iniciada pelo seu briefing.</strong> O radar aplicou apenas sinais confiáveis. Você pode remover ou combinar qualquer filtro abaixo.</p></div>
          )}
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
                    {catalogLoading ? 'Atualizando produtos…' : `Ver ${catalog.data.total.toLocaleString('pt-BR')} ${catalog.data.total === 1 ? 'produto' : 'produtos'}`}
                  </button>
                </footer>
              </div>
            </div>
          )}

          <div className="catalog-toolbar">
            <div>
              <h2 id="catalog-results-title">{query ? `Matchs para “${query}”` : campaignCount > 0 ? 'Curadoria para o seu briefing' : selectedCategoryIds.length > 1 ? 'Seu recorte de campanha' : selectedCategoryName || (filterPanelProfile === 'kits' ? 'Kits & combos' : filterPanelProfile === 'novos' ? 'Novos drops' : filterPanelProfile === 'destaques' ? 'Destaques da curadoria' : 'Radar completo')}</h2>
              <p aria-live="polite" aria-atomic="true">{catalogLoading ? 'Buscando produtos…' : catalogError ? 'Não foi possível concluir a busca.' : `${catalog.data.total.toLocaleString('pt-BR')} ${catalog.data.total === 1 ? 'produto encontrado' : 'produtos encontrados'}`}</p>
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
              {selectedCampaignLabels.map((item) => <button key={item.key} type="button" onClick={() => removeCampaignFilter(item.key)}>{item.label} <X size={14} /></button>)}
              {selectedCategoryIds.map((id) => <button key={id} type="button" onClick={() => toggleCategory(id)}>{categoryNameById.get(id) || 'Categoria'} <X size={14} /></button>)}
              {profileWasExplicitlySet && profile !== 'todos' && <button type="button" onClick={() => updateParams({ perfil: null })}>{PROFILE_OPTIONS.find((item) => item.value === profile)?.label} <X size={14} /></button>}
              {selectedColors.map((id) => <button key={id} type="button" onClick={() => toggleParamValue('cores', selectedColors, id)}>Cor: {filterLabel('color', id)} <X size={14} /></button>)}
              {selectedMaterials.map((id) => <button key={id} type="button" onClick={() => toggleParamValue('materiais', selectedMaterials, id)}>Material: {filterLabel('material', id)} <X size={14} /></button>)}
              {personalizable && <button type="button" onClick={() => updateParams({ personalizavel: null })}>Personalizável <X size={14} /></button>}
              {giftPackaging && <button type="button" onClick={() => updateParams({ embalagem: null })}>Com embalagem <X size={14} /></button>}
              <button className="active-filters__clear" type="button" onClick={clearAll}>Limpar todos</button>
            </div>
          )}

          {catalogLoading && <ProductGridSkeleton count={12} />}
          {catalogError && <CatalogError message={catalogError} onRetry={() => setRetryKey((key) => key + 1)} />}
          {!catalogLoading && !catalogError && catalog.data.products.length === 0 && <CatalogEmpty
            onClear={clearAll}
            suggestion={searchCorrection}
            onApplySuggestion={() => {
              if (!searchCorrection) return;
              setSearchInput(searchCorrection);
              submitSearch(searchCorrection, true);
            }}
          />}
          {!catalogLoading && !catalogError && catalog.data.products.length > 0 && (
            <>
              <div className="product-grid">
                {catalog.data.products.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    priority={index < 4}
                    categoryName={categoryNameById.get(product.mainCategoryId || '')}
                    comparison={{
                      selected: comparison.some((item) => item.id === product.id),
                      disabled: comparison.length >= 3,
                      onToggle: toggleComparison,
                      controlId: `compare-${product.id}`,
                      controlRef: (element) => {
                        if (element) comparisonControlRefs.current.set(product.id, element);
                        else comparisonControlRefs.current.delete(product.id);
                      },
                    }}
                  />
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
      <div className="container catalog-faq-wrap"><ContextualFaq scope="catalog" /></div>
      {comparison.length > 0 && (
        <aside className={`compare-tray ${comparisonExpanded ? 'is-expanded' : ''}`} aria-labelledby="compare-tray-title">
          <div className="container compare-tray__inner">
            <div className="compare-tray__header">
              <div>
                <span>Comparação local</span>
                <h2 id="compare-tray-title">{comparison.length} de 3 referências lado a lado</h2>
              </div>
              <div className="compare-tray__header-actions">
                <button className="compare-tray__toggle" type="button" onClick={() => setComparisonExpanded((current) => !current)} aria-expanded={comparisonExpanded} aria-controls="compare-tray-body">{comparisonExpanded ? 'Ocultar comparação' : 'Ver comparação'}</button>
                <button type="button" onClick={() => { setComparison([]); trackFunnelEvent('comparison_changed', { item_count: 0, action: 'cleared' }); }}>Limpar comparação</button>
              </div>
            </div>
            <div id="compare-tray-body" className="compare-tray__body">
            {comparisonNotice && <p className="compare-tray__notice" role="status">{comparisonNotice}</p>}
            <div className="compare-tray__items">
              {comparison.map((item) => (
                <article key={item.id} className="compare-tray__item">
                  <img src={item.imageUrl} alt="" width="72" height="72" referrerPolicy="no-referrer" onError={replaceBrokenProductImage} />
                  <div>
                    <Link to={`/produto/${item.slug}`}>{item.name}</Link>
                    <p>Cód. {item.sku} · {item.minQuantity > 1 ? `mín. ${item.minQuantity.toLocaleString('pt-BR')} un.` : 'quantidade a confirmar'}</p>
                  </div>
                  <button type="button" onClick={() => removeComparison(item)} aria-label={`Remover ${item.name} da comparação`}><X size={17} /></button>
                </article>
              ))}
            </div>
            {comparison.length > 1 && (
              <div className="compare-tray__table-wrap" tabIndex={0}>
                <table>
                  <caption>Comparação de informações publicadas no catálogo</caption>
                  <thead><tr><th scope="col">Critério</th>{comparison.map((item) => <th scope="col" key={item.id}><Link to={`/produto/${item.slug}`}>{item.name}</Link></th>)}</tr></thead>
                  <tbody>
                    {([
                      ['Quantidade mínima', comparison.map((item) => item.minQuantity > 1 ? `${item.minQuantity.toLocaleString('pt-BR')} un.` : 'A confirmar')],
                      ['Personalização', comparison.map((item) => item.allowsPersonalization ? 'A confirmar com o briefing' : 'Consulte nosso time de especialistas')],
                      ['Cores publicadas', comparison.map((item) => item.colors.length ? `${item.colors.length} ${item.colors.length === 1 ? 'opção' : 'opções'}` : 'A confirmar')],
                      ['Materiais publicados', comparison.map((item) => item.materials.length ? item.materials.join(', ') : 'A confirmar')],
                      ['Dimensões', comparison.map(comparisonDimensions)],
                      ['Capacidade', comparison.map((item) => item.dimensions.capacityMl ? `${item.dimensions.capacityMl.toLocaleString('pt-BR')} ml` : 'Não publicada')],
                      ['Embalagem', comparison.map((item) => item.hasCommercialPackaging ? 'Individual publicada' : 'A confirmar')],
                    ] as Array<[string, string[]]>).map(([label, values]) => <tr key={label}><th scope="row">{label}</th>{values.map((value, index) => <td key={comparison[index].id} className={new Set(values).size > 1 ? 'is-different' : undefined}>{value}</td>)}</tr>)}
                  </tbody>
                </table>
              </div>
            )}
            </div>
          </div>
        </aside>
      )}
    </>
  );
}
