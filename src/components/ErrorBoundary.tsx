import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = "Ocorreu um erro inesperado.";
      let isPermissionError = false;

      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error?.includes('insufficient permissions')) {
            errorMessage = "Erro de permissão: Não tem autorização para aceder a estes dados.";
            isPermissionError = true;
          }
        }
      } catch (e) {
        if (this.state.error?.message.includes('insufficient permissions')) {
          errorMessage = "Erro de permissão: Não tem autorização para aceder a estes dados.";
          isPermissionError = true;
        }
      }

      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center bg-white rounded-[2.5rem] border-2 border-red-50 shadow-xl shadow-red-100/20">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mb-6">
            <AlertTriangle className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-4">Ups! Algo correu mal</h2>
          <p className="text-gray-500 max-w-md mb-8 font-medium">
            {errorMessage}
            {isPermissionError && (
              <span className="block mt-2 text-xs text-red-400">
                Dica: Tente atualizar a página ou verificar se o seu perfil está corretamente configurado.
              </span>
            )}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-8 py-4 bg-gray-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
          >
            <RefreshCw className="w-4 h-4" /> Recarregar Aplicação
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
