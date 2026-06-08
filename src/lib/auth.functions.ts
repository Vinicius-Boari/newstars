import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  username: z.string().min(1).max(100),
});

export const resolveUsernameEmail = createServerFn({ method: "POST" })
  .inputValidator((input) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("admin_users")
      .select("id")
      .ilike("username", data.username)
      .maybeSingle();
    if (!row?.id) return { email: null as string | null };
    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(row.id);
    return { email: userRes?.user?.email ?? null };
  });