import * as React from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
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
  Plus,
  Trash2,
  LogOut,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { useSheetsData } from "@/hooks/use-sheets-data";
// Removed local zustand store import to use Supabase instead
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
] as const;

function ConnectionBadge() {
  const { isError, isFetching, dataUpdatedAt, data, refetch } = useSheetsData();
  const hasAnyError = isError || (data?.every((d) => d.error) ?? false);
  const time = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString("pt-BR") : "--:--:--";
  return (
    <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            hasAnyError ? "bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "bg-success animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]",
          )}
        />
        <span className="text-muted-foreground/60">
          {hasAnyError ? "Erro de conexão" : "Conectado"}
        </span>
      </div>
      <span className="text-muted-foreground/40 hidden sm:inline">Atualizado às {time}</span>
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
  const [newAbaName, setNewAbaName] = React.useState("");
  const { data, addAba, removeAba } = useSheetsData();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Sessão encerrada.");
    navigate({ to: "/login" });
  };

  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const handleAddAba = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAbaName.trim()) {
      addAba(newAbaName.trim().toUpperCase());
      setNewAbaName("");
    }
  };

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
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-2 rounded-lg shadow-lg shadow-purple-500/20">
              <LayoutDashboard className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-lg font-black text-foreground uppercase tracking-tighter leading-none italic bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">NewStar</div>
              <div className="text-[9px] uppercase tracking-[0.2em] text-sidebar-foreground/30 font-bold">
                DASHBOARD
              </div>
            </div>
          </div>
          <button
            className="lg:hidden p-2 -mr-2 cursor-pointer text-sidebar-foreground/60 hover:text-foreground"
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="p-4 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4 px-3">
              <div className="text-[9px] font-black text-sidebar-foreground/20 uppercase tracking-[0.3em]">
                MESES
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <button className="p-1 rounded-md hover:bg-sidebar-accent text-sidebar-foreground/40 hover:text-primary transition-colors cursor-pointer">
                    <Plus className="h-3 w-3" />
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar novo mês (aba)</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddAba} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nome da aba na planilha</label>
                      <Input
                        placeholder="Ex: JUNHO"
                        value={newAbaName}
                        onChange={(e) => setNewAbaName(e.target.value)}
                        autoFocus
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Certifique-se de que o nome seja exatamente igual ao da aba na planilha.
                      </p>
                    </div>
                    <div className="flex justify-end">
                      <DialogTrigger asChild>
                        <Button type="submit" disabled={!newAbaName.trim()}>
                          Adicionar
                        </Button>
                      </DialogTrigger>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <div className="space-y-1">
              {data?.map((q) => (
                <div key={q.quinzena} className="group flex items-center gap-1">
                  <Link
                    to="/"
                    search={{ quinzena: q.quinzena }}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
                      pathname === "/" &&
                        (new URLSearchParams(
                          typeof window !== "undefined" ? window.location.search : "",
                        ).get("quinzena") === q.quinzena)
                        ? "bg-sidebar-accent text-primary font-semibold shadow-sm"
                        : "text-sidebar-foreground/60 hover:text-foreground hover:bg-sidebar-accent/50",
                    )}
                  >
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span>{q.quinzena}</span>
                  </Link>

                  <Dialog>
                    <DialogTrigger asChild>
                      <button
                        className="opacity-0 group-hover:opacity-100 p-2 text-sidebar-foreground/40 hover:text-destructive transition-all cursor-pointer"
                        title="Excluir aba"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Confirmar exclusão</DialogTitle>
                      </DialogHeader>
                      <div className="py-4">
                        <p className="text-sm text-muted-foreground">
                          Deseja realmente excluir a aba "{q.quinzena}"? Esta ação não pode ser
                          desfeita.
                        </p>
                      </div>
                      <DialogFooter className="gap-2 sm:gap-0">
                        <DialogTrigger asChild>
                          <Button variant="outline">Cancelar</Button>
                        </DialogTrigger>
                        <DialogTrigger asChild>
                          <Button
                            variant="destructive"
                            onClick={() => removeAba(q.quinzena)}
                          >
                            Excluir
                          </Button>
                        </DialogTrigger>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              ))}
            </div>
          </div>
        </nav>

        <div className="absolute bottom-4 left-0 w-full px-4 space-y-3">
          <div className="flex items-center gap-2 text-[9px] text-sidebar-foreground/30 font-bold bg-black/40 py-2.5 px-4 rounded-full border border-white/5 uppercase tracking-wider">
            <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
            Sincronizando a cada 30s
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all duration-200 cursor-pointer"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Sair</span>
          </button>
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