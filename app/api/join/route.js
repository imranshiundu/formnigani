import { NextResponse } from 'next/server';
import { findForm, publish } from '@/lib/server-store';

export async function POST(req) {
  const { id, action } = await req.json().catch(() => ({}));
  const f = findForm(id);
  if (!f) return NextResponse.json({ error: 'not found' }, { status: 404 });
  f.going = Math.max(0, f.going + (action === 'leave' ? -1 : 1));
  publish({ type: 'join', id, going: f.going, delta: action === 'leave' ? -1 : 1 });
  return NextResponse.json({ id, going: f.going });
}
