import { lazy, Suspense, useEffect, useRef } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { QuoteCartProvider } from './context/QuoteCartContext';
import { CustomerAuthProvider } from './context/CustomerAuthContext';
import HomePage from './pages/HomePage';
import { redactAnalyticsUrl } from './lib/analytics';

const CatalogPage = lazy(() => import('./pages/CatalogPage'));
const CatalogsPage = lazy(() => import('./pages/CatalogsPage'));
const CommemorativeDatesPage = lazy(() => import('./pages/CommemorativeDatesPage'));
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
const SharedSelectionPage = lazy(() => import('./pages/SharedSelectionPage'));
const IdeaLandingPage = lazy(() => import('./pages/IdeaLandingPage'));

function ScrollManager() {
  const { key, pathname } = useLocation();
  const initialRender = useRef(true);
  const previousPathname = useRef<string | null>(null);
  const positions = useRef(new Map<string, number>());
  useEffect(() => {
    // positions.current nunca é reatribuído (só mutado com set/delete), então
    // capturá-lo aqui é equivalente a lê-lo no cleanup — mas satisfaz a regra,
    // que não distingue esse Map estável de um ref de nó DOM reatribuível.
    const positionsMap = positions.current;
    const savedPosition = positionsMap.get(key);
    const pathChanged = previousPathname.current !== null && previousPathname.current !== pathname;
    // Atualizações locais de busca/filtro mudam a URL, mas não devem roubar foco
    // nem devolver a pessoa ao topo da mesma página.
    if (previousPathname.current === null || pathChanged) {
      window.scrollTo({ top: savedPosition ?? 0, behavior: 'auto' });
    }
    let frame: number | undefined;
    if (initialRender.current) {
      initialRender.current = false;
    } else if (pathChanged) {
      frame = window.requestAnimationFrame(() => {
        document.getElementById('conteudo')?.focus({ preventScroll: true });
      });
    }
    previousPathname.current = pathname;
    return () => {
      if (frame !== undefined) window.cancelAnimationFrame(frame);
      positionsMap.set(key, window.scrollY);
      // Mantém a memória de navegação curta sem crescer durante longas sessões.
      if (positionsMap.size > 40) positionsMap.delete(positionsMap.keys().next().value as string);
    };
  }, [key, pathname]);
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
          <SpeedInsights />
          <ScrollManager />
          <AppErrorBoundary>
            <Layout>
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/catalogo" element={<CatalogPage />} />
                <Route path="/catalogos" element={<CatalogsPage />} />
                <Route path="/datas-comemorativas" element={<CommemorativeDatesPage />} />
                <Route path="/produto/:identifier" element={<ProductPage />} />
                <Route path="/orcamento" element={<QuotePage />} />
                <Route path="/selecoes/compartilhada" element={<SharedSelectionPage />} />
                <Route path="/ideias/:topic" element={<IdeaLandingPage />} />
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
