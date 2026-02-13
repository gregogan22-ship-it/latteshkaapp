// lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jsuehzanetagvcmglyld.supabase.co'; // ← вставь Project URL
const supabaseAnonKey = 'sb_publishable_TnLDJanxUlTjm7Gez58fjQ_uMaf3t6l'; // ← вставь anon public

export const supabase = createClient(supabaseUrl, supabaseAnonKey);