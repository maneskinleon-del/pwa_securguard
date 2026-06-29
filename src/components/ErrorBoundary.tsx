/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * Global Error Boundary: captures any render-phase exception so the app shows a
 * friendly fallback instead of unmounting into a permanent black screen.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // This project ships no React type definitions (no @types/react, React 19 bundles none),
  // so `Component` is typed as `any` and does not provide `props`/`state`. Declare them
  // locally: `declare props` is type-only (emits nothing, React sets it at runtime), and
  // `state` is a real initialized field. Runtime behaviour is unchanged.
  declare props: ErrorBoundaryProps;
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface the crash for diagnostics (message + component stack)
    console.error('[ErrorBoundary] Render crash capturado:', error, info?.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#020617] text-slate-100 flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-[#0f172a] border border-slate-800 rounded-[2rem] p-8 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <ShieldAlert className="w-7 h-7 text-rose-400" />
            </div>
            <h1 className="text-lg font-bold text-white tracking-tight">Se produjo un error inesperado</h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              La consola detuvo la operación para proteger tus datos. Tus registros locales no se
              perdieron. Puedes recargar para continuar.
            </p>
            {this.state.error?.message && (
              <pre className="text-[10px] text-rose-300/80 bg-[#020617] border border-slate-800 rounded-xl p-3 overflow-x-auto text-left whitespace-pre-wrap">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Recargar aplicación
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
