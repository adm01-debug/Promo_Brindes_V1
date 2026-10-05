import {
  ArrowLeft,
  ArrowRight,
  Box,
  Check,
  ChevronRight,
  Minus,
  PackageCheck,
  Plus,
  Ruler,
  Share2,
  Sparkles,
  Weight,
} from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CatalogError, ProductGridSkeleton } from '../components/CatalogFeedback';
import { ProductCard } from '../components/ProductCard';
import { ProductDescription } from '../components/ProductDescription';
import { ProductGallery } from '../components/ProductGallery';
import { ContextualFaq } from '../components/ContextualFaq';
import { Seo } from '../components/Seo';
import { useQuoteCart } from '../context/quoteCart';
import { defaultQuoteQuantity } from '../lib/catalog';
import { rankRelatedProducts } from '../lib/catalogRanking';
import { trackFunnelEvent } from '../lib/analytics';
import { useCatalog, useCategories, useProduct } from '../lib/hooks';
import type { CatalogProduct, ProductColor } from '../types';

function RelatedProducts({ product }: { product: CatalogProduct }) {
  const related = useCatalog({ pageSize: 24, categoryId: product.mainCategoryId || undefined, sort: 'curated' });
  const products = rankRelatedProducts(related.data.products, product).slice(0, 4);
  if (related.loading) return <ProductGridSkeleton count={4} />;
  if (related.error || products.length === 0) return null;
  return <div className="product-grid">{products.map((item) => <ProductCard key={item.id} product={item} />)}</div>;
}

function productColorKey(color: ProductColor): string {
  return color.variantId ? `variant:${color.variantId}` : `name:${color.name.toLocaleLowerCase('pt-BR')}`;
}

