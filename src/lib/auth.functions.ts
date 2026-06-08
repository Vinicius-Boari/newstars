import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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