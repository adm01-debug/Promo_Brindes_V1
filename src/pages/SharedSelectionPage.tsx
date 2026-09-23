import { ArrowRight, Copy, PackageOpen, ShieldCheck, ShoppingBag } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Seo } from '../components/Seo';
import { useQuoteCart } from '../context/quoteCart';
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
  const selectionKey = rawToken || '';
  const [payload, setPayload] = useState(legacyPayload);
  const [contentKey, setContentKey] = useState(selectionKey);
  const [itemsKey, setItemsKey] = useState(legacyPayload.length ? '' : selectionKey);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [unavailableProducts, setUnavailableProducts] = useState<SharedSelectionItem[]>([]);
  const [unavailableVariants, setUnavailableVariants] = useState<SharedSelectionItem[]>([]);
  const [invalidKitReferences, setInvalidKitReferences] = useState<SharedSelectionItem[]>([]);
  const [loading, setLoading] = useState(Boolean(legacyPayload.length || persistentToken));
  const [error, setError] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const [duplicateConfirmationOpen, setDuplicateConfirmationOpen] = useState(false);
  const duplicateDialogRef = useRef<HTMLElement>(null);
  const duplicateCancelRef = useRef<HTMLButtonElement>(null);
  const duplicateTriggerRef = useRef<HTMLButtonElement>(null);
  const contentIsCurrent = contentKey === selectionKey;
  const visibleItems = contentIsCurrent && itemsKey === selectionKey ? items : [];
  const visiblePayload = contentIsCurrent ? payload : [];
  const visibleUnavailableProducts = contentIsCurrent ? unavailableProducts : [];
  const visibleUnavailableVariants = contentIsCurrent ? unavailableVariants : [];
  const visibleInvalidKitReferences = contentIsCurrent ? invalidKitReferences : [];
  const visibleError = contentIsCurrent ? error : '';
  const visibleLoading = loading || !contentIsCurrent || (visiblePayload.length > 0 && itemsKey !== selectionKey);
  const requiresSelectionReview = Boolean(visibleUnavailableProducts.length || visibleUnavailableVariants.length || visibleInvalidKitReferences.length);

  useEffect(() => {
    let active = true;
    setDuplicateConfirmationOpen(false);
    setCopyStatus('');
    if (persistentToken) {
      setLoading(true);
      setError('');
      setPayload([]);
      setContentKey(selectionKey);
      setItemsKey('');
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
    setContentKey(selectionKey);
    setItemsKey(legacyPayload.length ? '' : selectionKey);
    setLoading(Boolean(legacyPayload.length));
  }, [legacyPayload, persistentToken, selectionKey]);

  useEffect(() => {
    // Um token persistente começa sem payload e ainda está sendo consultado pelo
    // efeito acima. Não transformar essa espera em “link inválido”.
    if (contentKey !== selectionKey) return;
    setInvalidKitReferences([]);
    if (!payload.length) {
      if (persistentToken) return;
      setItems([]);
      setUnavailableProducts([]);
      setUnavailableVariants([]);
      setItemsKey(selectionKey);
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
          setInvalidKitReferences(hydration.invalidKitReferences);
          setItemsKey(selectionKey);
        }
      })
      .catch(() => { if (!controller.signal.aborted) setError('Não foi possível consultar esta seleção agora.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [contentKey, payload, persistentToken, selectionKey]);

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
      if (!first || !last) return;
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
    if (visibleLoading || visibleError || !visibleItems.length || requiresSelectionReview) return;
    cart.replaceSelection(visibleItems);
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

  if (!visibleLoading && !visiblePayload.length && !visibleError) {
    return <div className="shared-selection-state container"><Seo title="Seleção não encontrada" path="/selecoes/compartilhada" noIndex /><PackageOpen size={42} /><span>LINK INVÁLIDO</span><h1>Esta seleção não está disponível.</h1><p>Peça um novo link ou comece uma seleção pelo catálogo.</p><Link className="button button--dark" to="/catalogo">Abrir catálogo <ArrowRight size={18} /></Link></div>;
  }

  return (
    <>
      <Seo title="Seleção compartilhada" description="Referências de brindes compartilhadas pela Promo Brindes." path="/selecoes/compartilhada" noIndex />
      <header className="shared-selection-hero"><div className="container"><span className="section-kicker">Seleção compartilhada</span><h1>Uma direção para<br /><em>começar a conversa.</em></h1><p>Estas referências refletem o catálogo público no momento da abertura. Disponibilidade, personalização e condições são confirmadas no briefing.</p><div className="shared-selection-hero__actions"><button ref={duplicateTriggerRef} className="button button--light" type="button" onClick={duplicate} disabled={visibleLoading || Boolean(visibleError) || !visibleItems.length || requiresSelectionReview}><ShoppingBag size={18} /> Duplicar e ajustar</button><button className="button button--ghost-light" type="button" onClick={() => void copyLink()}><Copy size={17} /> {copyStatus.startsWith('Link copiado') ? 'Link copiado' : 'Copiar link'}</button></div><span className="sr-only" role="status" aria-live="polite">{copyStatus}</span></div></header>
      <section className="section shared-selection"><div className="container">
        <aside className="shared-selection__privacy"><ShieldCheck size={19} /><p>Qualquer pessoa com este link pode ver os produtos, quantidades, variantes, alternativas e nomes dos kits. Contato e observações do briefing não são compartilhados.</p></aside>
        {!visibleLoading && !visibleError && visibleInvalidKitReferences.length > 0 && <aside className="shared-selection__privacy shared-selection__privacy--warning" role="alert"><PackageOpen size={19} /><p><strong>A composição do kit precisa de revisão.</strong> Produtos ou mínimos mudaram desde a criação do link. Peça uma seleção atualizada para preservar a composição e as quantidades.</p></aside>}
        {!visibleLoading && !visibleError && (visibleUnavailableProducts.length > 0 || visibleUnavailableVariants.length > 0) && <aside className="shared-selection__privacy shared-selection__privacy--warning" role="alert"><PackageOpen size={19} /><p><strong>Esta seleção precisa de revisão.</strong> {visibleUnavailableProducts.length > 0 && `${visibleUnavailableProducts.length} ${visibleUnavailableProducts.length === 1 ? 'produto não está mais publicado' : 'produtos não estão mais publicados'}. `}{visibleUnavailableVariants.length > 0 && `${visibleUnavailableVariants.length} ${visibleUnavailableVariants.length === 1 ? 'variante não está mais disponível' : 'variantes não estão mais disponíveis'}. `}A duplicação fica protegida até você escolher alternativas atuais no catálogo.</p></aside>}
        {visibleLoading && <div className="shared-selection-state" role="status">Carregando referências…</div>}
        {visibleError && <div className="shared-selection-state" role="alert"><PackageOpen size={40} /><h2>Não deu para abrir agora.</h2><p>{visibleError}</p><button className="button button--dark" type="button" onClick={() => window.location.reload()}>Tentar novamente</button></div>}
        {!visibleLoading && !visibleError && !visibleItems.length && <div className="shared-selection-state"><PackageOpen size={40} /><h2>Os produtos deste link não estão mais publicados.</h2><p>O catálogo muda; explore as alternativas disponíveis agora.</p><Link className="button button--dark" to="/catalogo">Ver alternativas</Link></div>}
        {!visibleLoading && !visibleError && visibleItems.length > 0 && <><div className="shared-selection__heading"><div><span>{visibleItems.length} {visibleItems.length === 1 ? 'referência atual' : 'referências atuais'}</span><h2>{totalUnits(visibleItems).toLocaleString('pt-BR')} unidades estimadas</h2></div><p>{requiresSelectionReview ? 'Revise as referências sinalizadas e peça um link atualizado antes de duplicar esta seleção.' : 'Você pode duplicar esta base e ajustar quantidades antes de pedir uma proposta.'}</p></div><div className="shared-selection__grid">{visibleItems.map((item) => <article key={item.key}><img src={item.imageUrl} alt="" width="180" height="180" referrerPolicy="no-referrer" /><div><p>Cód. {item.sku}</p><h2>{item.name}</h2>{item.decisionGroup === 'alternative' && <span>Alternativa para comparar</span>}{item.kitGroupId && <span>{item.kitName} · {item.kitQuantity} kits × {item.unitsPerKit} un.</span>}{item.colorName && <span>{item.colorName}</span>}{item.variantUnavailable && <span>Variante não publicada</span>}</div><strong>{item.quantity.toLocaleString('pt-BR')} un.</strong><Link to={`/produto/${item.slug}`}>Ver produto <ArrowRight size={16} /></Link></article>)}</div></>}
      </div></section>
      {duplicateConfirmationOpen && <div className="customer-confirmation-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setDuplicateConfirmationOpen(false); window.requestAnimationFrame(() => duplicateTriggerRef.current?.focus()); } }}><section ref={duplicateDialogRef} className="customer-confirmation" role="dialog" aria-modal="true" aria-labelledby="shared-selection-replace-title" aria-describedby="shared-selection-replace-description"><span className="section-kicker">SUA SELEÇÃO ATUAL</span><h2 id="shared-selection-replace-title">Substituir sua seleção atual?</h2><p id="shared-selection-replace-description">Você tem {cart.itemCount} {cart.itemCount === 1 ? 'produto salvo' : 'produtos salvos'}. Ao continuar, eles serão substituídos pelas {visibleItems.length} referências deste link. O contexto anterior será removido para não misturar campanhas.</p><div><button ref={duplicateCancelRef} className="button button--outline" type="button" onClick={() => { setDuplicateConfirmationOpen(false); window.requestAnimationFrame(() => duplicateTriggerRef.current?.focus()); }}>Manter minha seleção</button><button className="button button--green" type="button" onClick={applyDuplicate}>Substituir e ajustar <ShoppingBag size={17} /></button></div></section></div>}
    </>
  );
}
