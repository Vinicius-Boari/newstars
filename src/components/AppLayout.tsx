import * as React from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Calendar, Menu, X, LogOut, RefreshCw, CheckCircle2, AlertCircle, Settings as SettingsIcon
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSheetsData } from "@/hooks/use-sheets-data";
import { fmtMoney } from "@/lib/sheets";
import { useSettings } from "@/lib/settings-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const navigate = useNavigate();
  const searchStr = useRouterState({ select: (s) => s.location.searchStr });

  const { data: abas = [], refetch, isFetching, lastUpdated, syncStatus } = useSheetsData();
  const { sheetId, setSheetId, refreshMs, setRefreshMs, isSettingsOpen, setIsSettingsOpen } = useSettings();

  const [tempSheetId, setTempSheetId] = React.useState(sheetId);
  const [tempRefresh, setTempRefresh] = React.useState(refreshMs / 1000);

  const handleSaveSettings = () => {
    setSheetId(tempSheetId);
    setRefreshMs(tempRefresh * 1000);
    setIsSettingsOpen(false);
    toast.success("Configurações salvas!");
    refetch();
  };

  React.useEffect(() => {
    setTempSheetId(sheetId);
    setTempRefresh(refreshMs / 1000);
  }, [sheetId, refreshMs, isSettingsOpen]);

  const currentQ = React.useMemo(() => {
    const params = new URLSearchParams(searchStr || "");
    return params.get("quinzena") || "ALL";
  }, [searchStr]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Sessão encerrada.");
    navigate({ to: "/login" });
  };

  const allRegistros = React.useMemo(() => 
    abas.flatMap(a => a.registros), 
  [abas]);

  const totalGeral = React.useMemo(() => 
    allRegistros.reduce((acc, c) => acc + c.receber, 0),
  [allRegistros]);

  return (
    <div className="min-h-screen bg-background flex relative">
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

          {abas.map((aba) => {
            const q = aba.quinzena;
            const total = aba.total;
            const active = currentQ === q;
            return (
              <Link
                key={q}
                to="/resumo-geral"
                search={{ quinzena: q }}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200 group",
                  active
                    ? "bg-sidebar-accent text-primary font-semibold"
                    : "text-sidebar-foreground/60 hover:text-foreground hover:bg-sidebar-accent/50",
                )}
              >
                <span className="flex items-center gap-3">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  {q}
                </span>
                <span className={cn(
                  "text-[10px] tabular-nums font-mono",
                  total === 0 ? "opacity-25" : "opacity-60",
                )}>
                  {total > 0 ? fmtMoney(total).replace("R$", "").trim() : "—"}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 space-y-3 border-t border-sidebar-border shrink-0">
          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/50 hover:text-foreground hover:bg-sidebar-accent/50 transition-all cursor-pointer">
                <SettingsIcon className="h-4 w-4 shrink-0" />
                <span>Configurações</span>
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Gerenciar Links e Conectores</DialogTitle>
                <DialogDescription>
                  Configure a planilha sincronizada via Lovable Connector.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="sheetId">ID da Planilha (via Link)</Label>
                  <Input
                    id="sheetId"
                    value={tempSheetId}
                    onChange={(e) => setTempSheetId(e.target.value)}
                    placeholder="Ex: 186zpKURns1dm1ixv44RqYDbMfvVd3b4b"
                  />
                  <p className="text-[10px] text-muted-foreground">Cole o ID que aparece na URL da sua planilha Google.</p>
                </div>
                <div className="pt-2">
                  <div className="bg-muted/50 p-3 rounded-lg border border-border">
                    <h4 className="text-xs font-bold mb-1">Status do Connector</h4>
                    <div className="flex items-center gap-2 text-[10px]">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <span className="text-muted-foreground">Google Sheets Connector Ativo</span>
                    </div>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="refresh">Intervalo de Sincronização (segundos)</Label>
                  <Input
                    id="refresh"
                    type="number"
                    value={tempRefresh}
                    onChange={(e) => setTempRefresh(Number(e.target.value))}
                    min={10}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleSaveSettings} className="w-full">Salvar Configurações</Button>
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

          {/* Botão de sair removido conforme solicitado para manter o login persistente */}

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

      {/* Sync Indicator Indicator - Bottom Right */}
      <div className="fixed bottom-4 right-4 z-50 pointer-events-none">
        <div className={cn(
          "px-3 py-1.5 rounded-full shadow-lg border text-[11px] font-medium flex items-center gap-2 transition-all duration-300 transform",
          syncStatus === "syncing" ? "bg-primary/10 border-primary/20 text-primary translate-y-0" :
          syncStatus === "success" ? "bg-green-500/10 border-green-500/20 text-green-600 translate-y-0" :
          syncStatus === "error" ? "bg-destructive/10 border-destructive/20 text-destructive translate-y-0" :
          "translate-y-12 opacity-0"
        )}>
          {syncStatus === "syncing" && (
            <>
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span>Sincronizando...</span>
            </>
          )}
          {syncStatus === "success" && (
            <>
              <CheckCircle2 className="h-3 w-3" />
              <span>Atualizado às {lastUpdated}</span>
            </>
          )}
          {syncStatus === "error" && (
            <>
              <AlertCircle className="h-3 w-3" />
              <span>Falha na sincronização — tentando em 30s</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
