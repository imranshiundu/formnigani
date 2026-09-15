import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

// Refreshes the Supabase session cookie. Inert when env is missing.
export async function middleware(req) {
  // Landing on the apex: formnigani.co.ke serves the marketing page,
  // the app lives on app.formnigani.co.ke (and any other host).
  const host = (req.headers.get('host') || '').toLowerCase();
  if ((host === 'formnigani.co.ke' || host === 'www.formnigani.co.ke') && req.nextUrl.pathname === '/') {
    return NextResponse.rewrite(new URL('/landing.html', req.url));
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next();
  const res = NextResponse.next();
  const sb = createServerClient(url, key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (all) => all.forEach(({ name, value, options }) => res.cookies.set(name, value, options)),
    },
  });
  await sb.auth.getUser();
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|sw.js|manifest.webmanifest|data).*)'],
};
