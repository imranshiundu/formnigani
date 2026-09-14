import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || '/';
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (code && base && key) {
    const store = cookies();
    const sb = createServerClient(base, key, {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (all) => all.forEach(({ name, value, options }) => {
          try {
            store.set(name, value, options);
          } catch {}
        }),
      },
    });
    await sb.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
