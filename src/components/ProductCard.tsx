import { ArrowUpRight, Check, GitCompareArrows, Layers3, Plus, Sparkles } from 'lucide-react';
import { type RefCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuoteCart } from '../context/QuoteCartContext';
import { replaceBrokenProductImage } from '../lib/images';
import { resolveProductBadge } from '../lib/productBadges';
import type { CatalogProduct } from '../types';

interface ProductCardProps {
  product: CatalogProduct;
  categoryName?: string;
  priority?: boolean;
  comparison?: {
    selected: boolean;
    disabled: boolean;
    onToggle: (product: CatalogProduct) => void;
    controlId?: string;
    controlRef?: RefCallback<HTMLButtonElement>;
  };
}

export function ProductCard({ product, categoryName, priority = false, comparison }: ProductCardProps) {
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
          <span>{product.minQuantity > 1 ? `Mín. ${product.minQuantity.toLocaleString('pt-BR')} un.` : 'Quantidade a confirmar'}</span>
          {product.colors.length > 0 && <span>{product.colors.length} {product.colors.length === 1 ? 'cor' : 'cores'}</span>}
        </div>
        <div className="product-card__footer">
          <span className="consult-label">Proposta sob medida</span>
          <div className="product-card__actions">
            {comparison && (
              <button
                className={`product-card__compare ${comparison.selected ? 'is-selected' : ''}`}
                type="button"
                id={comparison.controlId}
                ref={comparison.controlRef}
                disabled={comparison.disabled && !comparison.selected}
                onClick={() => comparison.onToggle(product)}
                aria-pressed={comparison.selected}
                aria-label={`${comparison.selected ? 'Remover' : 'Comparar'} ${product.name}`}
              >
                <GitCompareArrows size={16} />
              </button>
            )}
            <button
              className={`button button--compact ${selected ? 'button--selected' : 'button--dark'}`}
              type="button"
              onClick={() => selected ? cart.setDrawerOpen(true) : cart.addProduct(product)}
              aria-label={`${selected ? 'Revisar' : 'Adicionar'} ${product.name} à seleção`}
            >
              {selected ? <Check size={17} /> : <Plus size={17} />}
              {selected ? 'Na seleção' : 'Adicionar'}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
