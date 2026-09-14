import { NextResponse } from 'next/server';
import { findForm, publish } from '@/lib/server-store';

export async function POST(req) {
  const { id, action } = await req.json().catch(() => ({}));
  const f = findForm(id);
  if (!f) return NextResponse.json({ error: 'not found' }, { status: 404 });
  f.hype = Math.max(0, f.hype + (action === 'remove' ? -1 : 1));
  publish({ type: 'hype', id, hype: f.hype });
  return NextResponse.json({ id, hype: f.hype });
}
