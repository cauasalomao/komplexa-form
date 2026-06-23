import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import App from "./App";
import { supabase } from "./integrations/supabase/client";
import "./index.css";

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
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
