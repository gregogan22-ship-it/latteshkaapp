import { createClient } from '@supabase/supabase-js';

export function getSupabaseAdmin() {
  if (typeof window !== 'undefined') {
    // На клиенте — возвращаем null (для безопасности)
    return null;
  }

  // На сервере — создаём admin-клиент с service_role key
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase env vars');
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}