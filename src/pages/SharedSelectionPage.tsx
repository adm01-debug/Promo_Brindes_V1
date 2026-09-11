import { ArrowRight, Copy, PackageOpen, ShieldCheck, ShoppingBag } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Seo } from '../components/Seo';
import { useQuoteCart } from '../context/QuoteCartContext';
import { fetchProductsByIds } from '../lib/catalog';
import { decodeSharedSelection, hydrateSharedSelection } from '../lib/sharedSelection';
import type { QuoteItem } from '../types';

function totalUnits(items: QuoteItem[]): number {
  return items.reduce((total, item) => total + item.quantity, 0);
}

export default function SharedSelectionPage() {
  const [params] = useSearchParams();
  const cart = useQuoteCart();
  const payload = useMemo(() => decodeSharedSelection(params.get('s')), [params]);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [loading, setLoading] = useState(Boolean(payload.length));
  const [error, setError] = useState('');
  const [copyStatus, setCopyStatus] = useState('');

  useEffect(() => {
    if (!payload.length) {
      setItems([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError('');
    void fetchProductsByIds(payload.map((item) => item.id), controller.signal, payload.length)
      .then((products) => {
        if (!controller.signal.aborted) setItems(hydrateSharedSelection(payload, products));
      })
      .catch(() => { if (!controller.signal.aborted) setError('Não foi possível consultar esta seleção agora.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [payload]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyStatus('Link copiado para a área de transferência.');
    } catch {
      setCopyStatus('Não foi possível copiar o link agora.');
    }
  }

  function duplicate() {
    cart.replaceItems(items);
    cart.setDrawerOpen(true);
  }

  if (!payload.length) {
    return <div className="shared-selection-state container"><Seo title="Seleção não encontrada" path="/selecoes/compartilhada" noIndex /><PackageOpen size={42} /><span>LINK INVÁLIDO</span><h1>Esta seleção não está disponível.</h1><p>Peça um novo link ou comece uma seleção pelo catálogo.</p><Link className="button button--dark" to="/catalogo">Abrir catálogo <ArrowRight size={18} /></Link></div>;
  }

  return (
    <>
      <Seo title="Seleção compartilhada" description="Referências de brindes compartilhadas pela Promo Brindes." path="/selecoes/compartilhada" noIndex />
      <header className="shared-selection-hero"><div className="container"><span className="section-kicker">Seleção compartilhada</span><h1>Uma direção para<br /><em>começar a conversa.</em></h1><p>Estas referências refletem o catálogo público no momento da abertura. Disponibilidade, personalização e condições são confirmadas no briefing.</p><div className="shared-selection-hero__actions"><button className="button button--light" type="button" onClick={duplicate} disabled={loading || !items.length}><ShoppingBag size={18} /> Duplicar e ajustar</button><button className="button button--ghost-light" type="button" onClick={() => void copyLink}><Copy size={17} /> {copyStatus.startsWith('Link copiado') ? 'Link copiado' : 'Copiar link'}</button></div><span className="sr-only" role="status" aria-live="polite">{copyStatus}</span></div></header>
      <section className="section shared-selection"><div className="container">
        <aside className="shared-selection__privacy"><ShieldCheck size={19} /><p>Este link não inclui contato, nome de campanha, observações ou dados de orçamento. Ele mostra somente produtos, quantidades e variantes publicadas.</p></aside>
        {loading && <div className="shared-selection-state" role="status">Carregando referências…</div>}
        {error && <div className="shared-selection-state" role="alert"><PackageOpen size={40} /><h2>Não deu para abrir agora.</h2><p>{error}</p><button className="button button--dark" type="button" onClick={() => window.location.reload()}>Tentar novamente</button></div>}
        {!loading && !error && !items.length && <div className="shared-selection-state"><PackageOpen size={40} /><h2>Os produtos deste link não estão mais publicados.</h2><p>O catálogo muda; abra o radar para encontrar alternativas atuais.</p><Link className="button button--dark" to="/catalogo">Ver alternativas</Link></div>}
        {!loading && !error && items.length > 0 && <><div className="shared-selection__heading"><div><span>{items.length} {items.length === 1 ? 'referência' : 'referências'}</span><h2>{totalUnits(items).toLocaleString('pt-BR')} unidades estimadas</h2></div><p>Você pode duplicar esta base e ajustar quantidades antes de pedir uma proposta.</p></div><div className="shared-selection__grid">{items.map((item) => <article key={item.key}><img src={item.imageUrl} alt="" width="180" height="180" referrerPolicy="no-referrer" /><div><p>Cód. {item.sku}</p><h2>{item.name}</h2>{item.colorName && <span>{item.colorName}</span>}</div><strong>{item.quantity.toLocaleString('pt-BR')} un.</strong><Link to={`/produto/${item.slug}`}>Ver produto <ArrowRight size={16} /></Link></article>)}</div></>}
      </div></section>
    </>
  );
}
