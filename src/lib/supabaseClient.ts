import { createClient } from '@supabase/supabase-js';

// Use Vite env variables. Ensure your real values are only in local env files.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  // Non-fatal guard for dev; avoids committing keys in source.
  // Consumers can check for undefined client by verifying envs are set.
  console.warn('[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Configure .env.local');
}

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : undefined as unknown as ReturnType<typeof createClient>;
