import { createClient } from "@supabase/supabase-js";

function getRequiredEnv(names: string[]) {
  const value = names.map((name) => process.env[name]).find(Boolean);
  if (!value) throw new Error(`${names.join(" or ")} is not configured`);
  return value;
}

export function getSupabaseServerClient() {
  return createClient(
    getRequiredEnv(["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"]),
    getRequiredEnv(["SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"]),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
