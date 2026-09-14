'use client';

import { createBrowserClient } from '@supabase/ssr';

let browser = null;

// Null when env is missing -> the app falls back to the memory provider.
export function getBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!browser) browser = createBrowserClient(url, key);
  return browser;
}

export const USE_SUPABASE =
  typeof process !== 'undefined' &&
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
