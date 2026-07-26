import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getPreferences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_preferences").select("*").eq("user_id", context.userId).maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? {
      silence_threshold_db: -40,
      min_silence_ms: 800,
      default_export_format: "premiere",
      email_notifications: false,
    };
  });

const PrefsUpdate = z.object({
  silence_threshold_db: z.number().min(-80).max(0),
  min_silence_ms: z.number().min(200).max(10000),
  default_export_format: z.enum(["premiere", "audacity", "csv"]),
  email_notifications: z.boolean(),
});

export const updatePreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => PrefsUpdate.parse(v))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("user_preferences")
      .upsert({ user_id: context.userId, ...data });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Delete owned data; auth user deletion needs admin key
    const { error } = await context.supabase.from("episodes").delete().eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
