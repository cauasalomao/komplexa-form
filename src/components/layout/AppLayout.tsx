import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { ListChecks, LogOut, Menu, X } from "lucide-react";
import { KLogo } from "@/components/k/KLogo";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/admin/forms", label: "Forms", icon: ListChecks },
];

export function AppLayout() {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Fecha drawer ao trocar de rota (mobile)
  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  // Bloqueia scroll do body quando drawer aberto
  useEffect(() => {
    if (drawerOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const displayName = profile?.name || user?.email?.split("@")[0] || "—";

  return (
    <div className="min-h-screen flex bg-kpage">
      {/* SIDEBAR — fixa em desktop, drawer em mobile */}
      <aside
        className={cn(
          "bg-navy text-white flex flex-col z-50",
          "fixed inset-y-0 left-0 w-[280px] transform transition-transform duration-200 ease-out",
          drawerOpen ? "translate-x-0" : "-translate-x-full",
          "lg:relative lg:translate-x-0 lg:w-[240px]",
          "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
        )}
      >
        <div className="px-5 py-6 border-b border-white/10 flex items-center justify-between">
          <KLogo variant="white" />
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="lg:hidden h-8 w-8 inline-flex items-center justify-center rounded-md text-white/70 hover:text-white hover:bg-white/10"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-3 rounded-[10px] text-[14px] lg:text-[13px] font-semibold transition-colors",
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-white/70 hover:text-white hover:bg-white/5"
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10 flex items-center gap-3">
          <div className="flex-1 min-w-0 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-k-grad flex items-center justify-center text-white font-bold text-[13px] shrink-0">
              {displayName[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold truncate">{displayName}</div>
              <div className="text-[11px] text-white/60 truncate">{user?.email ?? "—"}</div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="h-9 w-9 inline-flex items-center justify-center rounded-md text-white/60 hover:text-white hover:bg-white/10"
            title="Sair"
            aria-label="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* Backdrop do drawer (mobile only) */}
      {drawerOpen && (
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          aria-label="Fechar menu"
        />
      )}

      {/* CONTEÚDO PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0">
        <header
          className={cn(
            "h-14 bg-white border-b border-kbdr px-4 lg:px-6 flex items-center justify-between gap-3 sticky top-0 z-30",
            "pt-[env(safe-area-inset-top)]"
          )}
          style={{ height: "calc(3.5rem + env(safe-area-inset-top))" }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden h-9 w-9 inline-flex items-center justify-center rounded-md text-navy hover:bg-kbg"
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="lg:hidden">
              <KLogo variant="navy" size={22} />
            </div>
            <div className="hidden lg:block text-[13px] text-kgray">Komplexa Forms</div>
          </div>
        </header>
        <main
          className={cn(
            "flex-1 p-4 lg:p-6 overflow-auto",
            "pb-[max(1rem,env(safe-area-inset-bottom))]"
          )}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
