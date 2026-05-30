import { createFileRoute, redirect } from "@tanstack/react-router";
import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { LayoutDashboard, Lock } from "lucide-react";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      throw redirect({ to: "/" });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // The single user is stored with email melissa@lovable.local
      const email = username === "melissa" ? "melissa@lovable.local" : username;
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error("Usuário ou senha inválidos");
      } else {
        toast.success("Login realizado com sucesso!");
        window.location.href = "/";
      }
    } catch (error) {
      toast.error("Ocorreu um erro ao tentar fazer login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="inline-flex p-3 rounded-2xl bg-primary/10 mb-4">
            <LayoutDashboard className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground uppercase">NewStar</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Área Restrita - Controle de Comissões
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
          <form onSubmit={handleLogin} className="space-y-6" autoComplete="off">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Usuário</label>
              <Input
                type="text"
                placeholder="melissa"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-11"
                required
                autoComplete="one-time-code"
                name="username-field"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Senha</label>
              <Input
                type="password"
                placeholder="••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11"
                required
                autoComplete="one-time-code"
                name="password-field"
              />
            </div>
            <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </div>

        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/40">
            <Lock className="h-3 w-3" />
            Acesso protegido por DevBoari
          </div>
          <div className="text-[10px] text-muted-foreground/30">
            Sistema criado por <a href="https://devboari.com.br" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">devboari.com.br</a>
          </div>
        </div>
      </div>
    </div>
  );
}
