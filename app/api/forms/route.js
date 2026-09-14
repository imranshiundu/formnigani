import { NextResponse } from 'next/server';
import { addForm, getForms, getMeta, publish } from '@/lib/server-store';

export async function GET() {
  const res = NextResponse.json({ forms: getForms(), ...getMeta() });
  res.headers.set('Cache-Control', 'no-store');
  return res;
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  if (!body.title || body.title.trim().length < 3) {
    return NextResponse.json({ error: 'Describe your plan first' }, { status: 400 });
  }
  const form = addForm({
    title: body.title.trim().slice(0, 80),
    area: (body.area || 'Nairobi CBD').slice(0, 60),
    desc: (body.desc || '').slice(0, 280),
    img: body.img,
  });
  publish({ type: 'create', form });
  return NextResponse.json({ form }, { status: 201 });
}
