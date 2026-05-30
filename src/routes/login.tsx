import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginComponent,
});

function LoginComponent() {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Mapping logic: melissa -> viniciusbataglia500@gmail.com
      const email = username.toLowerCase() === "melissa" 
        ? "viniciusbataglia500@gmail.com" 
        : username;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error("Usuário ou senha incorretos.");
        setIsLoading(false);
        return;
      }

      if (data.user) {
        toast.success("Bem-vinda, Melissa! ✨");
        setTimeout(() => {
          navigate({ to: "/resumo-geral" });
        }, 1500);
      }
    } catch (error) {
      toast.error("Ocorreu um erro ao tentar entrar.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4 relative overflow-hidden">
      {/* Background Texture/Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900/50 via-black to-black z-0" />
      <div className="absolute inset-0 opacity-[0.03] z-0 pointer-events-none" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />

      <Card className="w-full max-w-md bg-zinc-950/50 border-zinc-800/50 backdrop-blur-xl shadow-2xl relative z-10 animate-in fade-in zoom-in duration-500 rounded-2xl overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-zinc-500/20 to-transparent" />
        
        <CardHeader className="space-y-4 pt-12 pb-8 text-center">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-inner">
              <span className="text-2xl font-serif text-zinc-100 italic">M</span>
            </div>
          </div>
          <CardTitle className="text-3xl font-serif tracking-tight text-zinc-100">
            Controle de Comissões
          </CardTitle>
          <p className="text-zinc-500 text-sm font-medium tracking-wide uppercase">
            Acesso Restrito
          </p>
        </CardHeader>

        <CardContent className="px-8 pb-12">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2 group">
              <Label htmlFor="username" className="text-zinc-400 text-xs font-semibold uppercase tracking-wider ml-1">
                Usuário
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Seu usuário"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
                className="bg-zinc-900/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-700 focus:border-zinc-500 focus:ring-zinc-500/20 transition-all duration-300 h-12 rounded-xl"
              />
            </div>
            
            <div className="space-y-2 group">
              <Label htmlFor="password" className="text-zinc-400 text-xs font-semibold uppercase tracking-wider ml-1">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="bg-zinc-900/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-700 focus:border-zinc-500 focus:ring-zinc-500/20 transition-all duration-300 h-12 rounded-xl"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-sm uppercase tracking-widest rounded-xl transition-all duration-300 transform active:scale-[0.98] shadow-[0_0_20px_rgba(255,255,255,0.05)]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Decorative elements */}
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-zinc-900/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-zinc-800/10 rounded-full blur-[120px] pointer-events-none" />
    </div>
  );
}
