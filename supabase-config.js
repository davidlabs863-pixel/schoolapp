import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

export const SUPABASE_URL = 'https://qyiwrknxmjstowfdbkyb.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_0lKcXxMplJbSbmZ68zM36g_ZOwESCge';
const normalizedSupabaseUrl = SUPABASE_URL.trim().replace(/\.$/, '');

export const supabase =
  normalizedSupabaseUrl.includes('YOUR_PROJECT_REF') || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes('YOUR_')
    ? null
    : createClient(normalizedSupabaseUrl, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
