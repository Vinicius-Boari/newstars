import * as React from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ListChecks,
  Calendar,
  Users,
  BarChart3,
  Settings,
  RefreshCw,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSheetsData } from "@/hooks/use-sheets-data";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
] as const;

function ConnectionBadge() {
  const { isError, isFetching, dataUpdatedAt, data, refetch } = useSheetsData();
  const hasAnyError = isError || (data?.every((d) => d.error) ?? false);
  const time = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString("pt-BR") : "--:--:--";
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "h-2.5 w-2.5 rounded-full",
            hasAnyError ? "bg-destructive" : "bg-success animate-pulse",
          )}
        />
        <span className="text-muted-foreground">
          {hasAnyError ? "Erro de conexão" : "Conectado"}
        </span>
      </div>
      <span className="text-muted-foreground hidden sm:inline">Atualizado às {time}</span>
      <button
        onClick={() => refetch()}
        className="inline-flex items-center justify-center rounded-md border border-border bg-background h-8 w-8 hover:bg-accent transition-colors cursor-pointer disabled:opacity-50"
        disabled={isFetching}
        aria-label="Atualizar"
      >
        <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
      </button>
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 w-64 bg-sidebar text-sidebar-foreground transform transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="h-16 flex items-center justify-between px-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="bg-[#00e5ff]/20 p-2 rounded-lg">
              <LayoutDashboard className="h-5 w-5 text-[#00e5ff]" />
            </div>
            <div>
              <div className="text-lg font-bold text-white">GolField</div>
              <div className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40 font-medium">
                DASHBOARD
              </div>
            </div>
          </div>
          <button
            className="lg:hidden p-2 -mr-2 cursor-pointer text-sidebar-foreground/60 hover:text-white"
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="p-4 space-y-6">
          <div>
            <div className="text-[10px] font-bold text-sidebar-foreground/30 uppercase tracking-widest mb-4 px-3">
              PLANILHA
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-sidebar-foreground/80">
                PLANILHA GOLFIELD
              </div>
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold text-sidebar-foreground/30 uppercase tracking-widest mb-4 px-3">
              ABAS
            </div>
            <div className="space-y-1">
              {NAV.map((item) => {
                const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
                      active
                        ? "bg-sidebar-accent text-[#00e5ff] font-semibold shadow-lg shadow-black/20"
                        : "text-sidebar-foreground/60 hover:text-white hover:bg-sidebar-accent/50",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              <Link
                to="/quinzenas"
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
                  pathname === "/quinzenas"
                    ? "bg-sidebar-accent text-[#00e5ff] font-semibold shadow-lg shadow-black/20"
                    : "text-sidebar-foreground/60 hover:text-white hover:bg-sidebar-accent/50",
                )}
              >
                <Calendar className="h-4 w-4 shrink-0" />
                <span>ABRIL</span>
              </Link>
              <Link
                to="/quinzenas"
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
                  "text-sidebar-foreground/60 hover:text-white hover:bg-sidebar-accent/50",
                )}
              >
                <Calendar className="h-4 w-4 shrink-0" />
                <span>PEDIDOS DE MAIO</span>
              </Link>
            </div>
          </div>
        </nav>
        <div className="absolute bottom-4 left-0 w-full px-4">
          <div className="flex items-center gap-2 text-[10px] text-sidebar-foreground/40 font-medium bg-black/20 py-2 px-3 rounded-full border border-white/5">
            <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            Sincronizando a cada 30s
          </div>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 border-b border-border bg-card sticky top-0 z-20 flex items-center justify-between px-4 lg:px-6">
          <button
            className="lg:hidden p-2 -ml-2 cursor-pointer"
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden lg:block">
            <h1 className="text-base font-semibold text-foreground">
              Controle de Comissões
            </h1>
          </div>
          <ConnectionBadge />
        </header>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}