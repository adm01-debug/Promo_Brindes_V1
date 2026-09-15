import { ChevronLeft, ChevronRight, Filter, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { CatalogComparisonTray } from '../components/CatalogComparisonTray';
import { CatalogFilterPanel } from '../components/CatalogFilterPanel';
import { CatalogEmpty, CatalogError, ProductGridSkeleton } from '../components/CatalogFeedback';
import { ContextualFaq } from '../components/ContextualFaq';
import { ProductCard } from '../components/ProductCard';
import { SearchAutocomplete } from '../components/SearchAutocomplete';
import { Seo } from '../components/Seo';
import { trackFunnelEvent } from '../lib/analytics';
import { filterLabel, PROFILE_OPTIONS } from '../lib/catalogFilters';
import { useCatalogPageState } from '../lib/useCatalogPageState';

const quickSearches = ['camiseta', 'kit', 'squeeze', 'carregador', 'reciclado'];

export default function CatalogPage() {
  const state = useCatalogPageState();
  const {
    activeFilterCount, campaignCount, catalog, catalogError, catalogLoading, categoryNameById, clearAll, clearComparison, comparison,
    comparisonControlRefs, comparisonExpanded, comparisonNotice, filterPanelProfile, filterPanelProps,
    giftPackaging, mobileCloseRef, mobileDialogRef, mobileFiltersOpen, mobileTriggerRef, page, personalizable, profile,
    profileWasExplicitlySet, query, removeCampaignFilter, removeComparison, searchCorrection, searchInput, selectedCampaignLabels,
    selectedCategoryIds, selectedCategoryName, selectedColors, selectedMaterials, setComparisonExpanded, setMobileFiltersOpen,
    setSearchInput, setRetryKey, sort, submitSearch, toggleCategory, toggleComparison, toggleParamValue, totalPages, updateParams,
  } = state;

  return (
    <>
      <Seo title="Radar de brindes corporativos" description="Descubra produtos, kits e ideias com potencial para sua próxima campanha e monte um briefing visual." path="/catalogo" />
      <header className="catalog-hero"><div className="container">
        <span className="section-kicker">Busca visual · curadoria humana</span>
        <h1>Sua seleção começa aqui.</h1>
        <p>Explore sem login, adicione o que conversa com a campanha e deixe valores, personalização e prazo para a proposta.</p>
        <SearchAutocomplete
          variant="catalog" inputId="catalog-search" label="Buscar no catálogo" value={searchInput} placeholder="Camiseta, kit, squeeze, tech ou código…"
          categories={filterPanelProps.categories} onChange={setSearchInput} onSubmit={(value) => submitSearch(value)}
          onClear={() => { setSearchInput(''); updateParams({ q: null }); }}
          onSelect={(suggestion) => {
            trackFunnelEvent('search_started', { source: 'catalog', query_length: suggestion.value.length, suggestion: true });
            if (suggestion.kind === 'category' && suggestion.categoryId) { setSearchInput(''); updateParams({ q: null, categorias: suggestion.categoryId, categoria: null, nome: suggestion.label }, true); }
            else { setSearchInput(suggestion.value); updateParams({ q: suggestion.value }, true); }
          }}
        />
        <div className="catalog-quick-searches" aria-label="Sugestões rápidas"><span>Sugestões rápidas:</span>{quickSearches.map((term) => <button key={term} type="button" onClick={() => { setSearchInput(term); submitSearch(term); }}>{term}</button>)}</div>
        {campaignCount > 0 && <div className="campaign-context"><Sparkles aria-hidden="true" /><p><strong>Curadoria iniciada pelo seu briefing.</strong> O radar aplicou apenas sinais confiáveis. Você pode remover ou combinar qualquer filtro abaixo.</p></div>}
      </div></header>

      <div className="container catalog-layout">
        <aside className="catalog-filters" aria-label="Filtros do catálogo">
          <div className="catalog-filters__title"><SlidersHorizontal size={18} /><strong>Afine o radar</strong>{activeFilterCount > 0 && <button type="button" onClick={clearAll}>Limpar tudo</button>}</div>
          <CatalogFilterPanel instanceId="desktop" {...filterPanelProps} />
        </aside>
        <section className="catalog-results" aria-labelledby="catalog-results-title">
          <button ref={mobileTriggerRef} className="mobile-filter-trigger" type="button" aria-haspopup="dialog" onClick={() => setMobileFiltersOpen(true)}><Filter size={18} /> Afinar o radar{activeFilterCount > 0 && <span>{activeFilterCount}</span>}</button>
          {mobileFiltersOpen && <div className="filter-drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setMobileFiltersOpen(false); }}>
            <div ref={mobileDialogRef} className="filter-drawer" role="dialog" aria-modal="true" aria-labelledby="mobile-filter-title">
              <header className="filter-drawer__header"><div><span>Superfiltro</span><h2 id="mobile-filter-title">Afine seu radar</h2></div><button ref={mobileCloseRef} type="button" aria-label="Fechar filtros" onClick={() => setMobileFiltersOpen(false)}><X /></button></header>
              <div className="filter-drawer__body"><CatalogFilterPanel instanceId="mobile" {...filterPanelProps} /></div>
              <footer className="filter-drawer__footer">{activeFilterCount > 0 && <button className="filter-drawer__clear" type="button" onClick={clearAll}>Limpar tudo</button>}<button className="filter-drawer__apply" type="button" onClick={() => setMobileFiltersOpen(false)}>{catalogLoading ? 'Atualizando produtos…' : `Ver ${catalog.data.total.toLocaleString('pt-BR')} ${catalog.data.total === 1 ? 'produto' : 'produtos'}`}</button></footer>
            </div>
          </div>}
          <div className="catalog-toolbar"><div>
            <h2 id="catalog-results-title">{query ? `Matchs para “${query}”` : campaignCount > 0 ? 'Curadoria para o seu briefing' : selectedCategoryIds.length > 1 ? 'Seu recorte de campanha' : selectedCategoryName || (filterPanelProfile === 'kits' ? 'Kits & combos' : filterPanelProfile === 'novos' ? 'Novos drops' : filterPanelProfile === 'destaques' ? 'Destaques da curadoria' : 'Radar completo')}</h2>
            <p aria-live="polite" aria-atomic="true">{catalogLoading ? 'Buscando produtos…' : catalogError ? 'Não foi possível concluir a busca.' : `${catalog.data.total.toLocaleString('pt-BR')} ${catalog.data.total === 1 ? 'produto encontrado' : 'produtos encontrados'}`}</p>
          </div><label className="sort-control">Ordenar por<select value={sort} onChange={(event) => updateParams({ ordem: event.target.value === 'curadoria' ? null : event.target.value }, true)}><option value="curadoria">Curadoria Promo</option><option value="recentes">Mais recentes</option><option value="nome">Nome A–Z</option></select></label></div>
          {activeFilterCount > 0 && <div className="active-filters" aria-label="Filtros aplicados">
            <span>Filtros:</span>{query && <button type="button" onClick={() => { setSearchInput(''); updateParams({ q: null }); }}>Busca: {query} <X size={14} /></button>}
            {selectedCampaignLabels.map((item) => <button key={item.key} type="button" onClick={() => removeCampaignFilter(item.key)}>{item.label} <X size={14} /></button>)}
            {selectedCategoryIds.map((id) => <button key={id} type="button" onClick={() => toggleCategory(id)}>{categoryNameById.get(id) || 'Categoria'} <X size={14} /></button>)}
            {profileWasExplicitlySet && profile !== 'todos' && <button type="button" onClick={() => updateParams({ perfil: null })}>{PROFILE_OPTIONS.find((item) => item.value === profile)?.label} <X size={14} /></button>}
            {selectedColors.map((id) => <button key={id} type="button" onClick={() => toggleParamValue('cores', selectedColors, id)}>Cor: {filterLabel('color', id)} <X size={14} /></button>)}
            {selectedMaterials.map((id) => <button key={id} type="button" onClick={() => toggleParamValue('materiais', selectedMaterials, id)}>Material: {filterLabel('material', id)} <X size={14} /></button>)}
            {personalizable && <button type="button" onClick={() => updateParams({ personalizavel: null })}>Personalizável <X size={14} /></button>}{giftPackaging && <button type="button" onClick={() => updateParams({ embalagem: null })}>Com embalagem <X size={14} /></button>}<button className="active-filters__clear" type="button" onClick={clearAll}>Limpar todos</button>
          </div>}
          {catalogLoading && <ProductGridSkeleton count={12} />}
          {catalogError && <CatalogError message={catalogError} onRetry={() => setRetryKey((key) => key + 1)} />}
          {!catalogLoading && !catalogError && catalog.data.products.length === 0 && <CatalogEmpty onClear={clearAll} suggestion={searchCorrection} onApplySuggestion={() => { if (!searchCorrection) return; setSearchInput(searchCorrection); submitSearch(searchCorrection, true); }} />}
          {!catalogLoading && !catalogError && catalog.data.products.length > 0 && <>
            <div className="product-grid">{catalog.data.products.map((product, index) => <ProductCard key={product.id} product={product} priority={index < 4} categoryName={categoryNameById.get(product.mainCategoryId || '')} comparison={{ selected: comparison.some((item) => item.id === product.id), disabled: comparison.length >= 3, onToggle: toggleComparison, controlId: `compare-${product.id}`, controlRef: (element) => { if (element) comparisonControlRefs.current.set(product.id, element); else comparisonControlRefs.current.delete(product.id); } }} />)}</div>
            {totalPages > 1 && <nav className="pagination" aria-label="Paginação do catálogo"><button type="button" disabled={page <= 1} onClick={() => updateParams({ pagina: String(page - 1) }, true)}><ChevronLeft size={18} /> Anterior</button><span>Página <strong>{page}</strong> de {totalPages}</span><button type="button" disabled={page >= totalPages} onClick={() => updateParams({ pagina: String(page + 1) }, true)}>Próxima <ChevronRight size={18} /></button></nav>}
          </>}
        </section>
      </div>
      <div className="container catalog-faq-wrap"><ContextualFaq scope="catalog" /></div>
      <CatalogComparisonTray comparison={comparison} expanded={comparisonExpanded} notice={comparisonNotice} onToggleExpanded={() => setComparisonExpanded((current) => !current)} onClear={clearComparison} onRemove={removeComparison} />
    </>
  );
}
