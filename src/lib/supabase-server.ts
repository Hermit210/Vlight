import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role client — server routes only, never imported from client
// components. The `server-only` import makes any accidental client bundle
// of this file a build error rather than a leaked key at runtime.
export function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase isn't configured — set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see .env.example)."
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
