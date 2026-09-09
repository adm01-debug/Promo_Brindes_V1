import { ArrowUpRight, Check, Layers3, Plus, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuoteCart } from '../context/QuoteCartContext';
import { replaceBrokenProductImage } from '../lib/images';
import { resolveProductBadge } from '../lib/productBadges';
import type { CatalogProduct } from '../types';

interface ProductCardProps {
  product: CatalogProduct;
  categoryName?: string;
  priority?: boolean;
}

export function ProductCard({ product, categoryName, priority = false }: ProductCardProps) {
  const cart = useQuoteCart();
  const selected = cart.items.some((item) => item.productId === product.id);
  const badge = resolveProductBadge(product, categoryName);

  return (
    <article className="product-card">
      <Link className="product-card__image-link" to={`/produto/${product.slug}`} aria-label={`Ver ${product.name}`}>
        <div className="product-card__image-wrap">
          <img
            src={product.imageUrl}
            alt={product.name}
            width="560"
            height="560"
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding="async"
            referrerPolicy="no-referrer"
            className="product-card__image"
            onError={replaceBrokenProductImage}
          />
          {badge && (
            <div className="product-card__badges" aria-label="Característica em destaque">
              {badge === 'personalizable' && <span className="badge badge--green"><Sparkles size={13} aria-hidden="true" /> Sua marca aqui</span>}
              {badge === 'new' && <span className="badge badge--new">Novidade</span>}
              {badge === 'kit' && <span className="badge badge--kit"><Layers3 size={13} aria-hidden="true" /> Kit</span>}
            </div>
          )}
          <span className="product-card__view" aria-hidden="true"><ArrowUpRight size={18} /></span>
        </div>
      </Link>
      <div className="product-card__body">
        <p className="product-card__eyebrow">{categoryName || 'Brindes corporativos'} · Cód. {product.sku}</p>
        <Link className="product-card__title" to={`/produto/${product.slug}`}>{product.name}</Link>
        <p className="product-card__description">
          {product.shortDescription || 'Personalize este produto para sua próxima ação de marca.'}
        </p>
        <div className="product-card__decision-signals">
          <span>{product.minQuantity > 1 ? `Mín. ${product.minQuantity.toLocaleString('pt-BR')} un.` : 'Quantidade flexível'}</span>
          {product.colors.length > 0 && <span>{product.colors.length} {product.colors.length === 1 ? 'cor' : 'cores'}</span>}
        </div>
        <div className="product-card__footer">
          <span className="consult-label">Proposta sob medida</span>
          <button
            className={`button button--compact ${selected ? 'button--selected' : 'button--dark'}`}
            type="button"
            onClick={() => selected ? cart.setDrawerOpen(true) : cart.addProduct(product)}
            aria-label={`${selected ? 'Revisar' : 'Salvar'} ${product.name} nos saves`}
          >
            {selected ? <Check size={17} /> : <Plus size={17} />}
            {selected ? 'Salvo' : 'Salvar'}
          </button>
        </div>
      </div>
    </article>
  );
}
