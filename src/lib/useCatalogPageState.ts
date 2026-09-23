import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { trackFunnelEvent } from './analytics';
import { fetchProductsByIds, sanitizeSearch } from './catalog';
import {
  campaignBriefFromSelection,
  campaignLabels,
  campaignSelectionCount,
  parseCampaignSelection,
  resolveCampaignFilters,
  type CampaignSelection,
} from './campaignPresets';
import { normalizeCampaignBrief } from './campaignBrief';
import {
  categoryQueryIds,
  colorFilterIds,
  materialFilterIds,
  parseCatalogPage,
  parseCategoryIds,
  parseFilterIds,
  serializeFilterIds,
  type ProfileParam,
} from './catalogFilters';
import { loadCatalogComparison, saveCatalogComparison } from './catalogComparison';
import { rankCatalogProducts } from './catalogRanking';
import { useAllCategories, useCatalog } from './hooks';
import { suggestSearchCorrection } from './search';
import { useQuoteCart } from '../context/quoteCart';
import type { CatalogProduct } from '../types';

function validProfile(value: string | null): ProfileParam {
  return value === 'destaques' || value === 'novos' || value === 'kits' ? value : 'todos';
}

function validSort(value: string | null): 'curadoria' | 'recentes' | 'nome' {
  return value === 'recentes' || value === 'nome' ? value : 'curadoria';
}

/** Estado e efeitos do radar, separado da apresentação para tornar contratos
 * de URL, campanha, comparação e busca verificáveis sem acoplar à marcação. */
