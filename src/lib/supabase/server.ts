import { createClient } from '@supabase/supabase-js'

export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Always use anon key — all tables have open RLS policies (USING true)
  // Service role key is not available; anon key works for all operations
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(`Missing Supabase environment variables. URL: ${!!supabaseUrl}, Key: ${!!supabaseKey}`);
  }

  return createClient(supabaseUrl, supabaseKey);
}
