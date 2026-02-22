// ============================================================
// Axon — Supabase Client (frontend singleton)
// ============================================================
//
// Uses Symbol.for singleton pattern to prevent
// "Multiple GoTrueClient instances" warning during HMR.
// ============================================================
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabaseUrl, supabaseAnonKey } from './config';

const SUPA_KEY = Symbol.for('axon-supabase-singleton');

function getOrCreateClient(): SupabaseClient {
  const g = globalThis as Record<symbol, unknown>;
  if (!g[SUPA_KEY]) {
    if (import.meta.env.DEV) console.log('[Supabase] Creating singleton client for:', supabaseUrl);
    g[SUPA_KEY] = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }
  return g[SUPA_KEY] as SupabaseClient;
}

export const supabase = getOrCreateClient();