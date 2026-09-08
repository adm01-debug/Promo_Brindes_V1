import { Component, type ErrorInfo, type ReactNode } from 'react';

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
    console.error('Falha inesperada na interface pública.', error, info.componentStack);
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