export function useCatalogPageState() {
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
    occasion: { id: params.get('ocasiao'), name: params.get('ocasiao_nome'), date: params.get('ocasiao_data') },
  }), [params]);
  const [searchInput, setSearchInput] = useState(query);
  const [retryKey, setRetryKey] = useState(0);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [comparison, setComparison] = useState<CatalogProduct[]>(loadCatalogComparison);
  const [comparisonExpanded, setComparisonExpanded] = useState(() => typeof window === 'undefined' || window.innerWidth > 760);
  const [comparisonNotice, setComparisonNotice] = useState('');
  const comparisonControlRefs = useRef(new Map<string, HTMLButtonElement>());
  // Uma revalidação anterior pode terminar depois de uma inclusão mais recente.
  // Sem este contador, a resposta menor (ex.: 1 item) removia silenciosamente
  // os itens 2 e 3 que a pessoa acabou de colocar na comparação.
  const comparisonRefreshEpochRef = useRef(0);
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
  const catalogCategoryIds = useMemo(() => categoryQueryIds(categories.data, effectiveCategoryIds), [categories.data, effectiveCategoryIds]);
  const effectiveColors = [...new Set([...selectedColors, ...campaignFilters.colors])];
  const effectiveMaterials = [...new Set([...selectedMaterials, ...campaignFilters.materials])];
  const effectivePersonalizable = personalizable || Boolean(campaignFilters.personalizable);
  const effectiveProfile = profileWasExplicitlySet
    ? profile === 'destaques' ? 'featured' : profile === 'novos' ? 'new' : profile === 'kits' ? 'kits' : 'all'
    : campaignFilters.profile || (profile === 'destaques' ? 'featured' : profile === 'novos' ? 'new' : profile === 'kits' ? 'kits' : 'all');
  const filterPanelProfile: ProfileParam = effectiveProfile === 'featured' ? 'destaques' : effectiveProfile === 'new' ? 'novos' : effectiveProfile === 'kits' ? 'kits' : 'todos';
  const catalog = useCatalog({
    page, pageSize: 24, search: query, categoryIds: catalogCategoryIds, colors: effectiveColors, materials: effectiveMaterials,
    personalizable: effectivePersonalizable, giftPackaging, maxMinQuantity: campaignFilters.maxMinQuantity, profile: effectiveProfile,
    sort: sort === 'recentes' ? 'newest' : sort === 'nome' ? 'name' : 'curated',
  }, retryKey, catalogEnabled);
  const catalogError = campaignNeedsCategories
    ? categories.error || (campaignCategoryMissing ? 'Não foi possível localizar a categoria de tecnologia neste momento.' : catalog.error)
    : catalog.error;
  const catalogLoading = !catalogError && ((campaignNeedsCategories && categories.loading) || catalog.loading);
  // "Nome" e "Mais recentes" são escolhas explícitas da pessoa. A API já
  // ordena esse recorte (inclusive entre páginas); reordená-lo aqui por flags
  // editoriais quebraria o contrato visual e faria a página 1 parecer correta
  // enquanto a ordem global permanecesse inconsistente. Curadoria é aplicada
  // apenas quando essa é a ordem selecionada.
  const rankedCatalogProducts = useMemo(() => sort === 'curadoria'
    ? rankCatalogProducts(catalog.data.products, { query, campaign: campaignSelection })
    : catalog.data.products,
  [campaignSelection, catalog.data.products, query, sort]);
  const rankedCatalog = useMemo(() => ({
    ...catalog,
    data: { ...catalog.data, products: rankedCatalogProducts },
  }), [catalog, rankedCatalogProducts]);
  const categoryNameById = useMemo(() => new Map(categories.data.map((item) => [item.id, item.name])), [categories.data]);
  const selectedCategoryId = selectedCategoryIds[0];
  const selectedCategoryName = selectedCategoryIds.length === 1 && selectedCategoryId ? categoryNameById.get(selectedCategoryId) || categoryNameParam : '';
  const totalPages = Math.max(1, Math.ceil(catalog.data.total / catalog.data.pageSize));
  const activeFilterCount = Number(Boolean(query)) + selectedCategoryIds.length + selectedColors.length + selectedMaterials.length
    + Number(profileWasExplicitlySet && profile !== 'todos') + Number(effectivePersonalizable) + Number(giftPackaging) + campaignCount;
  const selectedCampaignLabels = campaignLabels(campaignSelection);
  const paramsKey = params.toString();
  const searchCorrection = useMemo(() => suggestSearchCorrection(query), [query]);
  const comparisonIds = useMemo(() => comparison.map((product) => product.id).sort().join(','), [comparison]);

  useEffect(() => setSearchInput(query), [query]);
  useEffect(() => {
    const brief = occasionCampaign || campaignBriefFromSelection(campaignSelection);
    if (brief) cart.setCampaign(brief);
    // campaignKey estabiliza campaignSelection, lido pela closure deste efeito.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignKey, cart, occasionCampaign]);
  useEffect(() => { saveCatalogComparison(comparison); }, [comparison]);
  useEffect(() => {
    if (!comparisonIds) return;
    const controller = new AbortController();
    const requestEpoch = ++comparisonRefreshEpochRef.current;
    void fetchProductsByIds(comparisonIds.split(',').filter(Boolean), controller.signal)
      .then((available) => {
        if (comparisonRefreshEpochRef.current !== requestEpoch) return;
        const byId = new Map(available.map((product) => [product.id, product]));
        setComparison((current) => {
          // A checagem dentro do setter cobre a janela entre a resposta HTTP e
          // a atualização de estado concorrente do React.
          if (current.map((product) => product.id).sort().join(',') !== comparisonIds) return current;
          const next = current.flatMap((product) => byId.has(product.id) ? [byId.get(product.id)!] : []);
          const missing = current.length - next.length;
          setComparisonNotice(missing ? `${missing === 1 ? 'Uma referência não está mais ativa e foi retirada da comparação.' : `${missing} referências não estão mais ativas e foram retiradas da comparação.`}` : '');
          return next;
        });
      })
      .catch(() => {
        if (comparisonRefreshEpochRef.current === requestEpoch && !controller.signal.aborted) {
          setComparisonNotice('Não foi possível atualizar as referências agora; os dados exibidos são o último retrato salvo.');
        }
      });
    return () => {
      controller.abort();
      // Invalida callbacks que já tenham passado pela camada de fetch.
      if (comparisonRefreshEpochRef.current === requestEpoch) comparisonRefreshEpochRef.current += 1;
    };
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
    if (query) next.set('q', query); else next.delete('q');
    setParams(next, { replace: true });
  }, [params, query, rawQuery, setParams]);
  useEffect(() => {
    if (catalogLoading || catalogError || page <= totalPages) return;
    const next = new URLSearchParams(params);
    if (totalPages > 1) next.set('pagina', String(totalPages)); else next.delete('pagina');
    setParams(next, { replace: true });
  }, [catalogError, catalogLoading, page, params, setParams, totalPages]);
  useEffect(() => {
    if (catalogLoading || catalogError) return;
    const viewKey = `${paramsKey}|${catalog.data.total}`;
    if (trackedCatalogViewsRef.current.has(viewKey)) return;
    trackedCatalogViewsRef.current.add(viewKey);
    trackFunnelEvent('catalog_result_viewed', { result_count: catalog.data.total, page: catalog.data.page, active_filters: activeFilterCount, campaign: campaignCount > 0 });
  }, [activeFilterCount, campaignCount, catalog.data.page, catalog.data.total, catalogError, catalogLoading, paramsKey]);
  useEffect(() => {
    if (!mobileFiltersOpen) return;
    const triggerButton = mobileTriggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    mobileCloseRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') { setMobileFiltersOpen(false); return; }
      if (event.key !== 'Tab' || !mobileDialogRef.current) return;
      const focusable = [...mobileDialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')]
        .filter((element) => element.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', handleKeyDown); triggerButton?.focus(); };
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
  function clearAll() { setSearchInput(''); setParams({}); }
  function toggleParamValue(key: 'cores' | 'materiais', current: string[], value: string) {
    updateParams({ [key]: serializeFilterIds(current.includes(value) ? current.filter((item) => item !== value) : [...current, value]) });
  }
  function toggleCategory(id: string) {
    const next = selectedCategoryIds.includes(id) ? selectedCategoryIds.filter((item) => item !== id) : [...selectedCategoryIds, id];
    updateParams({ categorias: serializeFilterIds(next), categoria: null, nome: null });
  }
  function removeCampaignFilter(key: keyof CampaignSelection) {
    updateParams({ [key === 'moment' ? 'momento' : key === 'audience' ? 'publico' : key === 'scale' ? 'escala' : 'clima']: null });
  }
  function toggleComparison(product: CatalogProduct) {
    setComparison((current) => {
      const exists = current.some((item) => item.id === product.id);
      if (exists) { const next = current.filter((item) => item.id !== product.id); trackFunnelEvent('comparison_changed', { item_count: next.length, action: 'removed' }); return next; }
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
  function clearComparison() { setComparison([]); trackFunnelEvent('comparison_changed', { item_count: 0, action: 'cleared' }); }

  const filterPanelProps = {
    categories: categories.data, categoriesLoading: categories.loading, categoriesError: categories.error, profile: filterPanelProfile,
    selectedCategoryIds, selectedColors: effectiveColors, selectedMaterials: effectiveMaterials, personalizable, giftPackaging,
    onProfileChange: (value: ProfileParam) => updateParams({ perfil: value === 'todos' && !campaignCount ? null : value }),
    onToggleCategory: toggleCategory, onClearCategories: () => updateParams({ categorias: null, categoria: null, nome: null }),
    onRetryCategories: () => setRetryKey((key) => key + 1),
    onToggleColor: (value: string) => campaignFilters.colors.includes(value) && !selectedColors.includes(value) ? removeCampaignFilter('mood') : toggleParamValue('cores', selectedColors, value),
    onToggleMaterial: (value: string) => campaignFilters.materials.includes(value) && !selectedMaterials.includes(value) ? removeCampaignFilter('mood') : toggleParamValue('materiais', selectedMaterials, value),
    onPersonalizableChange: (value: boolean) => campaignFilters.personalizable && !value && !personalizable ? removeCampaignFilter('audience') : updateParams({ personalizavel: value ? '1' : null }),
    onGiftPackagingChange: (value: boolean) => updateParams({ embalagem: value ? '1' : null }),
  };

  return {
    activeFilterCount, campaignCount, catalog: rankedCatalog, catalogError, catalogLoading, categoryNameById, clearAll, clearComparison, comparison,
    comparisonControlRefs, comparisonExpanded, comparisonNotice, effectiveColors, effectiveMaterials, filterPanelProfile, filterPanelProps,
    giftPackaging, mobileCloseRef, mobileDialogRef, mobileFiltersOpen, mobileTriggerRef, page, personalizable, profile,
    profileWasExplicitlySet, query, removeCampaignFilter, removeComparison, searchCorrection, searchInput, selectedCampaignLabels,
    selectedCategoryIds, selectedCategoryName, selectedColors, selectedMaterials, setComparisonExpanded, setMobileFiltersOpen,
    setSearchInput, setRetryKey, sort, submitSearch, toggleCategory, toggleComparison, toggleParamValue, totalPages, updateParams,
  };
}
