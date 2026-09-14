import { ChevronRight, Gift, Search, Sparkles } from 'lucide-react';
import { type CSSProperties, type ReactNode, useEffect, useMemo, useState } from 'react';
import { COLOR_FILTERS, MATERIAL_FILTERS, normalizeForSearch, PROFILE_OPTIONS, type ProfileParam } from '../lib/catalogFilters';
import type { Category } from '../types';

interface CatalogFilterPanelProps {
  instanceId: 'desktop' | 'mobile';
  categories: Category[];
  categoriesLoading: boolean;
  categoriesError?: string | null;
  profile: ProfileParam;
  selectedCategoryIds: string[];
  selectedColors: string[];
  selectedMaterials: string[];
  personalizable: boolean;
  giftPackaging: boolean;
  onProfileChange: (value: ProfileParam) => void;
  onToggleCategory: (id: string) => void;
  onClearCategories: () => void;
  onRetryCategories?: () => void;
  onToggleColor: (id: string) => void;
  onToggleMaterial: (id: string) => void;
  onPersonalizableChange: (value: boolean) => void;
  onGiftPackagingChange: (value: boolean) => void;
}

function displayName(name: string): string {
  return name.replaceAll(' | ', ' & ');
}

export function CatalogFilterPanel({
  instanceId,
  categories,
  categoriesLoading,
  categoriesError,
  profile,
  selectedCategoryIds,
  selectedColors,
  selectedMaterials,
  personalizable,
  giftPackaging,
  onProfileChange,
  onToggleCategory,
  onClearCategories,
  onRetryCategories,
  onToggleColor,
  onToggleMaterial,
  onPersonalizableChange,
  onGiftPackagingChange,
}: CatalogFilterPanelProps) {
  const [categorySearch, setCategorySearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showAllMaterials, setShowAllMaterials] = useState(false);
  const selectedCategoryKey = selectedCategoryIds.join(',');
  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const childrenByParent = useMemo(() => {
    const map = new Map<string | null, Category[]>();
    categories.forEach((category) => {
      const siblings = map.get(category.parentId) ?? [];
      siblings.push(category);
      map.set(category.parentId, siblings);
    });
    map.forEach((items) => items.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
    return map;
  }, [categories]);

  useEffect(() => {
    if (!selectedCategoryIds.length) return;
    setExpanded((current) => {
      const next = new Set(current);
      selectedCategoryIds.forEach((id) => {
        let currentId = categoryById.get(id)?.parentId ?? null;
        const visited = new Set<string>();
        while (currentId && !visited.has(currentId)) {
          visited.add(currentId);
          next.add(currentId);
          currentId = categoryById.get(currentId)?.parentId ?? null;
        }
      });
      return next;
    });
    // selectedCategoryKey é a chave estável (join(',')) derivada de
    // selectedCategoryIds, usada deliberadamente no lugar do array para não
    // re-executar o efeito a cada render por mudança de referência. Incluir
    // selectedCategoryIds aqui reintroduziria exatamente o loop que a chave
    // existe para evitar; o efeito lê o array corrente via closure, e a chave
    // garante que ele só roda quando o conteúdo realmente muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryById, selectedCategoryKey]);

  const normalizedCategorySearch = normalizeForSearch(categorySearch.trim());
  const categoryMatches = normalizedCategorySearch
    ? categories
      .filter((category) => normalizeForSearch(category.name).includes(normalizedCategorySearch))
      .slice(0, 40)
    : [];
  const visibleMaterials = showAllMaterials ? MATERIAL_FILTERS : MATERIAL_FILTERS.slice(0, 8);

  function renderCategory(category: Category, depth = 0): ReactNode {
    const children = childrenByParent.get(category.id) ?? [];
    const isExpanded = expanded.has(category.id);
    const isSelected = selectedCategoryIds.includes(category.id);
    const inputId = `${instanceId}-category-${category.id}`;
    return (
      <li key={category.id} className="category-tree__item">
        <div className={`category-tree__row ${isSelected ? 'is-selected' : ''}`} style={{ '--category-depth': depth } as CSSProperties}>
          {children.length > 0 ? (
            <button
              type="button"
              className="category-tree__expand"
              aria-label={`${isExpanded ? 'Recolher' : 'Expandir'} ${displayName(category.name)}`}
              aria-expanded={isExpanded}
              onClick={() => setExpanded((current) => {
                const next = new Set(current);
                if (next.has(category.id)) next.delete(category.id);
                else next.add(category.id);
                return next;
              })}
            >
              <ChevronRight size={15} />
            </button>
          ) : <span className="category-tree__spacer" />}
          <label htmlFor={inputId}>
            <input id={inputId} type="checkbox" checked={isSelected} onChange={() => onToggleCategory(category.id)} />
            <span>{displayName(category.name)}</span>
          </label>
        </div>
        {children.length > 0 && isExpanded && (
          <ul>{children.map((child) => renderCategory(child, depth + 1))}</ul>
        )}
      </li>
    );
  }

  return (
    <div className="catalog-filters__content">
      <section className="filter-group" aria-labelledby={`${instanceId}-profiles-title`}>
        <div className="filter-group__heading"><h2 id={`${instanceId}-profiles-title`}>Coleções rápidas</h2></div>
        <div className="profile-filter">
          {PROFILE_OPTIONS.map((item) => (
            <button
              key={item.value}
              type="button"
              className={profile === item.value ? 'is-active' : ''}
              aria-pressed={profile === item.value}
              onClick={() => onProfileChange(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className="filter-group" aria-labelledby={`${instanceId}-categories-title`}>
        <div className="filter-group__heading">
          <h2 id={`${instanceId}-categories-title`}>Categorias</h2>
          {selectedCategoryIds.length > 0 && <button type="button" onClick={onClearCategories}>Limpar</button>}
        </div>
        <label className="filter-search" htmlFor={`${instanceId}-category-search`}>
          <Search size={15} aria-hidden="true" />
          <span className="sr-only">Buscar categoria</span>
          <input
            id={`${instanceId}-category-search`}
            value={categorySearch}
            onChange={(event) => setCategorySearch(event.target.value)}
            placeholder="Buscar categoria"
          />
          {categorySearch && <button type="button" aria-label="Limpar busca de categoria" onClick={() => setCategorySearch('')}>×</button>}
        </label>
        {categoriesLoading && <p className="filter-status">Carregando categorias…</p>}
        {!categoriesLoading && categories.length === 0 && (
          <div className="filter-status" role={categoriesError ? 'alert' : undefined}>
            <p>Categorias indisponíveis.</p>
            {categoriesError && onRetryCategories && <button className="text-button" type="button" onClick={onRetryCategories}>Tentar novamente</button>}
          </div>
        )}
        {!categoriesLoading && categories.length > 0 && (
          normalizedCategorySearch ? (
            <ul className="category-tree category-tree--matches">
              {categoryMatches.map((category) => renderCategory(category))}
              {categoryMatches.length === 0 && <li className="filter-status">Nenhuma categoria encontrada.</li>}
            </ul>
          ) : (
            <ul className="category-tree">{(childrenByParent.get(null) ?? []).map((category) => renderCategory(category))}</ul>
          )
        )}
      </section>

      <section className="filter-group" aria-labelledby={`${instanceId}-colors-title`}>
        <div className="filter-group__heading"><h2 id={`${instanceId}-colors-title`}>Cores</h2></div>
        <div className="color-filter">
          {COLOR_FILTERS.map((color) => {
            const selected = selectedColors.includes(color.id);
            return (
              <button
                key={color.id}
                type="button"
                className={selected ? 'is-active' : ''}
                aria-pressed={selected}
                aria-label={`Cor ${color.label}${selected ? ', selecionada' : ''}`}
                onClick={() => onToggleColor(color.id)}
              >
                <span className="color-filter__swatch" style={{ background: color.hex }} />
                <span>{color.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="filter-group" aria-labelledby={`${instanceId}-materials-title`}>
        <div className="filter-group__heading"><h2 id={`${instanceId}-materials-title`}>Materiais</h2></div>
        <div className="material-filter">
          {visibleMaterials.map((material) => (
            <label key={material.id}>
              <input type="checkbox" checked={selectedMaterials.includes(material.id)} onChange={() => onToggleMaterial(material.id)} />
              <span>{material.label}</span>
            </label>
          ))}
        </div>
        <button className="filter-show-more" type="button" onClick={() => setShowAllMaterials((value) => !value)}>
          {showAllMaterials ? 'Ver menos' : `Ver todos (${MATERIAL_FILTERS.length})`}
        </button>
      </section>

      <section className="filter-group" aria-labelledby={`${instanceId}-details-title`}>
        <div className="filter-group__heading"><h2 id={`${instanceId}-details-title`}>Detalhes que ajudam</h2></div>
        <div className="boolean-filter">
          <label>
            <input type="checkbox" checked={personalizable} onChange={(event) => onPersonalizableChange(event.target.checked)} />
            <span className="boolean-filter__icon"><Sparkles size={16} /></span>
            <span><strong>Personalizável</strong><small>Pronto para receber sua marca</small></span>
          </label>
          <label>
            <input type="checkbox" checked={giftPackaging} onChange={(event) => onGiftPackagingChange(event.target.checked)} />
            <span className="boolean-filter__icon"><Gift size={16} /></span>
            <span><strong>Com embalagem</strong><small>Mais presença na entrega</small></span>
          </label>
        </div>
      </section>

      <div className="filter-reassurance"><span>?</span><p><strong>O briefing está abstrato?</strong> A gente ajuda a transformar intenção em produto.</p></div>
    </div>
  );
}
