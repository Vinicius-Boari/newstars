import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const MELISSA_EMAIL = "melissa@lovable.local";
const MELISSA_PASSWORD = "001811";

/**
 * Hook robusto para garantir a existência do usuário Melissa.
 * Chamado no login para resetar/garantir as credenciais.
 */
export const syncMelissaAuth = createServerFn({ method: 'POST' })
  .handler(async () => {
    console.log("[AuthSync] Iniciando sincronização do usuário melissa...");
    
    try {
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) throw listError;

      const melissa = users.find(u => u.email === MELISSA_EMAIL);

      if (melissa) {
        console.log("[AuthSync] Usuário encontrado. Resetando senha para garantir acesso.");
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          melissa.id,
          { password: MELISSA_PASSWORD, email_confirm: true }
        );
        if (updateError) throw updateError;
        return { success: true, action: "updated" };
      } else {
        console.log("[AuthSync] Usuário não encontrado. Criando novo perfil.");
        const { error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: MELISSA_EMAIL,
          password: MELISSA_PASSWORD,
          email_confirm: true,
          user_metadata: { full_name: "Melissa" }
        });
        if (createError) throw createError;
        return { success: true, action: "created" };
      }
    } catch (err) {
      console.error("[AuthSync] Falha crítica na sincronização:", err);
      throw err;
    }
  });
