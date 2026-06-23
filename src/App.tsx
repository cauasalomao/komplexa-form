import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";

// GTM/dataLayer types — declarado globalmente pra TS não reclamar
declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

/**
 * SPA pageview tracker pro GTM:
 * Empurra um evento "pageview" no dataLayer a cada mudança de rota.
 */
function GTMRouteTracker() {
  const location = useLocation();
  useEffect(() => {
    if (typeof window === "undefined" || !window.dataLayer) return;
    window.dataLayer.push({
      event: "pageview",
      page_path: location.pathname + location.search,
      page_title: document.title,
    });
  }, [location.pathname, location.search]);
  return null;
}

import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { ErrorBoundary } from "@/components/layout/ErrorBoundary";
import Login from "@/pages/Login";

// Páginas autenticadas (admin builder) — lazy load
const AdminForms = lazy(() => import("@/pages/admin/AdminForms"));
const AdminFormEdit = lazy(() => import("@/pages/admin/AdminFormEdit"));
const AdminFormStats = lazy(() => import("@/pages/admin/AdminFormStats"));
const AdminFormSubmissions = lazy(() => import("@/pages/admin/AdminFormSubmissions"));

// Pública — o form que o lead responde
const PublicForm = lazy(() => import("@/pages/PublicForm"));

function PageFallback() {
  return (
    <div className="min-h-[400px] p-6 space-y-4 animate-pulse">
      <div className="h-7 w-48 bg-kbdr/60 rounded" />
      <div className="h-4 w-80 bg-kbdr/40 rounded" />
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="h-24 bg-kbdr/30 rounded-xl" />
        <div className="h-24 bg-kbdr/30 rounded-xl" />
      </div>
      <div className="flex justify-center pt-2">
        <Loader2 className="h-4 w-4 animate-spin text-kblue/60" />
      </div>
    </div>
  );
}

/** Resetar ErrorBoundary ao trocar de rota. */
function RouteScopedErrorBoundary({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return <ErrorBoundary key={location.pathname}>{children}</ErrorBoundary>;
}

export default function App() {
  return (
    <AuthProvider>
      <GTMRouteTracker />
      <RouteScopedErrorBoundary>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            {/* Form público que o lead responde */}
            <Route path="/f/:slug" element={<PublicForm />} />
            {/* Admin builder — protegido por login */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/admin/forms" replace />} />
              <Route path="/admin/forms" element={<AdminForms />} />
              <Route path="/admin/forms/:id/edit" element={<AdminFormEdit />} />
              <Route path="/admin/forms/:id/stats" element={<AdminFormStats />} />
              <Route path="/admin/forms/:id/submissions" element={<AdminFormSubmissions />} />
            </Route>
            <Route path="*" element={<Navigate to="/admin/forms" replace />} />
          </Routes>
        </Suspense>
      </RouteScopedErrorBoundary>
    </AuthProvider>
  );
}
