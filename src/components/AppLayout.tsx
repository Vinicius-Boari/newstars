import * as React from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Calendar, Menu, X, LogOut, Settings, Plus, Trash2, RefreshCw
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { QUINZENAS, COMMISSIONS, fmtMoney } from "@/data/commissions";
import { useSheetsData } from "@/hooks/use-sheets-data";
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

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [newAbaName, setNewAbaName] = React.useState("");
  const navigate = useNavigate();
  const searchStr = useRouterState({ select: (s) => s.location.searchStr });

  const { refetch, isFetching, addAba, removeAba } = useSheetsData();

  const currentQ = React.useMemo(() => {
    const params = new URLSearchParams(searchStr || "");
    return params.get("quinzena") || "ALL";
  }, [searchStr]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Sessão encerrada.");
    navigate({ to: "/login" });
  };

  const totalGeral = React.useMemo(
    () => COMMISSIONS.reduce((acc, c) => acc + c.receber, 0),
    [],
  );

  const handleAddAba = async () => {
    if (!newAbaName) return;
    try {
      await addAba(newAbaName);
      setNewAbaName("");
    } catch (error) {
      console.error(error);
    }
  };

  const handleRemoveAba = async (name: string) => {
    if (confirm(`Remover aba "${name}"?`)) {
      try {
        await removeAba(name);
      } catch (error) {
        console.error(error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 w-64 bg-sidebar text-sidebar-foreground transform transition-transform lg:translate-x-0 flex flex-col",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="h-16 flex items-center justify-between px-5 border-b border-sidebar-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-2 rounded-lg shadow-lg shadow-purple-500/20">
              <LayoutDashboard className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-lg font-black uppercase tracking-tighter leading-none italic bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                NewStars
              </div>
              <div className="text-[9px] uppercase tracking-[0.2em] text-sidebar-foreground/40 font-bold">
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

        <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
          <Link
            to="/resumo-geral"
            search={{ quinzena: "ALL" }}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
              currentQ === "ALL"
                ? "bg-sidebar-accent text-primary font-semibold"
                : "text-sidebar-foreground/60 hover:text-foreground hover:bg-sidebar-accent/50",
            )}
          >
            <span className="flex items-center gap-3">
              <LayoutDashboard className="h-4 w-4" />
              Todas quinzenas
            </span>
            <span className="text-[10px] tabular-nums font-mono opacity-60">
              {fmtMoney(totalGeral).replace("R$", "")}
            </span>
          </Link>

          <div className="pt-4 pb-2 px-3 text-[10px] font-bold text-sidebar-foreground/30 uppercase tracking-widest">
            Quinzenas
          </div>

          {QUINZENAS.map((q) => {
            const total = COMMISSIONS.filter(c => c.quinzena === q).reduce((s, c) => s + c.receber, 0);
            const active = currentQ === q;
            return (
              <Link
                key={q}
                to="/resumo-geral"
                search={{ quinzena: q }}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                  active
                    ? "bg-sidebar-accent text-primary font-semibold"
                    : "text-sidebar-foreground/60 hover:text-foreground hover:bg-sidebar-accent/50",
                )}
              >
                <span className="flex items-center gap-3">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  {q}
                </span>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-[10px] tabular-nums font-mono",
                    total === 0 ? "opacity-25" : "opacity-60",
                  )}>
                    {total > 0 ? fmtMoney(total).replace("R$", "").trim() : "—"}
                  </span>
                  {active && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleRemoveAba(q);
                      }}
                      className="p-1 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 space-y-3 border-t border-sidebar-border shrink-0">
          <Dialog>
            <DialogTrigger asChild>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/50 hover:text-foreground hover:bg-sidebar-accent/50 transition-all cursor-pointer">
                <Plus className="h-4 w-4 shrink-0" />
                <span>Nova Aba</span>
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Nova Quinzena</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome da Aba (ex: 15 SET)</label>
                  <Input 
                    placeholder="Nome da aba..." 
                    value={newAbaName}
                    onChange={(e) => setNewAbaName(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogTrigger asChild>
                  <Button variant="outline">Cancelar</Button>
                </DialogTrigger>
                <DialogTrigger asChild>
                  <Button onClick={handleAddAba}>Adicionar</Button>
                </DialogTrigger>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/50 hover:text-foreground hover:bg-sidebar-accent/50 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4 shrink-0", isFetching && "animate-spin")} />
            <span>Sincronizar</span>
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer"
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
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span>Sistema ativo</span>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
