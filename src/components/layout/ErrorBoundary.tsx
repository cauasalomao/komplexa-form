import { Component, type ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  /** Se passa, usa em vez do fallback padrão */
  fallback?: (error: Error, retry: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Captura qualquer erro de render, lazy load fail, etc — evita tela branca.
 * Sintoma anterior: "as coisas somem". Causa comum: chunk de lazy import
 * falha em deploy novo, ou query lança erro non-caught.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log em prod via console — Vercel captura. Sentry seria upgrade futuro.
    console.error("[ErrorBoundary]", error, info);
  }

  retry = () => {
    this.setState({ error: null });
    // Se for chunk load fail (deploy novo), reload pra pegar bundle novo
    if (this.state.error?.message?.toLowerCase().includes("chunk")) {
      window.location.reload();
    }
  };

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback(this.state.error, this.retry);
      return <DefaultFallback error={this.state.error} onRetry={this.retry} />;
    }
    return this.props.children;
  }
}

function DefaultFallback({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const isChunkError = error.message?.toLowerCase().includes("chunk")
    || error.message?.toLowerCase().includes("dynamically imported");
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="max-w-[440px] text-center">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-warn-soft text-warn">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-[18px] font-bold text-navy">
          {isChunkError ? "Versão atualizada disponível" : "Algo deu errado"}
        </h2>
        <p className="mt-2 text-[13px] text-ktxt">
          {isChunkError
            ? "O app foi atualizado — recarregando pra pegar a versão nova."
            : "Não foi possível carregar essa parte. Tenta de novo."}
        </p>
        <button
          onClick={onRetry}
          className="mt-5 h-10 px-5 rounded-[10px] bg-k-grad text-white font-bold text-[13px] inline-flex items-center gap-2 hover:opacity-95"
        >
          <RefreshCw className="h-4 w-4" /> {isChunkError ? "Recarregar" : "Tentar de novo"}
        </button>
        <details className="mt-4 text-[10.5px] text-kgray text-left">
          <summary className="cursor-pointer hover:text-navy">Detalhes técnicos</summary>
          <pre className="mt-2 p-2 bg-kbg rounded text-[10px] overflow-x-auto whitespace-pre-wrap break-words">
            {error.message}
          </pre>
        </details>
      </div>
    </div>
  );
}
