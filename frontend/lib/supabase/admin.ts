import { createClient } from "@supabase/supabase-js"

// Bypasses RLS — only use server-side for trusted operations (e.g. invitation lookup by token)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
