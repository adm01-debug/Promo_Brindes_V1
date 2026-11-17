import { ArrowRight, Sparkles } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CatalogError, ProductGridSkeleton } from '../components/CatalogFeedback';
import { ContextualFaq } from '../components/ContextualFaq';
import { ProductCard } from '../components/ProductCard';
import { Seo } from '../components/Seo';
import { trackFunnelEvent } from '../lib/analytics';
import { getIdeaLanding } from '../lib/ideaLandings';
import { useCatalog } from '../lib/hooks';

export default function IdeaLandingPage() {
  const { topic } = useParams();
  const landing = getIdeaLanding(topic);
  const catalog = useCatalog(landing?.catalogQuery || { pageSize: 1 }, 0, Boolean(landing));
  const trackedViewsRef = useRef(new Set<string>());
  // result_count mede as referencias que esta pagina renderizou, nao o total de
  // linhas do catalogQuery: o tema onboarding nao tem filtro, logo o total seria
  // o catalogo publico inteiro e os quatro temas ficariam incomparaveis no
  // painel, embora todos mostrem a mesma quantidade de cards. No estado de erro
  // nada e renderizado e `data` ainda pode guardar os produtos do tema anterior,
  // entao o valor e 0 por construcao, nunca lido de `data`.
  const viewedReferences = catalog.error ? 0 : catalog.data.products.length;
  // Mesmo contrato do catalogo (useCatalogPageState.ts:194-200): um evento por
  // combinacao de conteudo, emitido so quando a curadoria da landing resolveu.
  // O erro tambem e um desfecho: sem emiti-lo, os dois CTAs seguiriam emitindo
  // idea_catalog_opened e a conversao passaria de 100% durante a queda.
  useEffect(() => {
    if (!landing || catalog.stale || catalog.loading) return;
    const viewKey = `${landing.id}|${viewedReferences}`;
    if (trackedViewsRef.current.has(viewKey)) return;
    trackedViewsRef.current.add(viewKey);
    trackFunnelEvent('idea_landing_viewed', { topic: landing.id, result_count: viewedReferences });
  }, [catalog.loading, catalog.stale, landing, viewedReferences]);

  if (!landing) return <div className="idea-landing-state container"><Seo title="Ideia não encontrada" path="/ideias" noIndex /><h1>Essa ideia ainda não está publicada.</h1><p>Volte ao catálogo para explorar referências para a sua campanha.</p><Link className="button button--dark" to="/catalogo">Abrir catálogo</Link></div>;

  return <>
    <Seo title={landing.title} description={landing.description} path={`/ideias/${landing.id}`} />
    <header className="idea-landing-hero"><div className="container"><span className="section-kicker">{landing.eyebrow}</span><h1>{landing.title}</h1><p>{landing.description}</p><div><Link className="button button--green button--large" to={landing.catalogUrl} onClick={() => trackFunnelEvent('idea_catalog_opened', { topic: landing.id, placement: 'hero' })}>Explorar a curadoria <ArrowRight size={18} /></Link><a className="text-link" href="#referencias">Ver referências</a></div></div></header>
    <section className="idea-landing-intro section"><div className="container"><p>{landing.detail}</p><div className="idea-landing-checkpoints">{landing.checkpoints.map((checkpoint, index) => <article key={checkpoint.title}><span>0{index + 1}</span><h2>{checkpoint.title}</h2><p>{checkpoint.text}</p></article>)}</div></div></section>
    <section id="referencias" className="idea-landing-products section"><div className="container"><div className="section-heading section-heading--split"><div><span className="section-kicker">Referências públicas</span><h2>Comece por uma seleção.<br /><em>Ajuste com contexto.</em></h2></div><p>Estas referências não representam preço, estoque ou prazo. Salve o que faz sentido e use o briefing para receber orientação real.</p></div>{catalog.loading ? <ProductGridSkeleton count={4} /> : catalog.error ? <CatalogError message={catalog.error} onRetry={() => window.location.reload()} /> : catalog.data.products.length ? <div className="product-grid">{catalog.data.products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="catalog-empty"><h3>Esta curadoria está sendo atualizada.</h3><p>Abra o catálogo completo para encontrar referências que façam sentido para a sua campanha.</p></div>}<Link className="button button--dark" to={landing.catalogUrl} onClick={() => trackFunnelEvent('idea_catalog_opened', { topic: landing.id, placement: 'referencias' })}>Ver curadoria completa <ArrowRight size={18} /></Link></div></section>
    <section className="idea-landing-next"><div className="container"><Sparkles size={24} /><div><span>PRÓXIMO PASSO</span><h2>Uma boa ideia fica melhor quando encontra os detalhes certos.</h2><p>Quantidade, identidade visual, apresentação e prazo entram na conversa com nosso time de especialistas.</p></div><Link className="button button--light" to="/contato">Falar sobre a campanha <ArrowRight size={18} /></Link></div></section>
    <div className="container idea-landing-faq"><ContextualFaq scope="catalog" /></div>
  </>;
}
