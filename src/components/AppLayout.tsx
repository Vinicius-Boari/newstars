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
  { to: "/comissoes", label: "Comissões", icon: ListChecks },
  { to: "/quinzenas", label: "Por Quinzena", icon: Calendar },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
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
          <div>
            <div className="text-xs uppercase tracking-widest text-sidebar-foreground/60">
              Comissões
            </div>
            <div className="text-lg font-semibold">2026</div>
          </div>
          <button
            className="lg:hidden p-2 -mr-2 cursor-pointer"
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="p-3 space-y-1">
          {NAV.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
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