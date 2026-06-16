import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
});

export const signInWithUsername = createServerFn({ method: "POST" })
  .inputValidator((input) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createClient } = await import("@supabase/supabase-js");

    let email = data.username.trim();
    if (!email.includes("@")) {
      const { data: row } = await supabaseAdmin
        .from("admin_users")
        .select("id")
        .ilike("username", email)
        .maybeSingle();
      if (!row?.id) {
        return { error: "Usuário ou senha incorretos." as string, session: null };
      }
      const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(row.id);
      const resolved = userRes?.user?.email;
      if (!resolved) {
        return { error: "Usuário ou senha incorretos." as string, session: null };
      }
      email = resolved;
    }

    const url = process.env.SUPABASE_URL!;
    const anon = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const client = createClient(url, anon, { auth: { persistSession: false } });
    const { data: signIn, error } = await client.auth.signInWithPassword({
      email,
      password: data.password,
    });
    if (error || !signIn.session) {
      return { error: "Usuário ou senha incorretos." as string, session: null };
    }
    return {
      error: null as string | null,
      session: {
        access_token: signIn.session.access_token,
        refresh_token: signIn.session.refresh_token,
      },
    };
  });

const createUserSchema = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(6).max(200),
  role: z.string().min(1).max(50),
});

export const createAdminUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => createUserSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin", {
      _user_id: context.userId,
    });
    if (!isAdmin) return { error: "Acesso negado." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const username = data.username.trim();
    const email = `${username.toLowerCase().replace(/[^a-z0-9]/g, "")}@app.local`;

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { username },
    });
    if (createErr || !created.user) {
      return { error: createErr?.message ?? "Falha ao criar usuário." };
    }

    const { error: insErr } = await supabaseAdmin.from("admin_users").insert({
      id: created.user.id,
      username,
      role: data.role,
    });
    if (insErr) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      return { error: insErr.message };
    }
    return { error: null };
  });