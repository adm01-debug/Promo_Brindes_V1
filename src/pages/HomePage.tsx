import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarHeart,
  ChevronRight,
  Gift,
  HeartHandshake,
  Laptop,
  Leaf,
  MessageCircleMore,
  Martini,
  MousePointer2,
  NotebookPen,
  Palette,
  Search,
  Shapes,
  Shirt,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react';
import { type FormEvent, type ReactNode, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CatalogError, ProductGridSkeleton } from '../components/CatalogFeedback';
import { ConversationForm } from '../components/ConversationForm';
import { FoldText } from '../components/FoldText';
import { GlitchText } from '../components/GlitchText';
import { ProductCard } from '../components/ProductCard';
import { Seo } from '../components/Seo';
import { useCatalog, useCategories } from '../lib/hooks';
import type { Category } from '../types';

const PUBLIC_SITE_URL =
  import.meta.env.VITE_PUBLIC_URL?.replace(/\/$/, '') || 'https://promo-brindes-v1.vercel.app';

const categoryIcons: Array<{ match: RegExp; icon: ReactNode; label: string }> = [
  { match: /tecnologia/i, icon: <Laptop />, label: 'Tecnologia' },
  { match: /bar|cozinha/i, icon: <Martini />, label: 'Bar & cozinha' },
  { match: /papelaria|escritório/i, icon: <NotebookPen />, label: 'Escritório' },
  { match: /roupas|acessórios/i, icon: <Shirt />, label: 'Vestuário' },
  { match: /saúde|beleza/i, icon: <HeartHandshake />, label: 'Bem-estar' },
  { match: /ecologia/i, icon: <Leaf />, label: 'Sustentáveis' },
  { match: /esportes|aventura/i, icon: <Trophy />, label: 'Esporte & viagem' },
  { match: /alimentos|bebidas/i, icon: <Gift />, label: 'Sabores' },
];

function curatedCategories(categories: Category[]) {
  return categoryIcons.flatMap((item) => {
    const category = categories.find((candidate) => item.match.test(candidate.name));
    return category ? [{ ...item, category }] : [];
  });
}

