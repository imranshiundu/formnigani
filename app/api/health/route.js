import { NextResponse } from 'next/server';
import { USE_SUPABASE } from '@/lib/db/client';

// Liveness probe for the data layer. Used by deploy checks and the app's
// offline indicator to distinguish "no network" from "no backend".
export async function GET() {
  if (!USE_SUPABASE) return NextResponse.json({ ok: true, provider: 'memory' });
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const t0 = Date.now();
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { count, error } = await sb.from('forms').select('*', { count: 'exact', head: true });
    if (error) throw error;
    return NextResponse.json({ ok: true, provider: 'supabase', latencyMs: Date.now() - t0, forms: count });
  } catch (e) {
    return NextResponse.json({ ok: false, provider: 'supabase', error: String(e.message || e) }, { status: 503 });
  }
}
