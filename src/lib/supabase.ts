import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

/** .env 에 Supabase 값이 채워져 있는지 */
export const hasSupabase = Boolean(url && anonKey);

/** Supabase 클라이언트. 미설정이면 null (앱은 로컬 모드로 동작) */
export const supabase: SupabaseClient | null = hasSupabase
  ? createClient(url!, anonKey!, {
      realtime: { params: { eventsPerSecond: 20 } },
      auth: { persistSession: false },
    })
  : null;
