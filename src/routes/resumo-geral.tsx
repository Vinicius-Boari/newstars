import { createFileRoute, redirect } from "@tanstack/react-router";
import * as React from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LabelList,
} from "recharts";
import { Calendar, Wallet, Users, TrendingUp, Search, Filter, X, Loader2, Edit2, Check, X as CloseIcon, ChevronsUpDown, Plus, RefreshCcw, UserCircle, Trash2, Eye, ArrowRightLeft, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useSheetsData } from "@/hooks/use-sheets-data";
import { fmtMoney, extractCurrentParc, type Registro, updateSheetValue, COL_INDICES, updateSpreadsheetCell, DEFAULT_SHEET_ID, transferPedido, appendPedido, deletePedido } from "@/lib/sheets";
import { useSettings } from "@/lib/settings-context";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";

export const Route = createFileRoute("/resumo-geral")({
  beforeLoad: async () => {
    // Skip session check during SSR
    if (typeof window === "undefined") return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/login" });
  },
  validateSearch: (search: Record<string, unknown>) => ({
    quinzena: (search.quinzena as string | undefined) || "ALL",
  }),
  component: Dashboard,
});

const CHART_COLORS = [
  "#a855f7", "#ec4899", "#3b82f6", "#22c55e", "#f59e0b",
  "#ef4444", "#06b6d4", "#84cc16", "#f97316", "#8b5cf6",
];

const PCT_COLORS: Record<number, string> = {
  5: "#3b82f6",
  10: "#a855f7",
  15: "#ec4899",
};

