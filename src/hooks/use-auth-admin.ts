import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const ensureMelissaExists = createServerFn({ method: 'POST' })
  .handler(async () => {
    const email = "melissa@lovable.local";
    // Nova senha definida pelo usuário (mínimo de 6 caracteres exigido pelo Supabase)
    const password = "001811";

    console.log("Checking if melissa exists...");
    const { data: users, error: fetchError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (fetchError) {
      console.error("Error listing users:", fetchError);
      throw fetchError;
    }

    const existingUser = users.users.find(u => u.email === email);
    
    if (existingUser) {
      console.log("User melissa exists. Updating password...");
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        { password: password }
      );
      if (updateError) throw updateError;
      return { status: "updated" };
    } else {
      console.log("User melissa does not exist. Creating...");
      const { error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: "Melissa" }
      });
      if (createError) throw createError;
      return { status: "created" };
    }
  });
