// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Клиент для браузера (фронтенд) — используем только публичный anon-ключ
// Этот клиент безопасно использовать в компонентах и страницах
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Админ-клиент — только для серверных API-роутов (server actions, route handlers)
// НЕ ИСПОЛЬЗУЙ ЕГО в клиентском коде (компонентах, useEffect и т.д.)
export const createSupabaseAdmin = () => {
  // Защита от случайного вызова на клиенте
  if (typeof window !== 'undefined') {
    console.error("createSupabaseAdmin нельзя вызывать на клиенте!");
    return null;
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
};