function StatCard({ label, value, hint, icon: Icon, accent }: {
  label: string; value: string; hint?: string;
  icon: React.ComponentType<{ className?: string }>; accent: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-3">{label}</div>
          <div className="text-2xl font-bold text-foreground tabular-nums tracking-tight">{value}</div>
          {hint && <div className="mt-1.5 text-[11px] font-medium text-muted-foreground/70">{hint}</div>}
        </div>
        <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center shrink-0", accent)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function ComboboxFilter({ 
  value, 
  onSelect, 
  options, 
  placeholder, 
  emptyMessage = "Nenhum resultado encontrado." 
}: { 
  value: string; 
  onSelect: (val: string) => void; 
  options: { label: string; value: string }[]; 
  placeholder: string;
  emptyMessage?: string;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);

  const filteredOptions = React.useMemo(() => {
    return options.filter(opt => 
      opt.label.toLowerCase().includes(search.toLowerCase())
    );
  }, [options, search]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-9 w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-xs font-medium ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-w-[140px]"
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 min-w-[180px]">
          <div className="flex items-center border-b border-border px-2 pb-1 pt-1">
            <Search className="mr-2 h-3 w-3 shrink-0 opacity-50" />
            <input
              className="flex h-7 w-full rounded-md bg-transparent py-2 text-xs outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Procurar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="mt-1">
            {filteredOptions.length === 0 ? (
              <div className="py-2 px-2 text-xs text-muted-foreground text-center">{emptyMessage}</div>
            ) : (
              filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  className={cn(
                    "relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-xs outline-none hover:bg-accent hover:text-accent-foreground transition-colors",
                    value === opt.value && "bg-accent text-accent-foreground"
                  )}
                  onClick={() => {
                    onSelect(opt.value);
                    setIsOpen(false);
                    setSearch("");
                  }}
                >
                  <span className="truncate">{opt.label}</span>
                  {value === opt.value && <Check className="ml-auto h-3 w-3" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ParcCell({ qtd }: { qtd: string }) {
  const { atual, partes } = extractCurrentParc(qtd);
  if (!atual) {
    return <span className="font-mono text-xs text-muted-foreground">{qtd}</span>;
  }
  return (
    <span className="font-mono text-xs text-muted-foreground">
      {partes.map((p, i) => {
        const clean = p.replace(/[()]/g, "");
        const isAtual = p.includes("(") && p.includes(")");
        return (
          <React.Fragment key={i}>
            {i > 0 && <span className="opacity-40">.</span>}
            <span className={cn(
              isAtual && "bg-purple-500/15 text-purple-600 dark:text-purple-400 font-bold px-1.5 py-0.5 rounded ring-1 ring-purple-500/30",
            )}>
              {clean}
            </span>
          </React.Fragment>
        );
      })}
    </span>
  );
}

function EditableCell({ value, onSave, isLoading, type = "text" }: { 
  value: string | number; 
  onSave: (val: string | number) => Promise<void>;
  isLoading: boolean;
  type?: "text" | "number";
}) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [tempValue, setTempValue] = React.useState(value);

  const handleSave = async () => {
    if (tempValue === value) {
      setIsEditing(false);
      return;
    }
    try {
      await onSave(tempValue);
      setIsEditing(false);
    } catch (err) {
      setTempValue(value);
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 min-w-[80px]">
        <Input
          type={type}
          value={tempValue}
          onChange={(e) => setTempValue(type === "number" ? Number(e.target.value) : e.target.value)}
          className="h-7 text-xs px-1 py-0"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") setIsEditing(false);
          }}
        />
        <button onClick={handleSave} disabled={isLoading} className="text-green-600 hover:text-green-700">
          {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
        </button>
        <button onClick={() => setIsEditing(false)} className="text-muted-foreground">
          <CloseIcon className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 group/cell cursor-pointer" onClick={() => setIsEditing(true)}>
      <span>{type === "number" && typeof value === "number" ? fmtMoney(value) : value}</span>
      <Edit2 className="h-3 w-3 opacity-0 group-hover/cell:opacity-40 transition-opacity" />
    </div>
  );
}

function PedidoModal({ 
  quinzena, 
  onSuccess, 
  sheetId, 
  registro, 
  trigger 
}: { 
  quinzena: string; 
  onSuccess: () => Promise<void>; 
  sheetId: string;
  registro?: Registro;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [formData, setFormData] = React.useState({
    data: registro?.data || new Date().toLocaleDateString("pt-BR"),
    pedido: registro?.pedido || "",
    nome: registro?.nome || "",
    local: registro?.local || "",
    total: registro?.total?.toString() || "",
    pct: registro?.pct?.toString() || "10",
    vlParc: registro?.vlParc?.toString() || "",
    qtdParc: registro?.qtdParc || "",
    venc: registro?.venc || "",
    receber: registro?.receber?.toString() || "",
    pago: registro?.pago || "NÃO"
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !quinzena || quinzena === "ALL") {
      toast.error("Selecione uma quinzena e preencha o nome do cliente.");
      return;
    }
    
    setLoading(true);
    try {
      const isEditing = !!registro;
      const rowIndex = registro?.rowIndex;

      const updates = [
        { col: COL_INDICES.DATA, val: formData.data },
        { col: COL_INDICES.PEDIDO, val: formData.pedido },
        { col: COL_INDICES.NOME, val: formData.nome },
        { col: COL_INDICES.LOCAL, val: formData.local },
        { col: COL_INDICES.TOTAL, val: Number(formData.total) || 0 },
        { col: COL_INDICES.PCT, val: Number(formData.pct) || 0 },
        { col: COL_INDICES.VL_PARC, val: Number(formData.vlParc) || 0 },
        { col: COL_INDICES.QTD_PARC, val: formData.qtdParc },
        { col: COL_INDICES.VENC, val: formData.venc },
        { col: COL_INDICES.RECEBER, val: Number(formData.receber) || 0 },
        { col: COL_INDICES.PAGO, val: formData.pago },
      ];

      if (isEditing && rowIndex) {
        toast.info("Salvando alterações...");
        for (const update of updates) {
          const colLetter = String.fromCharCode(65 + update.col);
          const range = `${quinzena}!${colLetter}${rowIndex}`;
          await updateSpreadsheetCell({ data: { sheetId, range, value: update.val } });
        }
        toast.success("Pedido atualizado com sucesso!");
      } else {
        toast.info("Adicionando novo pedido...");
        const registroData = [
          formData.data,
          formData.pedido,
          formData.nome,
          formData.local,
          Number(formData.total) || 0,
          Number(formData.pct) || 0,
          Number(formData.vlParc) || 0,
          formData.qtdParc,
          formData.venc,
          Number(formData.receber) || 0,
          formData.pago,
        ];

        await appendPedido({
          data: {
            sheetId,
            quinzena,
            values: registroData
          }
        });
        toast.success("Pedido adicionado com sucesso!");
      }
      
      setOpen(false);
      await onSuccess();
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);

  const handleDelete = async () => {
    if (!registro || !registro.rowIndex) return;
    
    setLoading(true);
    try {
      toast.info("Excluindo pedido...");
      await deletePedido({
        data: {
          sheetId,
          quinzena,
          rowIndex: registro.rowIndex
        }
      });
      toast.success("Pedido excluído com sucesso!");
      setDeleteConfirmOpen(false);
      setOpen(false);
      await onSuccess();
    } catch (err: any) {
      toast.error("Erro ao excluir: " + err.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{registro ? "Editar Pedido" : "Adicionar Novo Pedido"} - {quinzena}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data">Data</Label>
              <Input id="data" value={formData.data} onChange={e => setFormData({...formData, data: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pedido">Pedido</Label>
              <Input id="pedido" value={formData.pedido} onChange={e => setFormData({...formData, pedido: e.target.value})} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nome">Nome do Cliente</Label>
            <Input id="nome" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="local">Local/Cidade</Label>
              <Input id="local" value={formData.local} onChange={e => setFormData({...formData, local: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="total">Total</Label>
              <Input id="total" type="number" step="any" value={formData.total} onChange={e => setFormData({...formData, total: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pct">Comissão %</Label>
              <Input id="pct" type="number" step="any" value={formData.pct} onChange={e => setFormData({...formData, pct: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vlParc">Valor Parcela</Label>
              <Input id="vlParc" type="number" step="any" value={formData.vlParc} onChange={e => setFormData({...formData, vlParc: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="qtdParc">Qtd Parcelas</Label>
              <Input id="qtdParc" placeholder="Ex: 1/3" value={formData.qtdParc} onChange={e => setFormData({...formData, qtdParc: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="venc">Vencimento</Label>
              <Input id="venc" value={formData.venc} onChange={e => setFormData({...formData, venc: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="receber">Valor a Receber</Label>
              <Input id="receber" type="number" step="any" value={formData.receber} onChange={e => setFormData({...formData, receber: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pago">Status de Pagamento</Label>
              <Input 
                id="pago"
                placeholder="Ex: SIM, NÃO, AGUARDANDO..."
                value={formData.pago} 
                onChange={e => setFormData({...formData, pago: e.target.value.toUpperCase()})}
                className="w-full h-10 uppercase"
              />
            </div>
          </div>
          <div className="flex gap-2">
            {registro && (
              <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <DialogTrigger asChild>
                  <Button 
                    type="button" 
                    variant="destructive" 
                    className="flex-1" 
                    disabled={loading}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Excluir
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[400px] bg-zinc-950 border-zinc-800 text-zinc-100">
                  <DialogHeader className="flex flex-col items-center gap-3 pt-4">
                    <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
                      <AlertCircle className="h-6 w-6 text-red-500" />
                    </div>
                    <DialogTitle className="text-xl font-bold uppercase tracking-tight text-center">Confirmar Exclusão</DialogTitle>
                    <p className="text-sm text-zinc-400 text-center px-4">
                      Tem certeza que deseja excluir o pedido de <span className="text-zinc-100 font-bold">{registro.nome}</span>? Esta ação não pode ser desfeita.
                    </p>
                  </DialogHeader>
                  <DialogFooter className="flex flex-row gap-3 sm:justify-center pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="flex-1 bg-transparent border-zinc-800 text-zinc-400 hover:text-zinc-100 h-11"
                      onClick={() => setDeleteConfirmOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="button" 
                      variant="destructive" 
                      className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold h-11"
                      onClick={handleDelete}
                      disabled={loading}
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            <Button type="submit" className="flex-[2] bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold h-11 rounded-xl" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}


function TransferModal({ 
  registro, 
  quinzenas, 
  sheetId, 
  onSuccess 
}: { 
  registro: Registro; 
  quinzenas: string[]; 
  sheetId: string; 
  onSuccess: () => Promise<void> 
}) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const [transferTarget, setTransferTarget] = React.useState<string | null>(null);

  const handleTransfer = async () => {
    if (!transferTarget) return;

    setLoading(true);
    try {
      const registroData = [
        registro.data,
        registro.pedido,
        registro.nome,
        registro.local,
        registro.total,
        registro.pct,
        registro.vlParc,
        registro.qtdParc,
        registro.venc,
        registro.receber,
        registro.pago
      ];

      await transferPedido({
        data: {
          sheetId,
          fromQuinzena: registro.quinzena,
          toQuinzena: transferTarget,
          rowIndex: registro.rowIndex,
          registroData
        }
      });

      toast.success("Pedido transferido com sucesso!");
      setTransferTarget(null);
      setOpen(false);
      await onSuccess();
    } catch (err: any) {
      toast.error("Erro ao transferir: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button className="text-muted-foreground hover:text-blue-500 transition-colors" title="Transferir Quinzena">
            <ArrowRightLeft className="h-3.5 w-3.5" />
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[400px] bg-zinc-950 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold uppercase tracking-tight">Transferir Quinzena</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-xs text-zinc-400 uppercase font-bold tracking-widest">Selecione o destino:</p>
            <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-800">
              {quinzenas.filter(q => q !== registro.quinzena).map(q => (
                <button
                  key={q}
                  disabled={loading}
                  onClick={() => setTransferTarget(q)}
                  className="w-full text-left p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all group flex items-center justify-between"
                >
                  <span className="text-sm font-bold uppercase text-zinc-300 group-hover:text-purple-400 transition-colors">{q}</span>
                  <ArrowRightLeft className="h-4 w-4 text-zinc-600 group-hover:text-purple-500 opacity-0 group-hover:opacity-100 transition-all" />
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!transferTarget} onOpenChange={(isOpen) => !isOpen && setTransferTarget(null)}>
        <DialogContent className="sm:max-w-[400px] bg-zinc-950 border-zinc-800 text-zinc-100">
          <DialogHeader className="flex flex-col items-center gap-3 pt-4">
            <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
              <ArrowRightLeft className="h-6 w-6 text-blue-500" />
            </div>
            <DialogTitle className="text-xl font-bold uppercase tracking-tight text-center">Confirmar Transferência</DialogTitle>
            <p className="text-sm text-zinc-400 text-center px-4">
              Deseja transferir o pedido de <span className="text-zinc-100 font-bold">{registro.nome}</span> para a quinzena <span className="text-blue-400 font-bold">{transferTarget}</span>?
            </p>
          </DialogHeader>
          <DialogFooter className="flex flex-row gap-3 sm:justify-center pt-4">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1 bg-transparent border-zinc-800 text-zinc-400 hover:text-zinc-100 h-11"
              onClick={() => setTransferTarget(null)}
            >
              Cancelar
            </Button>
            <Button 
              type="button" 
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold h-11"
              onClick={handleTransfer}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ContasModal({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [users, setUsers] = React.useState<{ id: string; username: string; role: string; protected: boolean }[]>([]);
  const [newUser, setNewUser] = React.useState({ username: "", role: "viewer" });

  const fetchUsers = async () => {
    const { data } = await supabase.from("admin_users").select("id, username, role, protected");
    if (data) setUsers(data as never);
  };

  React.useEffect(() => {
    if (open) fetchUsers();
  }, [open]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("admin_users").insert([newUser as never]);
    if (error) toast.error("Erro ao adicionar: " + error.message);
    else {
      toast.success("Usuário adicionado!");
      setNewUser({ username: "", role: "viewer" });
      fetchUsers();
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("admin_users").delete().eq("id", id);
    if (error) toast.error("Erro ao excluir");
    else fetchUsers();
  };

  if (!isAdmin) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 h-9">
          <UserCircle className="h-4 w-4" /> Contas
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Gerenciar Contas de Acesso</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <form onSubmit={handleAdd} className="grid grid-cols-5 gap-2 items-end">
            <div className="col-span-2 space-y-2">
              <Label>Usuário</Label>
              <Input value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} placeholder="Nome" required />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Papel</Label>
              <Input value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} placeholder="viewer ou admin" required />
            </div>
            <Button type="submit" size="sm" disabled={loading} className="mb-0.5">
              <Plus className="h-4 w-4" />
            </Button>
          </form>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Usuários Atuais</Label>
            <div className="border border-border rounded-md divide-y divide-border">
              {users.map(user => (
                <div key={user.id} className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
                  <div>
                    <div className="text-sm font-bold">{user.username}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">Papel: {user.role}</div>
                  </div>
                  {!user.protected && (
                    <button onClick={() => handleDelete(user.id)} className="text-destructive hover:scale-110 transition-transform">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Dashboard() {
  const { quinzena: selectedQuinzena } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: abas = [], isLoading, isError, error, refetch, lastUpdated, isFetching, addAba } = useSheetsData();
  const [isAdmin, setIsAdmin] = React.useState<boolean>(false);

  React.useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("admin_users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (data?.role === "admin") setIsAdmin(true);
    });
  }, []);
  const { sheetId } = useSettings();
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;
  
  // Set dark mode for this dashboard
  React.useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => document.documentElement.classList.remove("dark");
  }, []);

  const handleUpdate = async (quinzena: string, rowIndex: number, colIndex: number, value: any) => {
    const cellId = `${quinzena}-${rowIndex}-${colIndex}`;
    setUpdatingId(cellId);
    try {
      // Column letter calculation (0 -> A, 1 -> B, ...)
      const colLetter = String.fromCharCode(65 + colIndex);
      const range = `${quinzena}!${colLetter}${rowIndex}`;
      
      await updateSheetValue(sheetId, range, value);
      toast.success("Planilha atualizada!");
      await refetch();
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao atualizar: " + err.message);
      throw err;
    } finally {
      setUpdatingId(null);
    }
  };

  const [search, setSearch] = React.useState("");
  const [localFilter, setLocalFilter] = React.useState<string>("ALL");
  const [pctFilter, setPctFilter] = React.useState<string>("ALL");
  const [dateFilter, setDateFilter] = React.useState<string>("ALL");
  const [qtdParcFilter, setQtdParcFilter] = React.useState<string>("ALL");
  const [vencFilter, setVencFilter] = React.useState<string>("ALL");
  const [pagoFilter, setPagoFilter] = React.useState<string>("ALL");

  const COMMISSIONS = React.useMemo(() => abas.flatMap(a => a.registros), [abas]);
  const QUINZENAS = React.useMemo(() => abas.map(a => a.quinzena), [abas]);

  const currentMonthRegistros = React.useMemo(() => {
    return selectedQuinzena === "ALL" 
      ? COMMISSIONS 
      : COMMISSIONS.filter(c => c.quinzena === selectedQuinzena);
  }, [COMMISSIONS, selectedQuinzena]);

  const allLocals = React.useMemo(() => {
    const s = new Set(currentMonthRegistros.map(c => c.local).filter(l => l && l !== "-"));
    return [...s].sort();
  }, [currentMonthRegistros]);

  const allPercentages = React.useMemo(() => {
    const s = new Set(currentMonthRegistros.map(c => c.pct).filter(p => p !== undefined && p !== null));
    return [...s].sort((a, b) => a - b);
  }, [currentMonthRegistros]);

  const allDates = React.useMemo(() => {
    const s = new Set(currentMonthRegistros.map(c => c.data).filter(Boolean));
    return [...s].sort();
  }, [currentMonthRegistros]);

  const allQtdParcs = React.useMemo(() => {
    const s = new Set(currentMonthRegistros.map(c => c.qtdParc).filter(Boolean));
    return [...s].sort();
  }, [currentMonthRegistros]);

  const allVencs = React.useMemo(() => {
    const s = new Set(currentMonthRegistros.map(c => c.venc).filter(Boolean));
    return [...s].sort();
  }, [currentMonthRegistros]);

  const filtered = React.useMemo(() => {
    return COMMISSIONS.filter(c => {
      if (selectedQuinzena !== "ALL" && c.quinzena !== selectedQuinzena) return false;
      if (localFilter !== "ALL" && c.local !== localFilter) return false;
      if (pctFilter !== "ALL" && String(c.pct) !== pctFilter) return false;
      if (dateFilter !== "ALL" && c.data !== dateFilter) return false;
      if (qtdParcFilter !== "ALL" && c.qtdParc !== qtdParcFilter) return false;
      if (vencFilter !== "ALL" && c.venc !== vencFilter) return false;
      
      if (pagoFilter !== "ALL") {
        const val = String(c.pago || "").toUpperCase();
        if (pagoFilter === "SIM") {
          if (val !== "SIM") return false;
        } else if (pagoFilter === "NÃO") {
          if (val !== "NÃO" && val !== "NAO") return false;
        } else if (pagoFilter === "OUTROS") {
          if (val === "SIM" || val === "NÃO" || val === "NAO") return false;
        } else {
          if (c.pago !== pagoFilter) return false;
        }
      }
      
      if (search) {
        const q = search.toLowerCase();
        if (!c.nome.toLowerCase().includes(q) && !c.pedido.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [selectedQuinzena, localFilter, pctFilter, search, dateFilter, qtdParcFilter, vencFilter, pagoFilter, COMMISSIONS]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedData = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  // Reset to first page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedQuinzena, localFilter, pctFilter, search, dateFilter, qtdParcFilter, vencFilter, pagoFilter]);

  const allRegistros = COMMISSIONS;


  const stats = React.useMemo(() => {
    const totalReceber = filtered.reduce((s, c) => s + c.receber, 0);
    const totalPago = filtered.reduce((s, c) => {
      const isPago = ["SIM", "sim", "PAGO", "pago"].includes(String(c.pago).trim());
      return isPago ? s + c.receber : s;
    }, 0);
    const maiorComissao = filtered.reduce((m, c) => c.receber > m ? c.receber : m, 0);
    return { totalReceber, totalPago, maiorComissao, qtd: filtered.length };
  }, [filtered]);

  const perQuinzena = React.useMemo(() => {
    return abas.map(a => ({
      name: a.quinzena,
      total: a.total,
    }));
  }, [abas]);

  const perCidade = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const c of filtered) {
      if (!c.local || c.local === "-") continue;
      map.set(c.local, (map.get(c.local) ?? 0) + c.receber);
    }
    return [...map.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filtered]);

  const perPct = React.useMemo(() => {
    const map = new Map<number, number>();
    for (const c of filtered) {
      map.set(c.pct, (map.get(c.pct) ?? 0) + c.receber);
    }
    return [...map.entries()].map(([pct, value]) => ({ name: `${pct}%`, value, pct }));
  }, [filtered]);

  const topClientes = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const c of filtered) {
      map.set(c.nome, (map.get(c.nome) ?? 0) + c.receber);
    }
    return [...map.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filtered]);

  const setQuinzena = (q: string) => navigate({ search: { quinzena: q } });
  const clearFilters = () => { 
    setSearch(""); 
    setLocalFilter("ALL"); 
    setPctFilter("ALL");
    setDateFilter("ALL");
    setQtdParcFilter("ALL");
    setVencFilter("ALL");
    setPagoFilter("ALL");
  };

  if (isLoading && abas.length === 0) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground animate-pulse">Carregando dados da planilha...</p>
      </div>
    );
  }

  if (isError && abas.length === 0) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
          <X className="h-6 w-6 text-destructive" />
        </div>
        <h3 className="text-lg font-bold text-foreground">Falha ao carregar dados</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          {error || "Verifique se a planilha está pública e configurada corretamente."}
        </p>
        <Button 
          variant="outline" 
          onClick={() => refetch()}
          className="mt-4 gap-2"
        >
          <RefreshCcw className={cn("h-4 w-4", isFetching && "animate-spin")} />
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl md:text-2xl font-bold text-foreground tracking-tight uppercase">CONTROLE DE COMISSÕES 2026</h2>
          <div className="flex items-center justify-between">
            <p className="text-xs md:text-sm text-muted-foreground/70">
              Acompanhe suas vendas e comissões.
            </p>
            <div className="flex items-center gap-2 md:hidden">
              <ContasModal isAdmin={isAdmin} />
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => supabase.auth.signOut()}
                className="h-9 w-9 text-muted-foreground"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 p-3 bg-card border border-border rounded-2xl">
          <div className="flex items-center gap-2 text-[10px] md:text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest flex-1">
            {isFetching ? (
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
            ) : (
              <RefreshCcw 
                className={cn("h-3 w-3 cursor-pointer hover:text-primary transition-colors", isFetching && "animate-spin")} 
                onClick={() => refetch()}
              />
            )}
            <span className="truncate">Sincronizado: {lastUpdated || "—"}</span>
          </div>
          <div className="hidden md:flex items-center gap-2 text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest">
            <span>{filtered.length} parcelas</span>
            <span className="mx-1 opacity-30">|</span>
            <ContasModal isAdmin={isAdmin} />
            <span className="mx-1 opacity-30">|</span>
            <button
              onClick={() => supabase.auth.signOut()}
              className="flex items-center gap-1.5 hover:text-primary transition-all cursor-pointer"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quinzena tabs */}
      <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
        <button
          onClick={() => setQuinzena("ALL")}
          className={cn(
            "px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shrink-0",
            selectedQuinzena === "ALL"
              ? "bg-foreground text-background shadow-lg shadow-foreground/10"
              : "bg-card border border-border text-muted-foreground",
          )}
        >
          Todas
        </button>
        {abas.map(aba => {
          const q = aba.quinzena;
          const total = aba.total;
          const active = selectedQuinzena === q;
          return (
            <button
              key={q}
              onClick={() => setQuinzena(q)}
              className={cn(
                "px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shrink-0 flex items-center gap-2",
                active
                  ? "bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/20"
                  : "bg-card border border-border text-muted-foreground",
              )}
            >
              {q}
              <span className={cn("text-[10px] font-mono opacity-80 font-bold", total === 0 && "opacity-30")}>
                {total > 0 ? fmtMoney(total).replace("R$", "").trim() : "—"}
              </span>
            </button>
          );
        })}
        
        {/* Botão para adicionar quinzena */}
        <Dialog>
          <DialogTrigger asChild>
            <button
              className="px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shrink-0 flex items-center gap-2 bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Quinzena
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-zinc-800 text-zinc-100">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold uppercase tracking-tight">Nova Quinzena</DialogTitle>
            </DialogHeader>
            <div className="grid gap-6 py-6">
              <div className="space-y-3">
                <Label htmlFor="nome-quinzena" className="text-xs font-bold uppercase text-zinc-400 tracking-wider">
                  Nome da Quinzena
                </Label>
                <Input 
                  id="nome-quinzena" 
                  placeholder="Ex: JUNHO 2026 - 1" 
                  className="bg-zinc-900 border-zinc-800 h-12 rounded-xl focus:ring-purple-500/20"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const input = e.currentTarget;
                      const val = input.value.trim();
                      if (val) {
                        addAba(val);
                        const closeBtn = e.currentTarget.closest('[role="dialog"]')?.querySelector('button[aria-label="Close"]');
                        if (closeBtn instanceof HTMLElement) closeBtn.click();
                      }
                    }
                  }}
                />
              </div>
              <Button 
                className="h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold uppercase text-xs tracking-widest rounded-xl transition-all shadow-lg shadow-purple-500/20"
                onClick={(e) => {
                  const input = document.getElementById("nome-quinzena") as HTMLInputElement;
                  const val = input?.value.trim();
                  if (val) {
                    addAba(val);
                    const closeBtn = input.closest('[role="dialog"]')?.querySelector('button[aria-label="Close"]');
                    if (closeBtn instanceof HTMLElement) closeBtn.click();
                  }
                }}
              >
                Confirmar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total a receber"
          value={fmtMoney(stats.totalReceber)}
          hint={`${stats.qtd} parcelas filtradas`}
          icon={Wallet}
          accent="bg-green-500/15 text-green-600"
        />
        <StatCard
          label="Total Pago"
          value={fmtMoney(stats.totalPago)}
          hint="Somente pedidos pagos"
          icon={Check}
          accent="bg-purple-500/15 text-purple-600"
        />
        <StatCard
          label="Maior comissão"
          value={fmtMoney(stats.maiorComissao)}
          hint="Parcela individual"
          icon={TrendingUp}
          accent="bg-pink-500/15 text-pink-600"
        />
        <StatCard
          label="Período selecionado"
          value={selectedQuinzena === "ALL" ? "TODOS" : selectedQuinzena}
          hint={selectedQuinzena === "ALL"
            ? fmtMoney(COMMISSIONS.reduce((s: number, c: Registro) => s + c.receber, 0)) + " total geral"
            : "Vencimento da quinzena"}
          icon={Calendar}
          accent="bg-blue-500/15 text-blue-600"
        />

      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-1">A receber por Cidade</h3>
          <p className="text-[11px] text-muted-foreground/60 mb-3">Top 5 cidades com maior valor</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perCidade} layout="vertical" margin={{ left: 30, right: 30, top: 10, bottom: 10 }}>
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  width={80}
                />
                <Tooltip
                  formatter={(v: number) => fmtMoney(v)}
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} fill="#3b82f6" barSize={20}>
                  <LabelList 
                    dataKey="value" 
                    position="right" 
                    formatter={(v: number) => fmtMoney(v).replace("R$", "").trim()}
                    style={{ fontSize: 9, fill: "var(--muted-foreground)", fontWeight: "bold" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-1">Ranking de Clientes</h3>
          <p className="text-[11px] text-muted-foreground/60 mb-3">Maiores comissões por cliente</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topClientes.slice(0, 5)} layout="vertical" margin={{ left: 30, right: 30, top: 10, bottom: 10 }}>
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  width={80}
                />
                <Tooltip
                  formatter={(v: number) => fmtMoney(v)}
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} fill="#a855f7" barSize={20}>
                  <LabelList 
                    dataKey="value" 
                    position="right" 
                    formatter={(v: number) => fmtMoney(v).replace("R$", "").trim()}
                    style={{ fontSize: 9, fill: "var(--muted-foreground)", fontWeight: "bold" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-3">Distribuição por %</h3>
          <div className="h-64">
            {perPct.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Sem dados</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={perPct} dataKey="value" nameKey="name" innerRadius={45} outerRadius={85} paddingAngle={3}>
                    {perPct.map((d, i) => <Cell key={i} fill={PCT_COLORS[d.pct] ?? CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmtMoney(v)} contentStyle={{ fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Main table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="p-4 md:p-5 border-b border-border bg-muted/30 space-y-4">
          <div className="flex flex-col gap-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente ou pedido…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-11 md:h-9 text-sm w-full"
              />
            </div>
            <PedidoModal 
              quinzena={selectedQuinzena !== "ALL" ? selectedQuinzena : abas[0]?.quinzena} 
              onSuccess={refetch} 
              sheetId={sheetId} 
              trigger={
                <Button className="w-full md:w-auto gap-2 bg-foreground text-background hover:bg-foreground/90 h-11 md:h-9 font-bold uppercase text-[11px] tracking-widest shadow-lg active:scale-[0.98] transition-transform">
                  <Plus className="h-5 w-5 md:h-4 md:w-4" /> Adicionar Pedido
                </Button>
              }
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <div className="grid grid-cols-2 md:flex md:flex-wrap items-center gap-2 w-full">
              <ComboboxFilter
                value={localFilter}
                onSelect={setLocalFilter}
                placeholder="Cidades"
                options={[
                  { label: "Todas cidades", value: "ALL" },
                  ...allLocals.map(l => ({ label: l, value: l }))
                ]}
              />
              <ComboboxFilter
                value={pctFilter}
                onSelect={setPctFilter}
                placeholder="%"
                options={[
                  { label: "Todas %", value: "ALL" },
                  ...allPercentages.map(p => ({ label: `${p}%`, value: String(p) }))
                ]}
              />
              <ComboboxFilter
                value={dateFilter}
                onSelect={setDateFilter}
                placeholder="Datas"
                options={[
                  { label: "Todas datas", value: "ALL" },
                  ...allDates.map(d => ({ label: d, value: d }))
                ]}
              />
              <ComboboxFilter
                value={vencFilter}
                onSelect={setVencFilter}
                placeholder="Vencimentos"
                options={[
                  { label: "Todos venc.", value: "ALL" },
                  ...allVencs.map(v => ({ label: v, value: v }))
                ]}
              />
              <ComboboxFilter
                value={pagoFilter}
                onSelect={setPagoFilter}
                placeholder="Todos pagamentos"
                options={[
                  { label: "Todos pagamentos", value: "ALL" },
                  { label: "SIM", value: "SIM" },
                  { label: "NÃO", value: "NÃO" },
                  { label: "OUTROS", value: "OUTROS" }
                ]}
              />
            </div>
            
            {(search || localFilter !== "ALL" || pctFilter !== "ALL" || dateFilter !== "ALL" || qtdParcFilter !== "ALL" || vencFilter !== "ALL" || pagoFilter !== "ALL") && (
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="h-8 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5 mr-1" /> Limpar Filtros
              </Button>
            )}
          </div>
        </div>
        <div className="md:overflow-x-auto">
          {/* Desktop Table View */}
          <table className="hidden md:table w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="px-3 py-2.5 w-10"></th>
                <th className="px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">Data</th>
                <th className="px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">Pedido</th>
                <th className="px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">Nome</th>
                <th className="px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">Local</th>
                <th className="px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground text-right">Total</th>
                <th className="px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground text-center">%</th>
                <th className="px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground text-right">Vl Parc</th>
                <th className="px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">Qtd Parc</th>
                <th className="px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground text-center">Venc</th>
                <th className="px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground text-center">Pago</th>
                <th className="px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wider text-green-600 font-bold text-right">Receber</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {paginatedData.map((c, i) => (
                <tr key={`${c.pedido}-${i}`} className="hover:bg-muted/30 transition-colors group">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <PedidoModal 
                        quinzena={c.quinzena} 
                        onSuccess={refetch} 
                        sheetId={sheetId} 
                        registro={c}
                        trigger={
                          <button className="text-muted-foreground hover:text-primary transition-colors">
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        }
                      />
                      <PedidoModal 
                        quinzena={c.quinzena} 
                        onSuccess={refetch} 
                        sheetId={sheetId} 
                        registro={c}
                        trigger={
                          <button className="text-muted-foreground hover:text-primary transition-colors">
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        }
                      />
                      <TransferModal 
                        registro={c} 
                        quinzenas={QUINZENAS} 
                        sheetId={sheetId} 
                        onSuccess={refetch} 
                      />
                    </div>
                  </td>
                  <td className="px-3 py-3 text-xs whitespace-nowrap">
                    <EditableCell 
                      value={c.data} 
                      onSave={(val) => handleUpdate(c.quinzena, c.rowIndex, COL_INDICES.DATA, val)}
                      isLoading={updatingId === `${c.quinzena}-${c.rowIndex}-${COL_INDICES.DATA}`}
                    />
                  </td>
                  <td className="px-3 py-3 text-xs font-mono text-muted-foreground">
                    <EditableCell 
                      value={c.pedido} 
                      onSave={(val) => handleUpdate(c.quinzena, c.rowIndex, COL_INDICES.PEDIDO, val)}
                      isLoading={updatingId === `${c.quinzena}-${c.rowIndex}-${COL_INDICES.PEDIDO}`}
                    />
                  </td>
                  <td className="px-3 py-3 text-xs font-bold uppercase truncate max-w-[200px]">
                    <EditableCell 
                      value={c.nome} 
                      onSave={(val) => handleUpdate(c.quinzena, c.rowIndex, COL_INDICES.NOME, val)}
                      isLoading={updatingId === `${c.quinzena}-${c.rowIndex}-${COL_INDICES.NOME}`}
                    />
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    <EditableCell 
                      value={c.local} 
                      onSave={(val) => handleUpdate(c.quinzena, c.rowIndex, COL_INDICES.LOCAL, val)}
                      isLoading={updatingId === `${c.quinzena}-${c.rowIndex}-${COL_INDICES.LOCAL}`}
                    />
                  </td>
                  <td className="px-3 py-3 text-xs text-right tabular-nums">
                    <EditableCell 
                      value={c.total} 
                      type="number"
                      onSave={(val) => handleUpdate(c.quinzena, c.rowIndex, COL_INDICES.TOTAL, val)}
                      isLoading={updatingId === `${c.quinzena}-${c.rowIndex}-${COL_INDICES.TOTAL}`}
                    />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded-full ring-1 ring-inset",
                      c.pct === 5 ? "bg-blue-500/10 text-blue-600 ring-blue-500/20" :
                      c.pct === 10 ? "bg-purple-500/10 text-purple-600 ring-purple-500/20" :
                      "bg-pink-500/10 text-pink-600 ring-pink-500/20"
                    )}>
                      {c.pct}%
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-right tabular-nums text-muted-foreground">
                    <EditableCell 
                      value={c.vlParc} 
                      type="number"
                      onSave={(val) => handleUpdate(c.quinzena, c.rowIndex, COL_INDICES.VL_PARC, val)}
                      isLoading={updatingId === `${c.quinzena}-${c.rowIndex}-${COL_INDICES.VL_PARC}`}
                    />
                  </td>
                  <td className="px-3 py-3"><ParcCell qtd={c.qtdParc} /></td>
                  <td className="px-3 py-3 text-center text-xs text-muted-foreground">
                    <EditableCell 
                      value={c.venc} 
                      onSave={(val) => handleUpdate(c.quinzena, c.rowIndex, COL_INDICES.VENC, val)}
                      isLoading={updatingId === `${c.quinzena}-${c.rowIndex}-${COL_INDICES.VENC}`}
                    />
                  </td>
                  <td className="px-3 py-3 text-center text-xs">
                    <span className={cn(
                      "font-bold px-1.5 py-0.5 rounded-full text-[10px]",
                      c.pago === "SIM" ? "bg-green-500/20 text-green-600" : "bg-red-500/20 text-red-600"
                    )}>
                      {c.pago}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums font-bold text-green-600">
                    <EditableCell 
                      value={c.receber} 
                      type="number"
                      onSave={(val) => handleUpdate(c.quinzena, c.rowIndex, COL_INDICES.RECEBER, val)}
                      isLoading={updatingId === `${c.quinzena}-${c.rowIndex}-${COL_INDICES.RECEBER}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-border/50">
            {paginatedData.map((c, i) => (
              <div key={`${c.pedido}-${i}`} className="p-4 space-y-3 active:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm text-foreground uppercase tracking-tight">{c.nome}</div>
                  <div className="flex items-center gap-1">
                    <PedidoModal 
                      quinzena={c.quinzena} 
                      onSuccess={refetch} 
                      sheetId={sheetId} 
                      registro={c}
                      trigger={
                        <button className="h-8 w-8 flex items-center justify-center rounded-full bg-muted text-muted-foreground active:bg-primary active:text-primary-foreground">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      }
                    />
                    <TransferModal 
                      registro={c} 
                      quinzenas={QUINZENAS} 
                      sheetId={sheetId} 
                      onSuccess={refetch} 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-y-2 text-[11px]">
                  <div><span className="text-muted-foreground uppercase mr-1">Data:</span> {c.data}</div>
                  <div><span className="text-muted-foreground uppercase mr-1">Pedido:</span> <span className="font-mono">{c.pedido}</span></div>
                  <div><span className="text-muted-foreground uppercase mr-1">Local:</span> {c.local}</div>
                  <div><span className="text-muted-foreground uppercase mr-1">Venc:</span> {c.venc}</div>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground uppercase mr-1">Pago:</span>
                    <span className={cn(
                      "font-bold px-1.5 py-0.5 rounded-full text-[9px]",
                      c.pago === "SIM" ? "bg-green-500/20 text-green-600" : "bg-red-500/20 text-red-600"
                    )}>
                      {c.pago}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] uppercase font-bold text-muted-foreground">Comissão:</span>
                      <span className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded-full ring-1 ring-inset",
                        c.pct === 5 ? "bg-blue-500/10 text-blue-600 ring-blue-500/20" :
                        c.pct === 10 ? "bg-purple-500/10 text-purple-600 ring-purple-500/20" :
                        "bg-pink-500/10 text-pink-600 ring-pink-500/20"
                      )}>
                        {c.pct}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] uppercase font-bold text-muted-foreground">Parcelas:</span>
                      <ParcCell qtd={c.qtdParc} />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] uppercase font-bold text-green-600/70">A Receber</div>
                    <div className="text-sm font-black text-green-600 tracking-tight">
                      {fmtMoney(c.receber)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-sm text-muted-foreground">Nenhum resultado encontrado.</p>
            </div>
          )}
        </div>
        
        {totalPages > 1 && (
          <div className="p-4 border-t border-border bg-muted/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest order-2 md:order-1">
              Página {currentPage} de {totalPages} ({filtered.length} itens)
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto order-1 md:order-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="flex-1 md:flex-none h-10 md:h-8 font-bold uppercase text-[10px] tracking-widest"
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="flex-1 md:flex-none h-10 md:h-8 font-bold uppercase text-[10px] tracking-widest"
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