export default function HomePage() {
  const [search, setSearch] = useState('');
  const [categoryRetryKey, setCategoryRetryKey] = useState(0);
  const [featuredRetryKey, setFeaturedRetryKey] = useState(0);
  const navigate = useNavigate();
  const categories = useCategories(categoryRetryKey);
  const featured = useCatalog({ pageSize: 8, profile: 'featured', sort: 'curated' }, featuredRetryKey);
  const categoryNameById = useMemo(
    () => new Map(categories.data.map((category) => [category.id, category.name])),
    [categories.data],
  );
  const homepageCategories = curatedCategories(categories.data);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const query = search.trim();
    navigate(query ? `/catalogo?q=${encodeURIComponent(query)}` : '/catalogo');
  };

  return (
    <>
      <Seo
        path="/"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'Promo Brindes',
          url: PUBLIC_SITE_URL,
          telephone: '+55 11 4637-5517',
          address: { '@type': 'PostalAddress', addressLocality: 'São Paulo', addressRegion: 'SP', addressCountry: 'BR' },
        }}
      />

      <section className="hero" aria-labelledby="hero-title">
        <picture className="hero__media" aria-hidden="true">
          <source
            srcSet="/images/hero-gen-z-v2-640.webp 640w, /images/hero-gen-z-v2-828.webp 828w, /images/hero-gen-z-v2-1024.webp 1024w, /images/hero-gen-z-v2.webp 1672w"
            sizes="100vw"
            type="image/webp"
          />
          <img
            src="/images/hero-gen-z-v2.webp"
            alt=""
            width="1672"
            height="941"
            decoding="async"
            fetchPriority="high"
          />
        </picture>
        <div className="hero__veil" />
        <div className="container hero__content">
          <p className="hero__eyebrow"><span>Feito para marketing</span> Do moodboard à proposta</p>
          <h1 id="hero-title" aria-label="Sua campanha merece um brinde que ninguém esquece.">
            <FoldText
              className="hero-fold-text"
              text="Sua campanha merece um brinde"
              splitBy="word"
              hinge="top"
              duration={0.76}
              stagger={0.07}
              perspective={900}
              creaseShading={0.42}
            />
            <em>
              <FoldText
                className="hero-fold-text"
                text="que ninguém esquece."
                splitBy="word"
                hinge="bottom"
                duration={0.82}
                stagger={0.09}
                perspective={850}
                creaseShading={0.5}
              />
            </em>
          </h1>
          <p className="hero__lead">Explore o que tem potencial, salve suas referências e compartilhe o briefing. A curadoria entra quando você quiser — sem checkout.</p>
          <div className="hero__actions">
            <Link className="button button--green button--large" to="/catalogo">Montar minha seleção <ArrowRight size={19} /></Link>
            <a className="button button--glass button--large" href="#drop-da-vez">Ver o drop da vez</a>
          </div>
          <form className="hero-search" role="search" onSubmit={submitSearch}>
            <Search size={21} aria-hidden="true" />
            <label className="sr-only" htmlFor="hero-search">Buscar produtos</label>
            <input id="hero-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Busque camiseta, kit, squeeze, tech…" />
            <button type="submit">Explorar <ArrowRight size={17} /></button>
          </form>
          <nav className="hero__quick-links" aria-label="Buscas em alta">
            <span>Em alta:</span>
            <Link to="/catalogo?perfil=kits">Kits de onboarding</Link>
            <Link to="/catalogo?q=camiseta">Wearables</Link>
            <Link to="/catalogo?q=carregador">Tech útil</Link>
            <Link to="/catalogo?q=reciclado">Menor impacto</Link>
          </nav>
        </div>
        <div className="hero__sticker" aria-hidden="true"><Zap /><strong>ideia</strong><span>vira impacto</span></div>
      </section>

      <section className="signal-strip" aria-label="Como a experiência funciona">
        <div className="container signal-strip__inner">
          <p><span>01</span> Explore no seu ritmo</p>
          <p><span>02</span> Salve em um clique</p>
          <p><span>03</span> Chame a curadoria</p>
          <p><span>04</span> Receba uma proposta real</p>
        </div>
      </section>

      <section className="category-section section">
        <div className="container">
          <div className="section-heading section-heading--split">
            <div>
              <span className="section-kicker">Encontre seu ponto de partida</span>
              <h2>Escolha pela vibe. A gente cuida da operação.</h2>
            </div>
            <p>Você pensa em público, contexto e impacto. Nós aproximamos isso de produtos que fazem sentido.</p>
          </div>
          <div className="category-grid">
            {categories.error
              ? <CatalogError message={categories.error} onRetry={() => setCategoryRetryKey((key) => key + 1)} />
              : categories.loading
              ? Array.from({ length: 8 }, (_, index) => <div key={index} className="category-card category-card--loading" />)
              : homepageCategories.map(({ category, icon, label }, index) => (
                  <Link
                    key={category.id}
                    className={`category-card category-card--${(index % 4) + 1}`}
                    to={`/catalogo?categoria=${category.id}&nome=${encodeURIComponent(label)}`}
                  >
                    <span className="category-card__number">0{index + 1}</span>
                    <span className="category-card__icon">{icon}</span>
                    <span className="category-card__label">{label}</span>
                    <ChevronRight className="category-card__arrow" />
                  </Link>
                ))}
          </div>
        </div>
      </section>

      <section id="drop-da-vez" className="featured-section section" aria-labelledby="featured-title">
        <div className="container">
          <div className="section-heading section-heading--split">
            <div>
              <span className="section-kicker">Curadoria viva · atualizada pelo catálogo</span>
              <h2 id="featured-title"><GlitchText>Drop da vez.</GlitchText></h2>
            </div>
            <Link className="text-link" to="/catalogo?perfil=destaques">Abrir a seleção completa <ArrowRight size={17} /></Link>
          </div>
          {featured.loading && <ProductGridSkeleton />}
          {featured.error && <CatalogError message={featured.error} onRetry={() => setFeaturedRetryKey((key) => key + 1)} />}
          {!featured.loading && !featured.error && (
            <div className="product-grid" tabIndex={0} aria-label="Destaques do catálogo; deslize horizontalmente em telas pequenas">
              {featured.data.products.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  priority={index < 4}
                  categoryName={categoryNameById.get(product.mainCategoryId || '')}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="campaign-lab section" aria-labelledby="campaign-lab-title">
        <div className="container campaign-lab__layout">
          <div className="campaign-lab__intro">
            <span className="section-kicker">Promo Lab</span>
            <h2 id="campaign-lab-title">Seu briefing não deveria começar numa planilha.</h2>
            <p>Comece pelo que a ação precisa fazer as pessoas sentirem. Produto, técnica e quantidade entram depois — com repertório e contexto.</p>
            <Link className="button button--dark button--large" to="/sobre">Conhecer nosso processo <ArrowRight size={18} /></Link>
          </div>
          <div className="campaign-lab__cards">
            <article className="lab-card lab-card--blue"><span>01 / CULTURA</span><Shapes /><h3>Do moodboard ao produto</h3><p>Transformamos referências visuais em caminhos que cabem no mundo real.</p></article>
            <article className="lab-card lab-card--lime"><span>02 / CURADORIA</span><Palette /><h3>Menos ruído, mais direção</h3><p>Você compara uma seleção coerente em vez de abrir cinquenta abas iguais.</p></article>
            <article className="lab-card lab-card--coral"><span>03 / CONTEXTO</span><BadgeCheck /><h3>Bonito para usar. Claro para aprovar.</h3><p>Organize códigos, quantidades e intenção em um briefing pronto para circular.</p></article>
          </div>
        </div>
      </section>

      <section className="occasion-section section">
        <div className="container occasion-layout">
          <div className="occasion-intro">
            <span className="section-kicker section-kicker--light">Marca para viver, não para guardar</span>
            <h2>Brinde também é mídia. Só que as pessoas levam.</h2>
            <p>Utilidade, acabamento e relevância cultural fazem a marca continuar presente quando a campanha já saiu do feed.</p>
            <Link className="button button--light" to="/contato">Trazer meu briefing <ArrowRight size={18} /></Link>
          </div>
          <div className="occasion-grid">
            <article><span><BriefcaseBusiness /></span><div><p>01 / PEOPLE</p><h3>Onboarding sem kit genérico</h3><small>Boas-vindas que já apresentam a cultura da empresa.</small></div></article>
            <article><span><CalendarHeart /></span><div><p>02 / LIVE</p><h3>Evento que continua no feed</h3><small>Itens que rendem uso, conversa e memória depois do credenciamento.</small></div></article>
            <article><span><Trophy /></span><div><p>03 / RECOGNITION</p><h3>Reconhecimento com desejo</h3><small>Presentes que parecem escolha — não obrigação corporativa.</small></div></article>
            <article><span><HeartHandshake /></span><div><p>04 / COMMUNITY</p><h3>Merch que a comunidade quer usar</h3><small>Qualidade e estilo para a marca circular de verdade.</small></div></article>
          </div>
        </div>
      </section>

      <section className="process-section section" aria-labelledby="process-title">
        <div className="container">
          <div className="process-heading">
            <span className="section-kicker">Seu workflow, só que mais leve</span>
            <h2 id="process-title">Do insight à proposta em três movimentos.</h2>
          </div>
          <ol className="process-list">
            <li><span>01 / DISCOVERY</span><div><MousePointer2 /><h3>Salve referências</h3><p>Explore sem login, compare produtos e monte uma seleção visual no seu ritmo.</p></div></li>
            <li><span>02 / BRIEF</span><div><Sparkles /><h3>Dê o contexto</h3><p>Ajuste quantidades, prazo e objetivo da ação em um briefing curto.</p></div></li>
            <li><span>03 / HUMAN TOUCH</span><div><MessageCircleMore /><h3>Converse com quem entende</h3><p>Receba uma proposta consultiva, clara e pronta para levar ao time.</p></div></li>
          </ol>
        </div>
      </section>

      <section className="brand-manifesto section" aria-labelledby="brand-manifesto-title">
        <div className="container brand-manifesto__frame">
          <div className="brand-manifesto__intro">
            <div className="brand-manifesto__meta">
              <span className="section-kicker">O jeito Promo</span>
              <span aria-hidden="true">Manifesto 01—04</span>
            </div>
            <h2 id="brand-manifesto-title">Entender <span>para atender</span></h2>
            <p>Antes de falar em produto, a gente escuta a ideia, lê o contexto e entende quem precisa ser conquistado.</p>
          </div>

          <div className="brand-manifesto__grid">
            <article className="brand-statement brand-statement--connection">
              <span className="brand-statement__number" aria-hidden="true">02</span>
              <p>Nosso propósito</p>
              <h3>Conectando <em>Marcas</em> e <em>Pessoas</em></h3>
              <small>Brindes são pontos de contato: precisam carregar significado, não apenas um logo.</small>
            </article>
            <article className="brand-statement brand-statement--detail">
              <span className="brand-statement__number" aria-hidden="true">03</span>
              <p>Nosso padrão</p>
              <h3>Excelência em cada detalhe</h3>
              <small>Da curadoria ao acabamento, cada escolha trabalha para valorizar a experiência inteira.</small>
            </article>
            <article className="brand-statement brand-statement--delight">
              <span className="brand-statement__number" aria-hidden="true">04</span>
              <div>
                <p>É isso que nos move</p>
                <h3>Encantar pessoas, <em>somos bons nisso!</em></h3>
              </div>
              <a className="button button--light button--large" href="#conversa">Criar algo memorável <ArrowRight size={18} /></a>
            </article>
          </div>
        </div>
      </section>

      <ConversationForm />
    </>
  );
}
