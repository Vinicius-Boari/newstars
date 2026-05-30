import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getSheets = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from('sheets')
      .select('name')
      .order('created_at', { ascending: true });

    if (error) throw error;
    
    // Default sheets if none exist for user
    if (!data || data.length === 0) {
      const defaults = ["ABRIL", "PEDIDOS DE MAIO"];
      // Use upsert to avoid duplicate errors if defaults already exist partially
      const { data: inserted, error: insertError } = await context.supabase
        .from('sheets')
        .upsert(defaults.map(name => ({ user_id: context.userId, name })), { onConflict: 'user_id, name' })
        .select('name');
      
      if (insertError) {
        console.error('Error inserting defaults:', insertError);
        return defaults;
      }
      return inserted.map(s => s.name);
    }

    return data.map(s => s.name);
  });

export const addSheet = createServerFn({ method: 'POST' })
  .validator((name: string) => name)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data: name, context }) => {
    const { error } = await context.supabase
      .from('sheets')
      .insert({ user_id: context.userId, name });

    if (error) throw error;
    return { success: true };
  });

export const removeSheet = createServerFn({ method: 'POST' })
  .validator((name: string) => name)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data: name, context }) => {
    const { error } = await context.supabase
      .from('sheets')
      .delete()
      .match({ user_id: context.userId, name });

    if (error) throw error;
    return { success: true };
  });
