import { ArrowRight, Copy, PackageOpen, ShieldCheck, ShoppingBag } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Seo } from '../components/Seo';
import { useQuoteCart } from '../context/QuoteCartContext';
import { fetchProductsByIds } from '../lib/catalog';
import { decodeSharedSelection, fetchPersistentSharedSelection, hydrateSharedSelectionDetails, isPersistentSharedSelectionToken, type SharedSelectionItem } from '../lib/sharedSelection';
import { persistentSharedSelectionsEnabled } from '../lib/siteFeatureFlags';
import type { QuoteItem } from '../types';

function totalUnits(items: QuoteItem[]): number {
  return items.reduce((total, item) => total + item.quantity, 0);
}

export default function SharedSelectionPage() {
  const [params] = useSearchParams();
  const cart = useQuoteCart();
  const rawToken = params.get('s');
  const legacyPayload = useMemo(() => decodeSharedSelection(rawToken), [rawToken]);
  const persistentToken = persistentSharedSelectionsEnabled && isPersistentSharedSelectionToken(rawToken) ? rawToken : null;
  const [payload, setPayload] = useState(legacyPayload);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [unavailableProducts, setUnavailableProducts] = useState<SharedSelectionItem[]>([]);
  const [unavailableVariants, setUnavailableVariants] = useState<SharedSelectionItem[]>([]);
  const [loading, setLoading] = useState(Boolean(legacyPayload.length || persistentToken));
  const [error, setError] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const [duplicateConfirmationOpen, setDuplicateConfirmationOpen] = useState(false);
  const duplicateDialogRef = useRef<HTMLElement>(null);
  const duplicateCancelRef = useRef<HTMLButtonElement>(null);
  const duplicateTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    if (persistentToken) {
      setLoading(true);
      setError('');
      setPayload([]);
      setItems([]);
      setUnavailableProducts([]);
      setUnavailableVariants([]);
      void fetchPersistentSharedSelection(persistentToken)
        .then((selection) => {
          if (!active) return;
          setPayload(selection?.items || []);
          if (!selection) {
            setItems([]);
            setUnavailableProducts([]);
            setUnavailableVariants([]);
            setError('Este link expirou ou foi revogado.');
          }
        })
        .catch(() => { if (active) { setPayload([]); setItems([]); setUnavailableProducts([]); setUnavailableVariants([]); setError('Não foi possível consultar esta seleção agora.'); } })
        .finally(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }
    setItems([]);
    setUnavailableProducts([]);
    setUnavailableVariants([]);
    setError('');
    setPayload(legacyPayload);
  }, [legacyPayload, persistentToken]);

  useEffect(() => {
    // Um token persistente começa sem payload e ainda está sendo consultado pelo
    // efeito acima. Não transformar essa espera em “link inválido”.
    if (!payload.length) {
      if (persistentToken) return;
      setItems([]);
      setUnavailableProducts([]);
      setUnavailableVariants([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError('');
    void fetchProductsByIds(payload.map((item) => item.id), controller.signal, payload.length)
      .then((products) => {
        if (!controller.signal.aborted) {
          const hydration = hydrateSharedSelectionDetails(payload, products);
          setItems(hydration.items);
          setUnavailableProducts(hydration.unavailableProductReferences);
          setUnavailableVariants(hydration.unavailableVariantReferences);
        }
      })
      .catch(() => { if (!controller.signal.aborted) setError('Não foi possível consultar esta seleção agora.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [payload, persistentToken]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyStatus('Link copiado para a área de transferência.');
    } catch {
      setCopyStatus('Não foi possível copiar o link agora.');
    }
  }

  useEffect(() => {
    if (!duplicateConfirmationOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    duplicateCancelRef.current?.focus();
    const restoreTriggerFocus = () => window.requestAnimationFrame(() => duplicateTriggerRef.current?.focus());
    const close = () => {
      setDuplicateConfirmationOpen(false);
      restoreTriggerFocus();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = duplicateDialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (!focusable?.length) return;
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
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [duplicateConfirmationOpen]);

  function applyDuplicate() {
    if (unavailableProducts.length || unavailableVariants.length) return;
    cart.replaceSelection(items);
    setDuplicateConfirmationOpen(false);
    cart.setDrawerOpen(true);
  }

  function duplicate() {
    if (cart.itemCount > 0) {
      setDuplicateConfirmationOpen(true);
      return;
    }
    applyDuplicate();
  }

  if (!loading && !payload.length && !error) {
    return <div className="shared-selection-state container"><Seo title="Seleção não encontrada" path="/selecoes/compartilhada" noIndex /><PackageOpen size={42} /><span>LINK INVÁLIDO</span><h1>Esta seleção não está disponível.</h1><p>Peça um novo link ou comece uma seleção pelo catálogo.</p><Link className="button button--dark" to="/catalogo">Abrir catálogo <ArrowRight size={18} /></Link></div>;
  }

  return (
    <>
      <Seo title="Seleção compartilhada" description="Referências de brindes compartilhadas pela Promo Brindes." path="/selecoes/compartilhada" noIndex />
      <header className="shared-selection-hero"><div className="container"><span className="section-kicker">Seleção compartilhada</span><h1>Uma direção para<br /><em>começar a conversa.</em></h1><p>Estas referências refletem o catálogo público no momento da abertura. Disponibilidade, personalização e condições são confirmadas no briefing.</p><div className="shared-selection-hero__actions"><button ref={duplicateTriggerRef} className="button button--light" type="button" onClick={duplicate} disabled={loading || Boolean(error) || !items.length || Boolean(unavailableProducts.length || unavailableVariants.length)}><ShoppingBag size={18} /> Duplicar e ajustar</button><button className="button button--ghost-light" type="button" onClick={() => void copyLink()}><Copy size={17} /> {copyStatus.startsWith('Link copiado') ? 'Link copiado' : 'Copiar link'}</button></div><span className="sr-only" role="status" aria-live="polite">{copyStatus}</span></div></header>
      <section className="section shared-selection"><div className="container">
        <aside className="shared-selection__privacy"><ShieldCheck size={19} /><p>Este link não inclui contato, nome de campanha, observações ou dados de orçamento. Ele mostra somente produtos, quantidades e variantes publicadas.</p></aside>
        {!loading && !error && (unavailableProducts.length > 0 || unavailableVariants.length > 0) && <aside className="shared-selection__privacy shared-selection__privacy--warning" role="alert"><PackageOpen size={19} /><p><strong>Esta seleção precisa de revisão.</strong> {unavailableProducts.length > 0 && `${unavailableProducts.length} ${unavailableProducts.length === 1 ? 'produto não está mais publicado' : 'produtos não estão mais publicados'}. `}{unavailableVariants.length > 0 && `${unavailableVariants.length} ${unavailableVariants.length === 1 ? 'variante não está mais disponível' : 'variantes não estão mais disponíveis'}. `}A duplicação fica protegida até você escolher alternativas atuais no catálogo.</p></aside>}
        {loading && <div className="shared-selection-state" role="status">Carregando referências…</div>}
        {error && <div className="shared-selection-state" role="alert"><PackageOpen size={40} /><h2>Não deu para abrir agora.</h2><p>{error}</p><button className="button button--dark" type="button" onClick={() => window.location.reload()}>Tentar novamente</button></div>}
        {!loading && !error && !items.length && <div className="shared-selection-state"><PackageOpen size={40} /><h2>Os produtos deste link não estão mais publicados.</h2><p>O catálogo muda; abra o radar para encontrar alternativas atuais.</p><Link className="button button--dark" to="/catalogo">Ver alternativas</Link></div>}
        {!loading && !error && items.length > 0 && <><div className="shared-selection__heading"><div><span>{items.length} {items.length === 1 ? 'referência atual' : 'referências atuais'}</span><h2>{totalUnits(items).toLocaleString('pt-BR')} unidades estimadas</h2></div><p>{unavailableProducts.length || unavailableVariants.length ? 'Revise as referências indisponíveis antes de duplicar esta seleção.' : 'Você pode duplicar esta base e ajustar quantidades antes de pedir uma proposta.'}</p></div><div className="shared-selection__grid">{items.map((item) => <article key={item.key}><img src={item.imageUrl} alt="" width="180" height="180" referrerPolicy="no-referrer" /><div><p>Cód. {item.sku}</p><h2>{item.name}</h2>{item.colorName && <span>{item.colorName}</span>}{item.variantUnavailable && <span>Variante não publicada</span>}</div><strong>{item.quantity.toLocaleString('pt-BR')} un.</strong><Link to={`/produto/${item.slug}`}>Ver produto <ArrowRight size={16} /></Link></article>)}</div></>}
      </div></section>
      {duplicateConfirmationOpen && <div className="customer-confirmation-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setDuplicateConfirmationOpen(false); window.requestAnimationFrame(() => duplicateTriggerRef.current?.focus()); } }}><section ref={duplicateDialogRef} className="customer-confirmation" role="dialog" aria-modal="true" aria-labelledby="shared-selection-replace-title" aria-describedby="shared-selection-replace-description"><span className="section-kicker">SUA SELEÇÃO ATUAL</span><h2 id="shared-selection-replace-title">Substituir sua seleção atual?</h2><p id="shared-selection-replace-description">Você tem {cart.itemCount} {cart.itemCount === 1 ? 'produto salvo' : 'produtos salvos'}. Ao continuar, eles serão substituídos pelas {items.length} referências deste link. O contexto anterior será removido para não misturar campanhas.</p><div><button ref={duplicateCancelRef} className="button button--outline" type="button" onClick={() => { setDuplicateConfirmationOpen(false); window.requestAnimationFrame(() => duplicateTriggerRef.current?.focus()); }}>Manter minha seleção</button><button className="button button--green" type="button" onClick={applyDuplicate}>Substituir e ajustar <ShoppingBag size={17} /></button></div></section></div>}
    </>
  );
}
