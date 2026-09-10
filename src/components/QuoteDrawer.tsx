import { ArrowRight, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuoteCart } from '../context/QuoteCartContext';
import { replaceBrokenProductImage } from '../lib/images';

export function QuoteDrawer() {
  const cart = useQuoteCart();
  const location = useLocation();
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    cart.setDrawerOpen(false);
    // Only react to route changes, not to a new context function identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    if (!cart.drawerOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cart.setDrawerOpen(false);
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])',
      )];
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
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKey);
      previousFocus?.focus();
    };
  }, [cart.drawerOpen, cart.setDrawerOpen]);

  useEffect(() => {
    if (cart.drawerOpen && cart.itemCount === 0) closeRef.current?.focus();
  }, [cart.drawerOpen, cart.itemCount]);

  if (!cart.drawerOpen) return null;

  return (
    <div
      className="drawer-backdrop"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) cart.setDrawerOpen(false);
      }}
    >
      <div
        ref={dialogRef}
        className="quote-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quote-drawer-title"
      >
        <header className="quote-drawer__header">
          <div>
            <span className="section-kicker">Sua seleção de produtos</span>
            <h2 id="quote-drawer-title">Minha seleção</h2>
          </div>
          <button ref={closeRef} className="icon-button" onClick={() => cart.setDrawerOpen(false)} aria-label="Fechar seleção">
            <X size={22} />
          </button>
        </header>

        {cart.items.length === 0 ? (
          <div className="quote-drawer__empty">
            <span className="empty-icon"><ShoppingBag size={30} /></span>
            <h3>Escolha o que desperta uma ideia.</h3>
            <p>Explore o catálogo e adicione produtos. Quantidade, cor e contexto podem ser ajustados depois.</p>
            <Link className="button button--dark" to="/catalogo">Abrir radar</Link>
          </div>
        ) : (
          <>
            <div className="quote-drawer__intro">
              <p>{cart.itemCount} {cart.itemCount === 1 ? 'produto selecionado' : 'produtos selecionados'}</p>
              <button className="text-button text-button--danger" type="button" onClick={cart.clear}>Limpar seleção</button>
            </div>
            <div className="quote-drawer__items">
              {cart.items.map((item) => (
                <article className="drawer-item" key={item.key}>
                  <Link to={`/produto/${item.slug}`} className="drawer-item__image" aria-label={`Abrir ${item.name}`}>
                    <img src={item.imageUrl} alt="" width="96" height="96" loading="lazy" referrerPolicy="no-referrer" onError={replaceBrokenProductImage} />
                  </Link>
                  <div className="drawer-item__content">
                    <Link to={`/produto/${item.slug}`} className="drawer-item__name">{item.name}</Link>
                    <p>Cód. {item.sku}{item.colorName ? ` · ${item.colorName}` : ''}</p>
                    <div className="quantity-control quantity-control--small" aria-label={`Quantidade de ${item.name}`}>
                      <button type="button" onClick={() => cart.updateQuantity(item.key, item.quantity - 1)} aria-label="Diminuir quantidade"><Minus size={15} /></button>
                      <input
                        aria-label={`Quantidade desejada de ${item.name}`}
                        inputMode="numeric"
                        min={item.minQuantity}
                        max="999999"
                        type="number"
                        value={item.quantity}
                        onChange={(event) => cart.updateQuantity(item.key, Number(event.target.value))}
                      />
                      <button type="button" onClick={() => cart.updateQuantity(item.key, item.quantity + 1)} aria-label="Aumentar quantidade"><Plus size={15} /></button>
                    </div>
                  </div>
                  <button className="drawer-item__remove" type="button" onClick={() => cart.removeItem(item.key)} aria-label={`Remover ${item.name}`}>
                    <Trash2 size={17} />
                  </button>
                </article>
              ))}
            </div>
            <footer className="quote-drawer__footer">
              <div className="drawer-note">
                <strong>Zero checkout. Zero compromisso.</strong>
                <span>A curadoria analisa sua seleção e transforma tudo em uma proposta real.</span>
              </div>
              <Link className="button button--green button--wide" to="/orcamento">
                Transformar em briefing <ArrowRight size={18} />
              </Link>
              <button className="text-button" type="button" onClick={() => cart.setDrawerOpen(false)}>Continuar escolhendo</button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
