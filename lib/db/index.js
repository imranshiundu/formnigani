'use client';

// Single provider: Supabase. No fallbacks, no hardcoded content — the app
// requires the backend. When we move to our own servers, this file points
// at our API instead (same interface).
import { USE_SUPABASE } from './client';
import { supabaseDb } from './supabase';

if (typeof window !== 'undefined' && !USE_SUPABASE) {
  console.error('[fng] backend not configured: set NEXT_PUBLIC_SUPABASE_URL + ANON_KEY');
}

export const db = supabaseDb;
export const isConfigured = () => USE_SUPABASE;
export { USE_SUPABASE };
