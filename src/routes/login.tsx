import { createFileRoute, redirect } from "@tanstack/react-router";
import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { LayoutDashboard, Lock, Loader2 } from "lucide-react";
import { syncMelissaAuth } from "@/hooks/use-auth-sync";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/" });
  },
  component: LoginPage,
});

function LoginPage() {
  const [loading, setLoading] = React.useState(false);
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser || !password) {
      toast.error("Por favor, preencha todos os campos.");
      return;
    }

    setLoading(true);
    
    try {
      // 1. Sincronização forçada no servidor (Garante que a conta existe e a senha está correta)
      if (cleanUser === "melissa") {
        await syncMelissaAuth();
      }

      const email = cleanUser === "melissa" ? "melissa@lovable.local" : cleanUser;

      // 2. Autenticação direta
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Erro Auth:", error.message);
        toast.error("Credenciais inválidas. Verifique o usuário e a senha.");
        setLoading(false);
      } else if (data.session) {
        toast.success("Autenticado com sucesso!");
        // Redirecionamento limpo para a aba principal
        window.location.replace("/?quinzena=JUNHO");
      }
    } catch (err) {
      console.error("Erro Crítico Login:", err);
      toast.error("Falha na comunicação com o servidor. Tente novamente.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex p-4 rounded-3xl bg-primary/10 mb-6 border border-primary/20">
            <LayoutDashboard className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-white uppercase">NewStar</h1>
          <p className="text-slate-400 mt-2 font-medium">Controle de Comissões • Área Restrita</p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Usuário</label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-14 bg-slate-800/50 border-white/5 focus:border-primary/50 transition-all text-white rounded-2xl"
                placeholder="melissa"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Senha</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-14 bg-slate-800/50 border-white/5 focus:border-primary/50 transition-all text-white rounded-2xl"
                placeholder="••••••"
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-bold text-lg rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98]" 
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Sincronizando...</span>
                </div>
              ) : "Acessar Sistema"}
            </Button>
          </form>
        </div>

        <div className="text-center mt-10 space-y-4">
          <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-tighter">
            <Lock className="h-3.5 w-3.5" />
            Criptografia de ponta a ponta por DevBoari
          </div>
        </div>
      </div>
    </div>
  );
}
