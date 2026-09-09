import { lazy, Suspense, useEffect, useRef } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { QuoteCartProvider } from './context/QuoteCartContext';
import HomePage from './pages/HomePage';

const CatalogPage = lazy(() => import('./pages/CatalogPage'));
const ProductPage = lazy(() => import('./pages/ProductPage'));
const QuotePage = lazy(() => import('./pages/QuotePage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function ScrollManager() {
  const { pathname } = useLocation();
  const initialRender = useRef(true);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      document.getElementById('conteudo')?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);
  return null;
}

function RouteFallback() {
  return <div className="route-fallback" role="status" aria-label="Carregando página"><span /><span /><span /></div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <QuoteCartProvider>
        <ScrollManager />
        <AppErrorBoundary>
          <Layout>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/catalogo" element={<CatalogPage />} />
                <Route path="/produto/:identifier" element={<ProductPage />} />
                <Route path="/orcamento" element={<QuotePage />} />
                <Route path="/sobre" element={<AboutPage />} />
                <Route path="/contato" element={<ContactPage />} />
                <Route path="/privacidade" element={<PrivacyPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </Layout>
        </AppErrorBoundary>
      </QuoteCartProvider>
    </BrowserRouter>
  );
}
