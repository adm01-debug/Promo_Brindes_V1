import { Menu, Search, ShoppingBag, UserRound, X } from 'lucide-react';
import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuoteCart } from '../context/QuoteCartContext';
import { trackFunnelEvent } from '../lib/analytics';
import { useCategories } from '../lib/hooks';
import { hasSiteAuthConfiguration } from '../lib/siteSupabaseConfig';
import { QuoteDrawer } from './QuoteDrawer';
import { SearchAutocomplete } from './SearchAutocomplete';

const navItems = [
  { to: '/catalogo', label: 'Radar de produtos' },
  { to: '/catalogos', label: 'Catálogos' },
  { to: '/datas-comemorativas', label: 'Datas comemorativas' },
  { to: '/catalogo?perfil=kits', label: 'Kits', catalogQuery: true },
  { to: '/catalogo?perfil=novos', label: 'Novos drops', catalogQuery: true },
  { to: '/sobre', label: 'Como funciona' },
  { to: '/contato', label: 'Fale com a gente' },
];

const socialLinks = [
  { network: 'instagram', label: 'Instagram', href: 'https://instagram.com/promobrindesBR' },
  { network: 'facebook', label: 'Facebook', href: 'https://facebook.com/PromoBrindesBR' },
  { network: 'pinterest', label: 'Pinterest', href: 'https://br.pinterest.com/ppromobrindes/' },
  { network: 'youtube', label: 'YouTube', href: 'https://youtube.com/channel/UCqITISXs4OioGbSEVVRGaMw' },
] as const;

function SocialIcon({ network }: { network: typeof socialLinks[number]['network'] }) {
  if (network === 'instagram') return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.7" r="1" className="footer-social__dot" /></svg>;
  if (network === 'facebook') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 21v-8h2.8l.42-3H14V8.1c0-.87.25-1.46 1.5-1.46h1.6V3.95c-.28-.04-1.23-.12-2.34-.12-2.32 0-3.91 1.41-3.91 4.01V10H8.22v3h2.63v8H14Z" /></svg>;
  if (network === 'pinterest') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5a8.5 8.5 0 0 0-3.1 16.42c-.07-1.4-.01-3.08.36-4.65l1.15-4.88s-.29-.58-.29-1.44c0-1.35.78-2.36 1.75-2.36.83 0 1.23.62 1.23 1.37 0 .84-.53 2.09-.8 3.25-.23.97.49 1.77 1.45 1.77 1.74 0 2.92-2.23 2.92-4.87 0-2.01-1.35-3.52-3.81-3.52-2.77 0-4.5 2.07-4.5 4.38 0 .8.24 1.37.61 1.81.17.2.19.29.13.53l-.19.76c-.06.24-.25.33-.46.24-1.7-.69-2.49-2.54-2.49-4.62 0-3.43 2.88-7.55 8.59-7.55 4.59 0 7.61 3.32 7.61 6.89 0 4.71-2.62 8.23-6.48 8.23-1.3 0-2.52-.7-2.94-1.48l-.79 3.12c-.47 1.72-1.37 3.44-2.2 4.78.66.19 1.35.3 2.07.3A8.5 8.5 0 0 0 12 3.5Z" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.6 7.2a3 3 0 0 0-2.1-2.12C17.65 4.58 12 4.58 12 4.58s-5.65 0-7.5.5A3 3 0 0 0 2.4 7.2C1.9 9.06 1.9 12 1.9 12s0 2.94.5 4.8a3 3 0 0 0 2.1 2.12c1.85.5 7.5.5 7.5.5s5.65 0 7.5-.5a3 3 0 0 0 2.1-2.12c.5-1.86.5-4.8.5-4.8s0-2.94-.5-4.8ZM9.95 15.1V8.9L15.4 12l-5.45 3.1Z" /></svg>;
}

