import { ArrowRight, Check, Copy, Minus, Plus, Share2, ShoppingBag, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuoteCart } from '../context/QuoteCartContext';
import { replaceBrokenProductImage } from '../lib/images';
import { createPersistentSharedSelection, managedSharedSelectionTokens, revokePersistentSharedSelection, sharedSelectionUrl, MAX_SHARED_SELECTION_ITEMS } from '../lib/sharedSelection';
import { trackFunnelEvent } from '../lib/analytics';
import { persistentSharedSelectionsEnabled, quoteDecisionGroupsEnabled } from '../lib/siteFeatureFlags';

export function QuoteDrawer() {
  const cart = useQuoteCart();
  const location = useLocation();
  const closeRef = useRef<HTMLButtonElement>(null);
  const clearTriggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const clearCancelRef = useRef<HTMLButtonElement>(null);
  const clearDialogRef = useRef<HTMLElement>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [shareState, setShareState] = useState<'idle' | 'preparing' | 'copied' | 'shared' | 'limited' | 'error'>('idle');
  const [managedShareTokens, setManagedShareTokens] = useState<string[]>(managedSharedSelectionTokens);

  useEffect(() => {
    if (cart.drawerOpen) setManagedShareTokens(managedSharedSelectionTokens());
  }, [cart.drawerOpen]);

  const closeClearConfirmation = useCallback(() => {
    setConfirmClear(false);
    window.requestAnimationFrame(() => clearTriggerRef.current?.focus());
  }, []);

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
    if (!confirmClear) closeRef.current?.focus();

    const handleKey = (event: KeyboardEvent) => {
      if (confirmClear) return;
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
  }, [cart.drawerOpen, cart.setDrawerOpen, confirmClear]);

  useEffect(() => {
    if (!confirmClear) return;
    clearCancelRef.current?.focus();
    const keepFocus = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { closeClearConfirmation(); return; }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(clearDialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled])') || []);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', keepFocus);
    return () => window.removeEventListener('keydown', keepFocus);
  }, [closeClearConfirmation, confirmClear]);

  useEffect(() => {
    if (cart.drawerOpen && cart.itemCount === 0) closeRef.current?.focus();
  }, [cart.drawerOpen, cart.itemCount]);

  async function shareSelection() {
    if (shareState === 'preparing') return;
    if (cart.items.length > MAX_SHARED_SELECTION_ITEMS) {
      setShareState('limited');
      return;
    }
    let url = sharedSelectionUrl(cart.items);
    if (!url) {
      setShareState('error');
      return;
    }
    let mode: 'native' | 'copy' = 'copy';
    try {
      setShareState('preparing');
      if (persistentSharedSelectionsEnabled) {
        const persistent = await createPersistentSharedSelection(cart.items);
        url = persistent.url;
        setManagedShareTokens(managedSharedSelectionTokens());
      }
      if (navigator.share) {
        await navigator.share({ title: 'Seleção de brindes | Promo Brindes', text: 'Referências para uma próxima campanha.', url });
        mode = 'native';
        setShareState('shared');
      } else {
        await navigator.clipboard.writeText(url);
        setShareState('copied');
      }
      trackFunnelEvent('selection_shared', { item_count: cart.itemCount, mode });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setShareState('idle');
        return;
      }
      setShareState('error');
    }
  }

  async function revokeShare(token: string) {
    try {
      const revoked = await revokePersistentSharedSelection(token);
      if (!revoked) throw new Error('not_revoked');
      setManagedShareTokens(managedSharedSelectionTokens());
      setShareState('idle');
    } catch {
      setShareState('error');
    }
  }

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
            {cart.selectionLimitReached && <div className="quote-drawer__notice" role="status" aria-live="polite"><span>Sua seleção chegou ao limite de {cart.itemCount} produtos. Remova uma referência para incluir outra.</span><button type="button" className="text-button" onClick={cart.dismissSelectionLimit}>Entendi</button></div>}
            <div className="quote-drawer__intro">
              <p>{cart.itemCount} {cart.itemCount === 1 ? 'produto selecionado' : 'produtos selecionados'}</p>
              <button ref={clearTriggerRef} className="text-button text-button--danger" type="button" onClick={() => setConfirmClear(true)}>Limpar seleção</button>
            </div>
            <label className="quote-drawer__campaign">
              <span>Nome da campanha <em>opcional</em></span>
              <input value={cart.selectionTitle || ''} maxLength={100} placeholder="Ex.: Boas-vindas do time 2026" onChange={(event) => cart.setSelectionTitle(event.target.value)} />
              <small>Use um nome interno da campanha; evite nomes de pessoas, e-mails ou dados sensíveis.</small>
            </label>
            <div className="quote-drawer__share"><div><strong>Compartilhar referências</strong><span>{persistentSharedSelectionsEnabled ? 'Link privado, com validade de 30 dias e revogável neste dispositivo.' : 'O link leva apenas itens, quantidades e variantes públicas.'}</span></div><div className="quote-drawer__share-actions"><button type="button" className="text-button" disabled={shareState === 'preparing'} onClick={() => void shareSelection()}><Share2 size={16} /> {shareState === 'preparing' ? 'Preparando link…' : shareState === 'shared' ? 'Compartilhado' : shareState === 'copied' ? <><Check size={15} /> Link copiado</> : shareState === 'limited' ? `Máximo de ${MAX_SHARED_SELECTION_ITEMS} itens` : shareState === 'error' ? <><Copy size={15} /> Tentar copiar</> : 'Compartilhar'}</button>{managedShareTokens.map((token, index) => <button key={token} type="button" className="text-button text-button--danger" onClick={() => void revokeShare(token)}>Revogar link {managedShareTokens.length > 1 ? index + 1 : ''}</button>)}</div><span className="sr-only" role="status" aria-live="polite">{shareState === 'preparing' ? 'Preparando link privado.' : shareState === 'copied' ? 'Link da seleção copiado.' : shareState === 'shared' ? 'Seleção compartilhada.' : shareState === 'limited' ? `O compartilhamento é limitado a ${MAX_SHARED_SELECTION_ITEMS} itens.` : shareState === 'error' ? 'Não foi possível compartilhar agora.' : ''}</span></div>
            <div className="quote-drawer__items">
              {cart.items.map((item) => (
                <article className="drawer-item" key={item.key}>
                  <Link to={`/produto/${item.slug}`} className="drawer-item__image" aria-label={`Abrir ${item.name}`}>
                    <img src={item.imageUrl} alt="" width="96" height="96" loading="lazy" referrerPolicy="no-referrer" onError={replaceBrokenProductImage} />
                  </Link>
                  <div className="drawer-item__content">
                    <Link to={`/produto/${item.slug}`} className="drawer-item__name">{item.name}</Link>
                    <p>Cód. {item.sku}{item.colorName ? ` · ${item.colorName}` : ''}</p>
                    {quoteDecisionGroupsEnabled && <label className="drawer-item__decision">
                      <span>Prioridade</span>
                      <select
                        aria-label={`Prioridade de ${item.name}`}
                        value={item.decisionGroup || 'primary'}
                        onChange={(event) => cart.setItemDecisionGroup(item.key, event.target.value as 'primary' | 'alternative')}
                      >
                        <option value="primary">Referência principal</option>
                        <option value="alternative">Alternativa</option>
                      </select>
                    </label>}
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
      {confirmClear && (
        <div className="quote-clear-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) closeClearConfirmation(); }}>
          <section ref={clearDialogRef} className="quote-clear-confirmation" role="alertdialog" aria-modal="true" aria-labelledby="quote-clear-title" aria-describedby="quote-clear-description">
            <span className="section-kicker">MINHA SELEÇÃO</span>
            <h3 id="quote-clear-title">Limpar todos os produtos?</h3>
            <p id="quote-clear-description">Você poderá desfazer esta ação nos próximos segundos. A direção de campanha continua disponível para um novo começo.</p>
            <div><button ref={clearCancelRef} className="button button--outline" type="button" onClick={closeClearConfirmation}>Manter seleção</button><button className="button button--dark" type="button" onClick={() => { cart.clear(); setConfirmClear(false); }}>Limpar produtos</button></div>
          </section>
        </div>
      )}
    </div>
  );
}
