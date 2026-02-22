// ============================================================
// Axon — Error Boundary
// Catches render errors and shows a fallback UI instead of
// crashing the entire app with a white screen.
// ============================================================
import React, { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { AlertCircle, RotateCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary] Caught error:', error, info.componentStack);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-zinc-950 px-6">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} className="text-rose-400" />
            </div>
            <h1 className="text-xl text-white mb-2">Algo salio mal</h1>
            <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
              Ocurrio un error inesperado. Puedes intentar recargar la pagina.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <pre className="text-xs text-rose-300/70 bg-rose-500/5 border border-rose-500/10 rounded-xl p-4 mb-6 text-left overflow-auto max-h-40">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-600 transition-colors text-sm"
              >
                <RotateCw size={14} />
                Reintentar
              </button>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white transition-colors text-sm"
              >
                Recargar pagina
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
