import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
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
    console.log("Attempting login for user:", username);
    setLoading(true);

    try {
      // The single user is stored with email melissa@lovable.local
      const email = username.toLowerCase() === "melissa" ? "melissa@lovable.local" : username;
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Login error:", error);
        toast.error("Usuário ou senha inválidos: " + error.message);
      } else if (data.user) {
        console.log("Login successful, user:", data.user.id);
        toast.success("Acesso autorizado! Redirecionando...");
        
        // Short delay to ensure toast is visible before redirect
        setTimeout(() => {
          window.location.href = "/";
        }, 1000);
      }
    } catch (error) {
      console.error("Unexpected error during login:", error);
      toast.error("Ocorreu um erro inesperado ao tentar fazer login");
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
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Usuário</label>
              <Input
                type="text"
                placeholder=""
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-11"
                required
                autoComplete="username"

                name="username-field"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Senha</label>
              <Input
                type="password"
                placeholder=""
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11"
                required
                autoComplete="current-password"
                name="password-field"
              />
            </div>
            <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </div>

        <div className="text-center space-y-2 pt-4">
          <div className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground/60">
            <Lock className="h-4 w-4 text-primary/60" />
            Acesso protegido por DevBoari
          </div>
          <div className="text-xs font-medium text-muted-foreground/50">
            Sistema criado por <a href="https://devboari.com.br" target="_blank" rel="noopener noreferrer" className="text-primary/70 hover:text-primary transition-colors decoration-primary/30 underline underline-offset-4">devboari.com.br</a>
          </div>
        </div>
      </div>
    </div>
  );
}
