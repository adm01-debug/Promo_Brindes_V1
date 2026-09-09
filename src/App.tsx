import { lazy, Suspense, useEffect, useRef } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { QuoteCartProvider } from './context/QuoteCartContext';
import { CustomerAuthProvider } from './context/CustomerAuthContext';
import HomePage from './pages/HomePage';
import { redactAnalyticsUrl } from './lib/analytics';

const CatalogPage = lazy(() => import('./pages/CatalogPage'));
const CatalogsPage = lazy(() => import('./pages/CatalogsPage'));
const ProductPage = lazy(() => import('./pages/ProductPage'));
const QuotePage = lazy(() => import('./pages/QuotePage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const CustomerLoginPage = lazy(() => import('./pages/CustomerLoginPage'));
const CustomerAccountPage = lazy(() => import('./pages/CustomerAccountPage'));
const CustomerQuotePage = lazy(() => import('./pages/CustomerQuotePage'));
const AuthConfirmPage = lazy(() => import('./pages/AuthConfirmPage'));
const SetPasswordPage = lazy(() => import('./pages/SetPasswordPage'));

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
        <CustomerAuthProvider>
          <Analytics beforeSend={redactAnalyticsUrl} debug={false} />
          <ScrollManager />
          <AppErrorBoundary>
            <Layout>
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/catalogo" element={<CatalogPage />} />
                <Route path="/catalogos" element={<CatalogsPage />} />
                <Route path="/produto/:identifier" element={<ProductPage />} />
                <Route path="/orcamento" element={<QuotePage />} />
                <Route path="/sobre" element={<AboutPage />} />
                <Route path="/contato" element={<ContactPage />} />
                <Route path="/privacidade" element={<PrivacyPage />} />
                <Route path="/entrar" element={<CustomerLoginPage />} />
                <Route path="/auth/confirm" element={<AuthConfirmPage />} />
                <Route path="/definir-senha" element={<SetPasswordPage />} />
                <Route path="/minha-conta" element={<CustomerAccountPage />} />
                <Route path="/minha-conta/orcamentos/:id" element={<CustomerQuotePage />} />
                <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </Layout>
          </AppErrorBoundary>
        </CustomerAuthProvider>
      </QuoteCartProvider>
    </BrowserRouter>
  );
}
