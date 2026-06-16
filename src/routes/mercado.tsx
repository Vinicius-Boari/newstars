import { createFileRoute, redirect } from "@tanstack/react-router";
import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Store, Plus, Search, Edit2, Trash2, Calendar as CalendarIcon, ArrowUpDown, Loader2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/mercado")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/login" });
  },
  component: MercadoPage,
});

type Mercado = {
  id: string;
  data: string;
  supermercado: string;
  responsavel: string;
  telefone: string;
  observacao: string;
  created_at: string;
  updated_at: string;
};

type FormState = {
  data: string;
  supermercado: string;
  responsavel: string;
  telefone: string;
  observacao: string;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

function emptyForm(): FormState {
  return { data: todayISO(), supermercado: "", responsavel: "", telefone: "", observacao: "" };
}

function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function fmtDateBR(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function MercadoPage() {
  const qc = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [sortDesc, setSortDesc] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Mercado | null>(null);
  const [form, setForm] = React.useState<FormState>(emptyForm());
  const [confirmDelete, setConfirmDelete] = React.useState<Mercado | null>(null);

  const { data: mercados = [], isLoading } = useQuery({
    queryKey: ["mercados"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mercados")
        .select("*")
        .order("data", { ascending: false });
      if (error) throw error;
      return data as Mercado[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: { id?: string; values: FormState }) => {
      if (payload.id) {
        const { error } = await supabase.from("mercados").update(payload.values).eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("mercados").insert(payload.values);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mercados"] });
      toast.success(editing ? "Mercado atualizado!" : "Mercado cadastrado!");
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm());
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mercados").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mercados"] });
      toast.success("Mercado excluído.");
      setConfirmDelete(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = mercados.filter((m) => {
      const matchQ = !q ||
        m.supermercado.toLowerCase().includes(q) ||
        m.responsavel.toLowerCase().includes(q);
      const matchFrom = !dateFrom || m.data >= dateFrom;
      const matchTo = !dateTo || m.data <= dateTo;
      return matchQ && matchFrom && matchTo;
    });
    list = [...list].sort((a, b) =>
      sortDesc ? b.data.localeCompare(a.data) : a.data.localeCompare(b.data)
    );
    return list;
  }, [mercados, search, dateFrom, dateTo, sortDesc]);

  const stats = React.useMemo(() => {
    const total = mercados.length;
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const mes = mercados.filter((m) => m.data.startsWith(ym)).length;
    const ultima = mercados.reduce<string | null>((acc, m) => {
      if (!acc || m.data > acc) return m.data;
      return acc;
    }, null);
    return { total, mes, ultima };
  }, [mercados]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (m: Mercado) => {
    setEditing(m);
    setForm({
      data: m.data,
      supermercado: m.supermercado,
      responsavel: m.responsavel,
      telefone: m.telefone,
      observacao: m.observacao,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.data || !form.supermercado.trim() || !form.responsavel.trim() || !form.telefone.trim()) {
      toast.error("Preencha os campos obrigatórios.");
      return;
    }
    saveMutation.mutate({
      id: editing?.id,
      values: {
        ...form,
        supermercado: form.supermercado.trim(),
        responsavel: form.responsavel.trim(),
        telefone: form.telefone.trim(),
      },
    });
  };

  return (
    <div className="space-y-4 lg:space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold flex items-center gap-2">
            <Store className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
            Mercado
          </h1>
          <p className="text-xs lg:text-sm text-muted-foreground mt-0.5">
            Supermercados parceiros e prospecções.
          </p>
        </div>
        <Button onClick={openNew} className="w-full sm:w-auto">
          <Plus className="h-4 w-4" /> Novo Mercado
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Total de mercados" value={stats.total.toString()} />
        <StatCard label="Cadastros este mês" value={stats.mes.toString()} />
        <StatCard label="Última visita" value={stats.ultima ? fmtDateBR(stats.ultima) : "—"} />
      </div>

      {/* Filtros */}
      <div className="rounded-xl border border-border bg-card p-3 lg:p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por supermercado ou responsável..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <Label className="text-[11px] text-muted-foreground">De</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Até</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div className="flex items-end gap-2">
            <Button
              variant="outline"
              onClick={() => setSortDesc((s) => !s)}
              className="flex-1"
            >
              <ArrowUpDown className="h-4 w-4" />
              {sortDesc ? "Mais recente" : "Mais antiga"}
            </Button>
            {(search || dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Lista — mobile cards + desktop table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
          <Store className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            {mercados.length === 0 ? "Nenhum mercado cadastrado." : "Nenhum resultado para o filtro atual."}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-2 lg:hidden">
            {filtered.map((m) => (
              <MercadoCard key={m.id} m={m} onEdit={() => openEdit(m)} onDelete={() => setConfirmDelete(m)} />
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden lg:block rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Data</th>
                  <th className="text-left px-4 py-3 font-semibold">Supermercado</th>
                  <th className="text-left px-4 py-3 font-semibold">Responsável</th>
                  <th className="text-left px-4 py-3 font-semibold">Telefone</th>
                  <th className="text-left px-4 py-3 font-semibold">Observação</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3 tabular-nums whitespace-nowrap">{fmtDateBR(m.data)}</td>
                    <td className="px-4 py-3 font-medium">{m.supermercado}</td>
                    <td className="px-4 py-3">{m.responsavel}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{m.telefone}</td>
                    <td className="px-4 py-3 text-muted-foreground max-w-md">
                      <div className="line-clamp-2 whitespace-pre-wrap">{m.observacao || "—"}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(m)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setConfirmDelete(m)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Dialog cadastro/edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Mercado" : "Novo Mercado"}</DialogTitle>
            <DialogDescription>
              Preencha os dados do supermercado parceiro.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="m-data">Data *</Label>
                <Input
                  id="m-data"
                  type="date"
                  value={form.data}
                  onChange={(e) => setForm({ ...form, data: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="m-tel">Telefone *</Label>
                <Input
                  id="m-tel"
                  inputMode="tel"
                  placeholder="(11) 91234-5678"
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: maskPhone(e.target.value) })}
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="m-sup">Nome do Supermercado *</Label>
              <Input
                id="m-sup"
                value={form.supermercado}
                onChange={(e) => setForm({ ...form, supermercado: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="m-resp">Nome do Responsável *</Label>
              <Input
                id="m-resp"
                value={form.responsavel}
                onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="m-obs">Observação</Label>
              <Textarea
                id="m-obs"
                value={form.observacao}
                onChange={(e) => setForm({ ...form, observacao: e.target.value })}
                rows={5}
                className="min-h-[120px] resize-y"
                placeholder="Anote detalhes da visita, próximos passos, contatos..."
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "Salvar alterações" : "Cadastrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir mercado?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente. {confirmDelete?.supermercado} será removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
        {label}
      </div>
      <div className="text-2xl font-bold mt-1 tabular-nums">{value}</div>
    </div>
  );
}

function MercadoCard({
  m, onEdit, onDelete,
}: { m: Mercado; onEdit: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = React.useState(false);
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-semibold truncate">{m.supermercado}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <CalendarIcon className="h-3 w-3" />
            {fmtDateBR(m.data)}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <div>
          <div className="text-[10px] uppercase text-muted-foreground">Responsável</div>
          <div className="truncate">{m.responsavel}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-muted-foreground">Telefone</div>
          <a href={`tel:${m.telefone.replace(/\D/g, "")}`} className="text-primary truncate block">
            {m.telefone}
          </a>
        </div>
      </div>
      {m.observacao && (
        <div className="mt-2 pt-2 border-t border-border">
          <div className="text-[10px] uppercase text-muted-foreground mb-1">Observação</div>
          <div
            className={cn("text-xs whitespace-pre-wrap", !expanded && "line-clamp-3")}
          >
            {m.observacao}
          </div>
          {m.observacao.length > 120 && (
            <button
              onClick={() => setExpanded((s) => !s)}
              className="text-[11px] text-primary mt-1 cursor-pointer"
            >
              {expanded ? "Ver menos" : "Ver mais"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}