import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportClientError } from '../lib/clientObservability';

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // O stack completo pode conter texto de dados renderizados. No console e
    // no coletor registramos apenas classe e rota; o detalhe fica no ambiente
    // de desenvolvimento, onde o React já o apresenta ao desenvolvedor.
    console.error('site_frontend_error', { errorClass: error.name || 'Error', route: window.location.pathname, component: info.componentStack?.split('\n')[1]?.trim() || null });
    reportClientError(error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="app-error" role="alert">
        <span className="section-kicker">Pausa técnica</span>
        <h1>Essa página não carregou como deveria.</h1>
        <p>Sua seleção continua salva neste navegador. Recarregue para tentar novamente.</p>
        <button className="button button--dark" type="button" onClick={() => window.location.reload()}>
          Recarregar página
        </button>
      </main>
    );
  }
}