export function Layout({ children }: { children: ReactNode }) {
  const cart = useQuoteCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const categories = useCategories();
  const customerAreaEnabled = hasSiteAuthConfiguration();
  const catalogParams = new URLSearchParams(location.search);

  function isNavItemActive(item: typeof navItems[number]) {
    if (item.to === '/catalogo') return location.pathname === '/catalogo' && !catalogParams.get('perfil');
    if (item.catalogQuery) return location.pathname === '/catalogo' && catalogParams.get('perfil') === item.to.split('perfil=')[1];
    return location.pathname === item.to;
  }

  useEffect(() => {
    setMenuOpen(false);
    setSearch(catalogParams.get('q') || '');
    // catalogParams é recomputado a cada render (new URLSearchParams nunca é
    // referencialmente estável); location.search é a string da qual ele deriva
    // por completo, e já está na lista. Incluir catalogParams faria este efeito
    // rodar a cada render do Layout, fechando o menu e resetando a busca sem
    // relação com navegação real.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusFrame = window.requestAnimationFrame(() => mobileNavRef.current?.querySelector<HTMLInputElement>('input')?.focus());
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMenuOpen(false);
        menuButtonRef.current?.focus();
        return;
      }
      if (event.key !== 'Tab' || !mobileNavRef.current) return;
      const focusable = Array.from(mobileNavRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'));
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
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const value = search.trim();
    trackFunnelEvent('search_started', { source: 'header', query_length: value.length, suggestion: false });
    void navigate(value ? `/catalogo?q=${encodeURIComponent(value)}` : '/catalogo');
  };

  return (
    <div className="site-shell">
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
      <div className="utility-bar">
        <div className="container utility-bar__inner">
          <span><i aria-hidden="true" /> Estratégia de marca em forma de presente</span>
          <div className="utility-bar__actions">{customerAreaEnabled && <Link to="/minha-conta"><UserRound size={14} /> Meus orçamentos</Link>}<a href="tel:+551146375517">Briefing urgente? (11) 4637-5517</a></div>
        </div>
      </div>
      <header className="site-header">
        <div className="container site-header__inner">
          <Link to="/" className="brand" aria-label="Promo Brindes — início">
            <img src="/brand/promo-brindes-logo-v2-800.webp" width="800" height="420" alt="Promo Brindes" decoding="async" />
          </Link>
          <nav className="desktop-nav" aria-label="Navegação principal">
            {navItems.map((item) => {
              const active = isNavItemActive(item);
              return <Link key={item.to} to={item.to} className={`nav-link ${active ? 'nav-link--active' : ''}`} aria-current={active ? 'page' : undefined}>{item.label}</Link>;
            })}
          </nav>
          <SearchAutocomplete
            variant="header"
            inputId="header-search"
            label="Buscar no catálogo"
            value={search}
            placeholder="Camiseta, kit, squeeze, tech…"
            categories={categories.data}
            onChange={setSearch}
            onSubmit={(value) => { trackFunnelEvent('search_started', { source: 'header', query_length: value.length, suggestion: false }); void navigate(value ? `/catalogo?q=${encodeURIComponent(value)}` : '/catalogo'); }}
            onSelect={(suggestion) => {
              trackFunnelEvent('search_started', { source: 'header', query_length: suggestion.value.length, suggestion: true });
              void navigate(suggestion.kind === 'category' && suggestion.categoryId ? `/catalogo?categoria=${suggestion.categoryId}&nome=${encodeURIComponent(suggestion.label)}` : `/catalogo?q=${encodeURIComponent(suggestion.value)}`);
            }}
          />
          <button className="selection-button" type="button" onClick={() => cart.setDrawerOpen(true)} aria-label={`Abrir seleção com ${cart.itemCount} produtos`}>
            <ShoppingBag size={20} />
            <span className="selection-button__label">Minha seleção</span>
            <span className="selection-button__count" aria-hidden="true">{cart.itemCount}</span>
          </button>
          <button ref={menuButtonRef} className="menu-button" type="button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-controls="mobile-navigation" aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}>
            {menuOpen ? <X size={23} /> : <Menu size={23} />}
          </button>
        </div>
        {menuOpen && (
          <div ref={mobileNavRef} id="mobile-navigation" className="mobile-nav" role="dialog" aria-modal="true" aria-label="Menu de navegação">
            <form className="mobile-search" role="search" onSubmit={submitSearch}>
              <label className="sr-only" htmlFor="mobile-search">Buscar no catálogo</label>
              <Search size={18} />
              <input id="mobile-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Qual é a ideia?" />
              <button type="submit">Buscar</button>
            </form>
            <nav aria-label="Navegação móvel">
              {navItems.map((item) => {
                const active = isNavItemActive(item);
                return <Link key={item.to} to={item.to} className={active ? 'nav-link--active' : undefined} aria-current={active ? 'page' : undefined}>{item.label}</Link>;
              })}
              <Link to="/orcamento">Transformar seleção em briefing</Link>
              {customerAreaEnabled && <Link to="/minha-conta">Meus orçamentos</Link>}
            </nav>
          </div>
        )}
      </header>

      <main id="conteudo" tabIndex={-1}>{children}</main>

      <footer className="site-footer">
        <div className="container footer-grid">
          <div className="footer-brand">
            <img src="/brand/promo-brindes-logo-v2-800.webp" width="800" height="420" alt="Promo Brindes" loading="lazy" decoding="async" />
            <p>Brindes que viram parte da cultura — não mais um item esquecido na gaveta.</p>
          </div>
          <div>
            <h2>Explore</h2>
            <Link to="/catalogo">Radar completo</Link>
            <Link to="/catalogos">Catálogos por campanha</Link>
            <Link to="/datas-comemorativas">Datas comemorativas</Link>
            <Link to="/catalogo?perfil=kits">Kits</Link>
            <Link to="/catalogo?perfil=novos">Novos drops</Link>
            <Link to="/orcamento">Minha seleção</Link>
            {customerAreaEnabled && <Link to="/minha-conta">Meus orçamentos</Link>}
          </div>
          <div>
            <h2>Promo Brindes</h2>
            <Link to="/sobre">Como funciona</Link>
            <Link to="/contato">Contato</Link>
            <Link to="/privacidade">Privacidade</Link>
          </div>
          <div>
            <h2>Vamos conversar?</h2>
            <a href="tel:+551146375517">(11) 4637-5517</a>
            <a href="mailto:adm01@promobrindes.com.br">adm01@promobrindes.com.br</a>
            <span>São Paulo · SP</span>
          </div>
        </div>
        <div className="footer-social">
          <div className="container footer-social__inner">
            <p><strong>Acompanhe a Promo.</strong><span>Ideias, bastidores e novos drops para a sua próxima campanha.</span></p>
            <nav aria-label="Redes sociais da Promo Brindes">
              {socialLinks.map((social) => <a key={social.network} href={social.href} target="_blank" rel="noopener noreferrer" aria-label={`Promo Brindes no ${social.label}`} onClick={() => trackFunnelEvent('social_link_opened', { network: social.network })}><SocialIcon network={social.network} /><span className="sr-only">{social.label}</span></a>)}
            </nav>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>© {new Date().getFullYear()} Promo Brindes.</span>
          <span>Explore, salve e peça uma proposta · Sem venda online.</span>
        </div>
      </footer>

      {cart.itemCount > 0 && location.pathname !== '/orcamento' && (
        <button className="mobile-selection-fab" type="button" onClick={() => cart.setDrawerOpen(true)}>
          <ShoppingBag size={18} /> Minha seleção <span>{cart.itemCount}</span>
        </button>
      )}
      <QuoteDrawer />
      {cart.canUndoClear && (
        <div className="selection-undo" role="status" aria-live="polite">
          <span>Seleção limpa.</span>
          <button type="button" onClick={cart.restoreLastClear}>Desfazer</button>
          <button type="button" aria-label="Fechar aviso" onClick={cart.dismissLastClear}><X size={16} /></button>
        </div>
      )}
      {cart.canUndoRemoval && !cart.canUndoClear && (
        <div className="selection-undo" role="status" aria-live="polite">
          <span>Produto removido.</span>
          <button type="button" onClick={cart.restoreLastRemoval}>Desfazer</button>
          <button type="button" aria-label="Fechar aviso" onClick={cart.dismissLastRemoval}><X size={16} /></button>
        </div>
      )}
    </div>
  );
}
