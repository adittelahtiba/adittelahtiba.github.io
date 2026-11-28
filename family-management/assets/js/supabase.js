// Inisialisasi Supabase client (supabase-js v2, ES module via CDN).
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, isSupabaseConfigured } from './config.js';

// null jika konfigurasi belum diisi; semua pemanggil wajib menangani kasus ini.
export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
