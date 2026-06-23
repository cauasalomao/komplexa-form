import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import App from "./App";
import { supabase, supabaseConfigured } from "./integrations/supabase/client";
import "./index.css";

/** Tela de erro amigável quando faltam as variáveis de ambiente do Supabase
 *  (causa #1 de "tela branca" em deploy novo no Vercel). */
function ConfigError() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "Inter, system-ui, sans-serif", background: "#EEF1F6" }}>
      <div style={{ maxWidth: 520, background: "#fff", border: "1px solid #DDE3ED", borderRadius: 12, padding: 28 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: "#0E1E35", margin: 0 }}>Configuração faltando</h1>
        <p style={{ fontSize: 14, color: "#4A5770", marginTop: 10, lineHeight: 1.5 }}>
          As variáveis de ambiente do Supabase não foram encontradas. No Vercel, vá em{" "}
          <b>Project → Settings → Environment Variables</b> e adicione:
        </p>
        <pre style={{ background: "#F3F6FA", border: "1px solid #DDE3ED", borderRadius: 8, padding: 12, fontSize: 12.5, color: "#0E1E35", overflowX: "auto", marginTop: 12 }}>
{`VITE_SUPABASE_URL=https://<seu-projeto>.supabase.co
VITE_SUPABASE_ANON_KEY=<sua-anon-key>`}
        </pre>
        <p style={{ fontSize: 13, color: "#8896A8", marginTop: 12, lineHeight: 1.5 }}>
          Depois de salvar, faça um <b>Redeploy</b> (as variáveis VITE_ são embutidas no build).
        </p>
      </div>
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 1 min é o sweet-spot: dados não ficam "velhos" muito tempo MAS
      // não dispara refetch toda vez que troca de rota. Antes 30s + always
      // causava sintoma "piscar" ao navegar entre /leads → /detail → /leads.
      staleTime: 60_000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      // true (default — respeita staleTime). Antes era "always" que
      // forçava refetch em todo mount, causando flicker ao trocar rota.
      refetchOnMount: true,
      retry: 1,
      // 15min: mantém cache mesmo sem consumers — evita "tela vazia"
      // quando user volta pra rota que já tinha visitado
      gcTime: 15 * 60 * 1000,
    },
    mutations: { retry: 0 },
  },
});

// Quando token Supabase é renovado (sessão de horas → JWT expira a cada hora),
// invalida tudo pra refetch com o novo token. Antes, queries em background
// podiam falhar com 401 e ficar com data null = "as coisas somem".
supabase.auth.onAuthStateChange((event) => {
  if (event === "TOKEN_REFRESHED") {
    queryClient.invalidateQueries();
  }
  if (event === "SIGNED_OUT") {
    queryClient.clear();
  }
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {supabaseConfigured ? (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
          <Toaster position="top-right" richColors />
        </BrowserRouter>
      </QueryClientProvider>
    ) : (
      <ConfigError />
    )}
  </StrictMode>
);
