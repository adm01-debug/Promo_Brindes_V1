import {
  ArrowLeft,
  ArrowRight,
  Box,
  Check,
  ChevronRight,
  Minus,
  Maximize2,
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
import { ContextualFaq } from '../components/ContextualFaq';
import { Seo } from '../components/Seo';
import { useQuoteCart } from '../context/quoteCart';
import { defaultQuoteQuantity } from '../lib/catalog';
import { trackFunnelEvent } from '../lib/analytics';
import { useCatalog, useCategories, useProduct } from '../lib/hooks';
import { replaceBrokenProductImage } from '../lib/images';
import type { CatalogProduct, ProductColor } from '../types';

function RelatedProducts({ product }: { product: CatalogProduct }) {
  const related = useCatalog({ pageSize: 5, categoryId: product.mainCategoryId || undefined, sort: 'curated' });
  const products = related.data.products.filter((item) => item.id !== product.id).slice(0, 4);
  if (related.loading) return <ProductGridSkeleton count={4} />;
  if (related.error || products.length === 0) return null;
  return <div className="product-grid">{products.map((item) => <ProductCard key={item.id} product={item} />)}</div>;
}

function formatDimensions(product: CatalogProduct): string | null {
  const parts = [product.dimensions.lengthCm, product.dimensions.widthCm, product.dimensions.heightCm]
    .filter((value): value is number => Boolean(value));
  return parts.length ? `${parts.map((value) => value.toLocaleString('pt-BR')).join(' × ')} cm` : null;
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
  const [activeImage, setActiveImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState<ProductColor | undefined>();
  const [quantity, setQuantity] = useState(100);
  const [quantityDraft, setQuantityDraft] = useState('100');
  const [shareStatus, setShareStatus] = useState('');
  const [imageZoomOpen, setImageZoomOpen] = useState(false);
  const trackedProductRef = useRef('');
  const zoomCloseRef = useRef<HTMLButtonElement>(null);
  const zoomDialogRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    setActiveImage(0);
    setSelectedColor(undefined);
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
    if (!imageZoomOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnKeyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setImageZoomOpen(false);
      if (event.key !== 'Tab') return;
      const focusable = Array.from(zoomDialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])') || []);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', closeOnKeyboard);
    zoomCloseRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnKeyboard);
      previousFocus?.focus();
    };
  }, [imageZoomOpen]);

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
  const currentImage = productImages[Math.min(activeImage, productImages.length - 1)] || product?.imageUrl;
  const dimensions = product ? formatDimensions(product) : null;
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
          <section className="product-gallery" aria-label={`Fotos de ${product.name}`}>
            <div className="product-gallery__main">
              <img src={currentImage} alt={product.name} width="760" height="760" fetchPriority="high" referrerPolicy="no-referrer" onError={replaceBrokenProductImage} />
              <div className="product-gallery__badges">{product.isNew && <span className="badge badge--ink">Novo</span>}{product.isKit && <span className="badge badge--paper">Kit corporativo</span>}</div>
              <button className="product-gallery__zoom" type="button" onClick={() => setImageZoomOpen(true)} aria-label={`Ampliar foto de ${product.name}`}><Maximize2 size={18} /><span>Ampliar</span></button>
            </div>
            {productImages.length > 1 && (
              <div className="product-gallery__thumbs" role="list" aria-label="Escolher foto">
                {productImages.slice(0, 8).map((image, index) => (
                  <button key={image} type="button" className={activeImage === index ? 'is-active' : ''} onClick={() => setActiveImage(index)} aria-label={`Ver foto ${index + 1}`} aria-pressed={activeImage === index}>
                    <img src={image} alt="" width="100" height="100" loading="lazy" referrerPolicy="no-referrer" onError={replaceBrokenProductImage} />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="product-info" aria-labelledby="product-title">
            <div className="product-info__topline"><span>{categoryName?.replaceAll(' | ', ' & ') || 'Radar Promo'}</span><div className="share-action"><button type="button" className="share-button" onClick={() => void shareProduct()} aria-label="Compartilhar produto"><Share2 size={17} /> Mandar para o time</button><span role="status" aria-live="polite">{shareStatus}</span></div></div>
            <h1 id="product-title">{product.name}</h1>
            <p className="product-code">Cód. {product.sku}</p>
            <p className="product-info__lead">{product.shortDescription || product.description}</p>

            <div className="quote-explainer">
              <span>Sua marca pode morar aqui.</span>
              <p>A proposta cruza quantidade, personalização e prazo. Você salva agora, decide com o time depois e não paga nada pelo site.</p>
            </div>

            {product.colors.length > 0 && (
              <fieldset className="color-picker">
                <legend>Cor preferida <span>opcional</span></legend>
                <div className="color-picker__options">
                  <button type="button" className={!selectedColor ? 'is-active color-none' : 'color-none'} onClick={() => { setSelectedColor(undefined); setActiveImage(0); }} aria-pressed={!selectedColor}>A definir</button>
                  {product.colors.map((color, index) => (
                    <button key={`${productColorKey(color)}-${index}`} type="button" className={selectedColor && productColorKey(selectedColor) === productColorKey(color) ? 'is-active' : ''} onClick={() => { setSelectedColor(color); setActiveImage(0); }} aria-pressed={Boolean(selectedColor && productColorKey(selectedColor) === productColorKey(color))} title={color.name}>
                      <span style={{ backgroundColor: color.hex }} /> <em>{color.name}</em>
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            <div className="product-quantity">
              <div><label htmlFor="product-quantity">Quantidade estimada</label><span>{product.minQuantity > 1 ? `Mínimo deste item: ${product.minQuantity.toLocaleString('pt-BR')}` : 'Quantidade mínima a confirmar com nosso time de especialistas'}</span></div>
              <div className="quantity-control">
                <button type="button" onClick={() => adjustQuantity(-10)} aria-label="Diminuir quantidade"><Minus size={17} /></button>
                <input id="product-quantity" type="number" min={product.minQuantity} max="999999" inputMode="numeric" value={quantityDraft} onFocus={(event) => event.currentTarget.select()} onChange={(event) => setQuantityDraft(event.target.value.replace(/\D/g, ''))} onBlur={commitQuantityDraft} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} />
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
        </div>

        <section className="product-story section" aria-labelledby="product-story-title">
          <div className="product-story__copy"><span className="section-kicker">Sobre esta escolha</span><h2 id="product-story-title">Detalhes que ajudam a decidir.</h2><p>{product.description}</p></div>
          <div className="product-facts">
            {product.materials.length > 0 && <div><span><Sparkles /></span><small>Material</small><strong>{product.materials.join(', ')}</strong></div>}
            {dimensions && <div><span><Ruler /></span><small>Dimensões</small><strong>{dimensions}</strong></div>}
            {product.dimensions.weightG && <div><span><Weight /></span><small>Peso aproximado</small><strong>{product.dimensions.weightG.toLocaleString('pt-BR')} g</strong></div>}
            {product.dimensions.capacityMl && <div><span><Box /></span><small>Capacidade</small><strong>{product.dimensions.capacityMl.toLocaleString('pt-BR')} ml</strong></div>}
            {product.hasCommercialPackaging && <div><span><PackageCheck /></span><small>Apresentação</small><strong>Embalagem individual</strong></div>}
          </div>
        </section>

        <ContextualFaq scope="product" />

        <section className="related-section section" aria-labelledby="related-title">
          <div className="section-heading section-heading--split"><div><span className="section-kicker">Continue selecionando</span><h2 id="related-title">Ideias que podem entrar no mesmo conceito.</h2></div><Link className="text-link" to="/catalogo">Abrir catálogo <ArrowRight size={17} /></Link></div>
          <RelatedProducts product={product} />
        </section>
      </div>
      {imageZoomOpen && <div className="product-image-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setImageZoomOpen(false); }}><section ref={zoomDialogRef} className="product-image-dialog" role="dialog" aria-modal="true" aria-label={`Foto ampliada de ${product.name}`}><button ref={zoomCloseRef} type="button" onClick={() => setImageZoomOpen(false)} aria-label="Fechar foto ampliada">×</button><img src={currentImage} alt={product.name} referrerPolicy="no-referrer" onError={replaceBrokenProductImage} /></section></div>}
    </>
  );
}
