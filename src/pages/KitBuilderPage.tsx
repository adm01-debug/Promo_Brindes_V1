import { ArrowRight, Check, PackagePlus, Plus, Search, ShoppingBag, Sparkles, Trash2 } from 'lucide-react';
import { type FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Seo } from '../components/Seo';
import { useQuoteCart } from '../context/quoteCart';
import { trackFunnelEvent } from '../lib/analytics';
import { useCatalog } from '../lib/hooks';
import { replaceBrokenProductImage } from '../lib/images';
import { buildKitQuoteItems, kitTemplates, kitTotalUnits, mergeKitIntoSelection, minimumKitQuantity, type KitComponent } from '../lib/kitBuilder';
import type { CatalogProduct } from '../types';

interface SelectedComponent { product: CatalogProduct; unitsPerKit: number; }

export default function KitBuilderPage() {
  const cart = useQuoteCart();
  const navigate = useNavigate();
  const [templateId, setTemplateId] = useState(kitTemplates[1]!.id);
  const template = kitTemplates.find((item) => item.id === templateId) || kitTemplates[1]!;
  const [activeSlotId, setActiveSlotId] = useState(template.slots[0]!.id);
  const [selected, setSelected] = useState<Record<string, SelectedComponent>>({});
  const [kitName, setKitName] = useState('Minha composição');
  const [kitQuantity, setKitQuantity] = useState(100);
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const catalog = useCatalog({ search: query || undefined, pageSize: 12, sort: 'curated' });
  const components = useMemo<KitComponent[]>(() => template.slots.flatMap((slot) => {
    const choice = selected[slot.id];
    return choice ? [{ slotId: slot.id, slotLabel: slot.label, ...choice }] : [];
  }), [selected, template]);
  const minimum = minimumKitQuantity(components);
  const complete = components.length === template.slots.length;
  const usedProducts = new Set(components.map((item) => item.product.id));

  function selectTemplate(id: string) {
    const next = kitTemplates.find((item) => item.id === id);
    if (!next) return;
    setTemplateId(id);
    setActiveSlotId(next.slots[0]!.id);
    setSelected({});
    setError('');
  }

  function chooseProduct(product: CatalogProduct) {
    if (usedProducts.has(product.id) && selected[activeSlotId]?.product.id !== product.id) {
      setError('Este produto já ocupa outro espaço. Ajuste as unidades por kit ou escolha outra referência.');
      return;
    }
    setSelected((current) => ({ ...current, [activeSlotId]: { product, unitsPerKit: current[activeSlotId]?.unitsPerKit || 1 } }));
    const currentIndex = template.slots.findIndex((slot) => slot.id === activeSlotId);
    const nextEmpty = template.slots.slice(currentIndex + 1).find((slot) => !selected[slot.id]) || template.slots.find((slot) => !selected[slot.id]);
    if (nextEmpty) setActiveSlotId(nextEmpty.id);
    setError('');
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setQuery(searchInput.trim().slice(0, 80));
  }

  function addKitToBriefing() {
    if (!complete) { setError('Escolha um produto para cada espaço da composição.'); return; }
    if (!kitName.trim()) { setError('Dê um nome para reconhecer esta composição.'); return; }
    if (kitQuantity < minimum) { setError(`A composição precisa de pelo menos ${minimum.toLocaleString('pt-BR')} kits para respeitar os mínimos dos componentes.`); return; }
    const items = buildKitQuoteItems({ id: crypto.randomUUID(), name: kitName, quantity: kitQuantity, components });
    const merged = mergeKitIntoSelection(cart.items, items);
    if (!items.length || !merged) { setError('A composição ultrapassa o limite da seleção ou contém dados inconsistentes.'); return; }
    cart.replaceItems(merged);
    cart.setSelectionTitle(kitName);
    trackFunnelEvent('kit_composition_added', { component_count: items.length, kit_quantity: kitQuantity });
    void navigate('/orcamento');
  }

  return (
    <>
      <Seo title="Monte seu kit" description="Combine produtos reais do catálogo, calcule quantidades por kit e envie a composição em um briefing." path="/montar-kit" />
      <header className="kit-builder-hero"><div className="container"><span className="section-kicker">Mix & match · do seu jeito</span><h1>Monte um kit que<br /><em>faça sentido.</em></h1><p>Escolha a estrutura, substitua cada componente e veja a conta completa antes de pedir uma proposta. Sem preço ou estoque fictício.</p></div></header>
      <main className="container kit-builder">
        <section className="kit-builder__config" aria-labelledby="kit-config-title">
          <div className="section-heading"><span className="section-kicker">01 · Estrutura</span><h2 id="kit-config-title">Comece pelo tamanho da experiência.</h2></div>
          <div className="kit-template-grid">
            {kitTemplates.map((item) => <button key={item.id} type="button" className={item.id === template.id ? 'is-active' : ''} onClick={() => selectTemplate(item.id)} aria-pressed={item.id === template.id}><span>{item.slots.length} itens</span><strong>{item.name}</strong><small>{item.description}</small>{item.id === template.id && <Check aria-hidden="true" />}</button>)}
          </div>
          <div className="kit-builder__identity"><label>Nome da composição<input value={kitName} maxLength={100} onChange={(event) => setKitName(event.target.value)} /></label><label>Quantidade de kits<input type="number" min={minimum} max="999999" value={kitQuantity} onChange={(event) => setKitQuantity(Math.max(1, Math.min(999999, Number(event.target.value) || 1)))} /></label></div>
          <div className="kit-slots">
            {template.slots.map((slot, index) => {
              const choice = selected[slot.id];
              return <article key={slot.id} className={`${activeSlotId === slot.id ? 'is-active' : ''} ${choice ? 'is-filled' : ''}`}>
                <button type="button" className="kit-slot__main" onClick={() => setActiveSlotId(slot.id)}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  {choice ? <img src={choice.product.imageUrl} alt="" width="90" height="90" onError={replaceBrokenProductImage} referrerPolicy="no-referrer" /> : <PackagePlus aria-hidden="true" />}
                  <div><small>{slot.label}</small><strong>{choice?.product.name || 'Escolher produto'}</strong>{choice && <em>Cód. {choice.product.sku} · mín. {choice.product.minQuantity.toLocaleString('pt-BR')}</em>}</div>
                </button>
                {choice && <div className="kit-slot__controls"><label><span>Un. por kit</span><input aria-label={`Unidades por kit de ${choice.product.name}`} type="number" min="1" max="100" value={choice.unitsPerKit} onChange={(event) => setSelected((current) => ({ ...current, [slot.id]: { ...choice, unitsPerKit: Math.max(1, Math.min(100, Number(event.target.value) || 1)) } }))} /></label><button type="button" onClick={() => { setSelected((current) => { const next = { ...current }; delete next[slot.id]; return next; }); setActiveSlotId(slot.id); }} aria-label={`Remover ${choice.product.name}`}><Trash2 /></button></div>}
              </article>;
            })}
          </div>
        </section>

        <section className="kit-builder__catalog" aria-labelledby="kit-catalog-title">
          <div className="section-heading"><span className="section-kicker">02 · Produtos reais</span><h2 id="kit-catalog-title">Escolha para “{template.slots.find((slot) => slot.id === activeSlotId)?.label}”.</h2></div>
          <form className="kit-builder-search" role="search" onSubmit={submitSearch}><Search aria-hidden="true" /><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Busque caderno, garrafa, tech…" maxLength={80} /><button type="submit">Buscar</button></form>
          {catalog.loading && <div className="kit-builder-state" role="status">Buscando referências…</div>}
          {catalog.error && <div className="kit-builder-state" role="alert">{catalog.error}</div>}
          {!catalog.loading && !catalog.error && <div className="kit-product-grid">{catalog.data.products.map((product) => <button key={product.id} type="button" disabled={usedProducts.has(product.id) && selected[activeSlotId]?.product.id !== product.id} onClick={() => chooseProduct(product)}><img src={product.imageUrl} alt="" width="150" height="150" loading="lazy" referrerPolicy="no-referrer" onError={replaceBrokenProductImage} /><span>Cód. {product.sku}</span><strong>{product.name}</strong><small>Mín. {product.minQuantity.toLocaleString('pt-BR')} un.</small><em><Plus /> Usar neste espaço</em></button>)}</div>}
          {!catalog.loading && !catalog.error && !catalog.data.products.length && <div className="kit-builder-state"><strong>Nenhuma referência encontrada.</strong><span>Tente outro termo ou abra o catálogo completo.</span><Link to="/catalogo">Explorar catálogo</Link></div>}
        </section>

        <aside className="kit-builder-summary" aria-label="Resumo da composição">
          <div><Sparkles aria-hidden="true" /><span><strong>{complete ? 'Composição pronta para revisar' : `${template.slots.length - components.length} espaços para completar`}</strong><small>{components.length} componentes · mínimo calculado: {minimum.toLocaleString('pt-BR')} kits</small></span></div>
          <dl><div><dt>Kits</dt><dd>{kitQuantity.toLocaleString('pt-BR')}</dd></div><div><dt>Unidades totais</dt><dd>{kitTotalUnits(kitQuantity, components).toLocaleString('pt-BR')}</dd></div></dl>
          {kitQuantity < minimum && <p>Aumente para pelo menos {minimum.toLocaleString('pt-BR')} kits para respeitar todos os mínimos.</p>}
          {error && <p className="kit-builder-summary__error" role="alert">{error}</p>}
          <button className="button button--green button--large" type="button" onClick={addKitToBriefing} disabled={!complete || kitQuantity < minimum}><ShoppingBag /> Levar para o briefing <ArrowRight /></button>
        </aside>
      </main>
    </>
  );
}