export default function ProductPage() {
  const { identifier = '' } = useParams();
  const [retryKey, setRetryKey] = useState(0);
  const productState = useProduct(identifier, retryKey);
  const categories = useCategories();
  const cart = useQuoteCart();
  const product = productState.data;
  const [selectedColor, setSelectedColor] = useState<ProductColor | undefined>();
  const [quantity, setQuantity] = useState(100);
  const [quantityDraft, setQuantityDraft] = useState('100');
  const [shareStatus, setShareStatus] = useState('');
  const trackedProductRef = useRef('');

  useLayoutEffect(() => {
    setSelectedColor(undefined);
    setShareStatus('');
    if (product) {
      const initialQuantity = defaultQuoteQuantity(product);
      setQuantity(initialQuantity);
      setQuantityDraft(String(initialQuantity));
    }
  }, [product]);

  function commitQuantityDraft() {
    if (!product) return quantity;
    const parsed = Number(quantityDraft);
    const nextQuantity = Number.isFinite(parsed) && quantityDraft
      ? Math.min(999999, Math.max(product.minQuantity, Math.round(parsed)))
      : product.minQuantity;
    setQuantity(nextQuantity);
    setQuantityDraft(String(nextQuantity));
    return nextQuantity;
  }

  function adjustQuantity(delta: number) {
    if (!product) return;
    const draftValue = Number(quantityDraft);
    const baseQuantity = Number.isFinite(draftValue) && quantityDraft ? draftValue : quantity;
    const normalized = Math.min(999999, Math.max(product.minQuantity, Math.round(baseQuantity + delta)));
    setQuantity(normalized);
    setQuantityDraft(String(normalized));
  }

  useEffect(() => {
    if (!product || trackedProductRef.current === product.id) return;
    trackedProductRef.current = product.id;
    trackFunnelEvent('product_viewed', {
      product_id: product.id,
      category_id: product.mainCategoryId || product.categoryId || 'nao-informada',
    });
  }, [product]);

  const categoryName = categories.data.find((category) => category.id === product?.mainCategoryId)?.name;
  const productImages = useMemo(() => {
    if (!product) return [];
    return [...new Set([selectedColor?.imageUrl, ...product.images].filter((url): url is string => Boolean(url)))];
  }, [product, selectedColor]);
  const jsonLd = useMemo(() => product ? {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    sku: product.sku,
    image: product.images.map((image) => image.startsWith('http') ? image : `${import.meta.env.VITE_PUBLIC_URL?.replace(/\/$/, '') || 'https://promo-brindes-v1.vercel.app'}${image}`),
    description: product.shortDescription || product.description,
  } : undefined, [product]);

  async function shareProduct() {
    const shareData = { title: product?.name || 'Promo Brindes', url: window.location.href };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        if (product) trackFunnelEvent('product_shared', { product_id: product.id, mode: 'native' });
        setShareStatus('Link de referência compartilhado.');
        return;
      }
      await navigator.clipboard.writeText(shareData.url);
      if (product) trackFunnelEvent('product_shared', { product_id: product.id, mode: 'copy' });
      setShareStatus('Link de referência copiado.');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setShareStatus('Não foi possível compartilhar agora. Tente copiar o link novamente.');
    }
  }

  if (productState.loading) {
    return <div className="container product-loading"><div className="skeleton product-loading__gallery" /><div className="product-loading__info"><div className="skeleton skeleton--eyebrow" /><div className="skeleton product-loading__title" /><div className="skeleton product-loading__copy" /><div className="skeleton product-loading__button" /></div></div>;
  }
  if (productState.error) {
    return <><Seo title="Produto temporariamente indisponível" path={`/produto/${encodeURIComponent(identifier)}`} noIndex /><div className="container standalone-message"><CatalogError message={productState.error} onRetry={() => setRetryKey((key) => key + 1)} /></div></>;
  }
  if (!product) {
    return <><Seo title="Produto não encontrado" path={`/produto/${encodeURIComponent(identifier)}`} noIndex /><div className="container standalone-message"><CatalogError message="Não encontramos este produto. Ele pode ter saído do catálogo ou o endereço está incompleto." /><Link className="button button--dark" to="/catalogo"><ArrowLeft size={17} /> Voltar ao catálogo</Link></div></>;
  }

  return (
    <>
      <Seo title={product.name} description={product.shortDescription || product.description.slice(0, 155)} path={`/produto/${product.slug}`} image={product.imageUrl} jsonLd={jsonLd} />
      <div className="container product-page">
        <nav className="breadcrumbs" aria-label="Navegação estrutural">
          <Link to="/">Início</Link><ChevronRight size={14} /><Link to="/catalogo">Catálogo</Link>{categoryName && <><ChevronRight size={14} /><Link to={`/catalogo?categoria=${product.mainCategoryId}&nome=${encodeURIComponent(categoryName)}`}>{categoryName.replaceAll(' | ', ' & ')}</Link></>}
        </nav>

        <div className="product-detail">
          <header className="product-heading">
            <div className="product-info__topline"><span>{categoryName?.replaceAll(' | ', ' & ') || 'Radar Promo'}</span><div className="share-action"><button type="button" className="share-button" onClick={() => void shareProduct()} aria-label="Compartilhar produto"><Share2 size={17} /> Mandar para o time</button><span role="status" aria-live="polite">{shareStatus}</span></div></div>
            <h1 id="product-title">{product.name}</h1>
            <div className="product-heading__meta"><span className="product-code">Cód. {product.sku}</span>{product.isKit ? <span className="badge badge--paper">Kit corporativo</span> : product.isNew && <span className="badge badge--ink">Novidade</span>}</div>
          </header>

          <ProductGallery key={product.id} images={productImages} name={product.name} />

          <section className="product-info product-panel" aria-labelledby="product-selection-title">
            <div className="quote-explainer">
              <span className="product-panel__eyebrow">Proposta sob medida</span>
              <h2 id="product-selection-title">Sua marca pode morar aqui.</h2>
              <p>Escolha cor e quantidade. Nosso time de especialistas confirma personalização e prazo. Você não paga nada pelo site.</p>
            </div>

            {product.colors.length > 0 && (
              <fieldset className="color-picker">
                <legend>Cor preferida <span>opcional</span></legend>
                <div className="color-picker__options">
                  <button type="button" className={!selectedColor ? 'is-active color-none' : 'color-none'} onClick={() => setSelectedColor(undefined)} aria-pressed={!selectedColor}>A definir</button>
                  {product.colors.map((color, index) => (
                    <button key={`${productColorKey(color)}-${index}`} type="button" className={selectedColor && productColorKey(selectedColor) === productColorKey(color) ? 'is-active' : ''} onClick={() => setSelectedColor(color)} aria-pressed={Boolean(selectedColor && productColorKey(selectedColor) === productColorKey(color))} title={color.name}>
                      <span style={{ backgroundColor: color.hex }} /> <em>{color.name}</em>
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            <div className="product-quantity">
              <div><label htmlFor="product-quantity">Quantidade estimada</label><span id="product-minimum-hint">{product.minQuantity > 1 ? `Mínimo deste item: ${product.minQuantity.toLocaleString('pt-BR')}` : 'Quantidade mínima a confirmar com nosso time de especialistas'}</span></div>
              <div className="quantity-control">
                <button type="button" onClick={() => adjustQuantity(-10)} aria-label="Diminuir quantidade"><Minus size={17} /></button>
                <input id="product-quantity" type="number" min={product.minQuantity} max="999999" inputMode="numeric" aria-describedby="product-minimum-hint" value={quantityDraft} onFocus={(event) => event.currentTarget.select()} onChange={(event) => setQuantityDraft(event.target.value.replace(/\D/g, ''))} onBlur={commitQuantityDraft} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} />
                <button type="button" onClick={() => adjustQuantity(10)} aria-label="Aumentar quantidade"><Plus size={17} /></button>
              </div>
            </div>

            <button className="button button--green button--wide button--large" type="button" onClick={() => cart.addProduct(product, commitQuantityDraft(), selectedColor)}><Plus size={19} /> Adicionar à minha seleção</button>
            <ul className="product-reassurance">
              <li><Check /> Sem checkout</li>
              {product.allowsPersonalization && <li><Check /> Pode receber sua marca</li>}
              <li><Check /> Curadoria humana</li>
            </ul>
          </section>

          <section className="product-overview product-panel" aria-labelledby="product-overview-title">
            <div className="product-overview__description">
              <h2 id="product-overview-title">Sobre o produto</h2>
              <ProductDescription key={product.id} text={product.description || product.shortDescription} summary={product.shortDescription} />
            </div>
            <div className="product-overview__specs">
              <h3>Especificações</h3>
              <dl className="product-facts">
                {product.materials.length > 0 && <div className="product-facts__wide"><dt><Sparkles aria-hidden="true" /> Materiais</dt><dd className="product-materials">{product.materials.map((material, index) => <span key={`${material}-${index}`}>{material}</span>)}</dd></div>}
                {([
                  ['Altura', product.dimensions.heightCm],
                  ['Largura', product.dimensions.widthCm],
                  ['Comprimento', product.dimensions.lengthCm],
                ] as const).map(([label, value]) => value ? <div key={label}><dt><Ruler aria-hidden="true" /> {label}</dt><dd>{value.toLocaleString('pt-BR')} cm</dd></div> : null)}
                {product.dimensions.weightG && <div><dt><Weight aria-hidden="true" /> Peso aproximado</dt><dd>{product.dimensions.weightG.toLocaleString('pt-BR')} g</dd></div>}
                {product.dimensions.capacityMl && <div><dt><Box aria-hidden="true" /> Capacidade</dt><dd>{product.dimensions.capacityMl.toLocaleString('pt-BR')} ml</dd></div>}
                {product.hasCommercialPackaging && <div className="product-facts__wide"><dt><PackageCheck aria-hidden="true" /> Apresentação</dt><dd>Embalagem individual</dd></div>}
              </dl>
              {product.materials.length === 0 && !Object.values(product.dimensions).some(Boolean) && !product.hasCommercialPackaging && <p className="product-specs-empty">Medidas, materiais e apresentação a confirmar com nosso time de especialistas.</p>}
            </div>
          </section>
        </div>

        <ContextualFaq scope="product" />

        <section className="related-section section" aria-labelledby="related-title">
          <div className="section-heading section-heading--split"><div><span className="section-kicker">Continue selecionando</span><h2 id="related-title">Ideias que podem entrar no mesmo conceito.</h2></div><Link className="text-link" to="/catalogo">Abrir catálogo <ArrowRight size={17} /></Link></div>
          <RelatedProducts product={product} />
        </section>
      </div>
    </>
  );
}
