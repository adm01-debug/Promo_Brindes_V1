import { Menu, Search, ShoppingBag, X } from 'lucide-react';
import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useQuoteCart } from '../context/QuoteCartContext';
import { QuoteDrawer } from './QuoteDrawer';

const navItems = [
  { to: '/catalogo', label: 'Radar de produtos' },
  { to: '/sobre', label: 'Como funciona' },
  { to: '/contato', label: 'Fale com a gente' },
];

export function Layout({ children }: { children: ReactNode }) {
  const cart = useQuoteCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => setMenuOpen(false), [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const value = search.trim();
    navigate(value ? `/catalogo?q=${encodeURIComponent(value)}` : '/catalogo');
  };

  return (
    <div className="site-shell">
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
      <div className="utility-bar">
        <div className="container utility-bar__inner">
          <span><i aria-hidden="true" /> Estratégia de marca em forma de presente</span>
          <a href="tel:+551146375517">Briefing urgente? (11) 4637-5517</a>
        </div>
      </div>
      <header className="site-header">
        <div className="container site-header__inner">
          <Link to="/" className="brand" aria-label="Promo Brindes — início">
            <img src="/brand/promo-brindes-logo-v1-360.webp" width="154" height="80" alt="Promo Brindes" decoding="async" />
          </Link>
          <nav className="desktop-nav" aria-label="Navegação principal">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => isActive ? 'nav-link nav-link--active' : 'nav-link'}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <form className="header-search" role="search" onSubmit={submitSearch}>
            <label className="sr-only" htmlFor="header-search">Buscar no catálogo</label>
            <Search size={18} aria-hidden="true" />
            <input id="header-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Camiseta, kit, squeeze, tech…" />
          </form>
          <button className="selection-button" type="button" onClick={() => cart.setDrawerOpen(true)} aria-label={`Abrir seleção com ${cart.itemCount} produtos`}>
            <ShoppingBag size={20} />
            <span className="selection-button__label">Meus saves</span>
            <span className="selection-button__count" aria-hidden="true">{cart.itemCount}</span>
          </button>
          <button ref={menuButtonRef} className="menu-button" type="button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-controls="mobile-navigation" aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}>
            {menuOpen ? <X size={23} /> : <Menu size={23} />}
          </button>
        </div>
        {menuOpen && (
          <div id="mobile-navigation" className="mobile-nav">
            <form className="mobile-search" role="search" onSubmit={submitSearch}>
              <label className="sr-only" htmlFor="mobile-search">Buscar no catálogo</label>
              <Search size={18} />
              <input id="mobile-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Qual é a ideia?" />
              <button type="submit">Buscar</button>
            </form>
            <nav aria-label="Navegação móvel">
              {navItems.map((item) => <NavLink key={item.to} to={item.to}>{item.label}</NavLink>)}
              <Link to="/orcamento">Transformar saves em briefing</Link>
            </nav>
          </div>
        )}
      </header>

      <main id="conteudo" tabIndex={-1}>{children}</main>

      <footer className="site-footer">
        <div className="container footer-grid">
          <div className="footer-brand">
            <img src="/brand/promo-brindes-logo-v1-360.webp" width="180" height="94" alt="Promo Brindes" loading="lazy" decoding="async" />
            <p>Brindes que viram parte da cultura — não mais um item esquecido na gaveta.</p>
          </div>
          <div>
            <h2>Explore</h2>
            <Link to="/catalogo">Radar completo</Link>
            <Link to="/catalogo?perfil=kits">Kits & onboarding</Link>
            <Link to="/catalogo?perfil=novos">Novos drops</Link>
            <Link to="/orcamento">Meus saves</Link>
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
        <div className="container footer-bottom">
          <span>© {new Date().getFullYear()} Promo Brindes.</span>
          <span>Explore, salve e peça uma proposta · Sem venda online.</span>
        </div>
      </footer>

      {cart.itemCount > 0 && location.pathname !== '/orcamento' && (
        <button className="mobile-selection-fab" type="button" onClick={() => cart.setDrawerOpen(true)}>
          <ShoppingBag size={18} /> Meus saves <span>{cart.itemCount}</span>
        </button>
      )}
      <QuoteDrawer />
    </div>
  );
}
